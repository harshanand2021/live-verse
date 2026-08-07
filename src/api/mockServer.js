import seedData from '../../mockData.json';

// A tiny in-memory API. Its data is seeded from mockData.json and every response
// follows Axios's adapter contract, so components use the same calls as a real API.
const database = structuredClone(seedData);
const ENDED_ROOM_RETENTION_MS = 10 * 60 * 1000;
const AVATAR_COLORS = ['#FF5A3C', '#7C6BFF', '#4ADE80', '#FFD166', '#06D6A0', '#EF476F'];
const wait = () => new Promise((resolve) => setTimeout(resolve, 250));
const clone = (value) => structuredClone(value);
const parseBody = (data) => (typeof data === 'string' ? JSON.parse(data || '{}') : data || {});
const response = (config, status, data) => ({ data: clone(data), status, statusText: status < 400 ? 'OK' : 'Error', headers: {}, config, request: {} });

// Issued tokens are kept in localStorage so a page reload behaves like it would against a
// real backend: the session outlives the refresh, and only a logout or refresh revokes it.
// Tokens for accounts that no longer exist (anyone registered before a reload reseeded the
// database) are dropped on load, which logs that tester out cleanly.
const SESSIONS_KEY = 'mockApiSessions';
const OPEN_ROUTES = ['/api/auth/login', '/api/auth/register', '/api/auth/logout', '/api/auth/refresh'];

const sessions = loadSessions();

function loadSessions() {
  try {
    const stored = Object.entries(JSON.parse(localStorage.getItem(SESSIONS_KEY) || '{}'));
    return new Map(stored.filter(([, userId]) => database.users.some((user) => user.id === userId)));
  } catch {
    return new Map();
  }
}

function persistSessions() {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(Object.fromEntries(sessions)));
}

// Never echo the stored password back to the client, even in a dummy API.
const publicUser = (user) => (user ? { id: user.id, name: user.name, handle: user.handle, email: user.email, avatarColor: user.avatarColor } : null);
const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const findByEmail = (email) => database.users.find((user) => normalizeEmail(user.email) === email);

function issueToken(userId) {
  const token = `mock.${userId}.${Math.random().toString(36).slice(2)}`;
  sessions.set(token, userId);
  persistSessions();
  return token;
}

function readToken(config) {
  const header = config.headers?.Authorization || config.headers?.authorization || '';
  return String(header).startsWith('Bearer ') ? String(header).slice(7) : '';
}

function sessionUser(config) {
  const userId = sessions.get(readToken(config));
  return userId ? database.users.find((user) => user.id === userId) : undefined;
}

function uniqueHandle(name) {
  const base = `@${name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'member'}`;
  let handle = base;
  let suffix = 1;
  while (database.users.some((user) => user.handle === handle)) handle = `${base}${(suffix += 1)}`;
  return handle;
}

function error(config, status, message) {
  return Promise.reject({ response: response(config, status, { message }), message, config });
}

function roomById(id) {
  removeExpiredRooms();
  return database.rooms.find((room) => room.id === id);
}

function removeExpiredRooms() {
  const now = Date.now();
  database.rooms = database.rooms.filter((room) =>
    room.status !== 'ended' || !room.endedAt || now - new Date(room.endedAt).getTime() < ENDED_ROOM_RETENTION_MS,
  );
}

function scheduleRoomRemoval(room) {
  const delay = Math.max(0, ENDED_ROOM_RETENTION_MS - (Date.now() - new Date(room.endedAt).getTime()));
  window.setTimeout(removeExpiredRooms, delay);
}

export default async function mockServer(config) {
  await wait();
  const method = config.method.toLowerCase();
  const path = config.url.replace(/^https?:\/\/[^/]+/, '').replace(/^\/?/, '/').replace(/\?.*$/, '');
  const body = parseBody(config.data);

  if (method === 'post' && path === '/api/auth/login') {
    const account = findByEmail(normalizeEmail(body.email));
    if (!account || account.password !== body.password) return error(config, 401, 'That email and password do not match any account.');
    return response(config, 200, { user: publicUser(account), accessToken: issueToken(account.id) });
  }
  if (method === 'post' && path === '/api/auth/register') {
    const name = String(body.name || '').trim();
    const email = normalizeEmail(body.email);
    const password = String(body.password || '');
    if (!name || !email || !password) return error(config, 400, 'Name, email, and password are all required.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return error(config, 400, 'Enter a valid email address.');
    if (password.length < 8) return error(config, 400, 'Your password needs to be at least 8 characters.');
    if (findByEmail(email)) return error(config, 409, 'An account with that email already exists. Try signing in instead.');
    const account = { id: `u-${Date.now().toString(36)}`, name, handle: uniqueHandle(name), email, password, avatarColor: AVATAR_COLORS[database.users.length % AVATAR_COLORS.length] };
    database.users.push(account);
    return response(config, 201, { user: publicUser(account), accessToken: issueToken(account.id) });
  }
  if (method === 'post' && path === '/api/auth/logout') {
    sessions.delete(readToken(config));
    persistSessions();
    return response(config, 204, null);
  }
  if (method === 'post' && path === '/api/auth/refresh') {
    const token = readToken(config);
    const userId = sessions.get(token);
    if (!userId) return error(config, 401, 'Your session has expired. Please sign in again.');
    sessions.delete(token);
    return response(config, 200, { accessToken: issueToken(userId) });
  }

  // Everything past this point needs a signed-in user.
  const user = sessionUser(config);
  if (!user && !OPEN_ROUTES.includes(path)) return error(config, 401, 'Your session has expired. Please sign in again.');

  if (method === 'get' && path === '/api/users/me') return response(config, 200, publicUser(user));
  if (method === 'get' && path === '/api/users') return response(config, 200, database.users.map(publicUser));
  if (method === 'get' && path === '/api/users/search') {
    const keyword = (config.params?.q || '').toLowerCase();
    return response(config, 200, database.users.filter((item) => item.name.toLowerCase().includes(keyword) || item.handle.toLowerCase().includes(keyword)).map(publicUser));
  }
  if (method === 'put' && path === '/api/users/profile') {
    // Only profile fields are writable: a client must not be able to reassign an id, email, or password.
    for (const field of ['name', 'handle', 'avatarColor']) if (body[field]) user[field] = body[field];
    return response(config, 200, publicUser(user));
  }
  const userMatch = path.match(/^\/api\/users\/([^/]+)$/);
  if (method === 'get' && userMatch) {
    const found = database.users.find((item) => item.id === userMatch[1]);
    return found ? response(config, 200, publicUser(found)) : error(config, 404, 'User not found');
  }
  if (method === 'get' && path === '/api/live') {
    removeExpiredRooms();
    return response(config, 200, database.rooms);
  }
  if (method === 'post' && path === '/api/live') {
    const id = `r-${Date.now()}`;
    const room = { id, title: body.title, description: body.description || '', contentType: body.contentType, visibility: body.visibility, code: body.code || null, status: body.scheduleNow ? 'live' : 'scheduled', hostId: user.id, hostName: user.name, viewerCount: 1, posterColor: '#3A1B4A', startedAt: body.scheduleNow ? 'Just now' : 'Starts soon' };
    database.rooms.unshift(room);
    return response(config, 201, room);
  }
  const liveActionMatch = path.match(/^\/api\/live\/([^/]+)\/(join|leave|end)$/);
  if (method === 'post' && liveActionMatch) {
    const room = roomById(liveActionMatch[1]);
    if (!room) return error(config, 404, 'Room not found');
    const action = liveActionMatch[2];
    if (action === 'join') room.viewerCount += 1;
    if (action === 'leave') room.viewerCount = Math.max(0, room.viewerCount - 1);
    if (action === 'end') {
      if (room.hostId !== user.id) return error(config, 403, 'Only the host can end this showing');
      room.status = 'ended';
      room.endedAt = new Date().toISOString();
      scheduleRoomRemoval(room);
    }
    return response(config, 200, room);
  }
  const roomMatch = path.match(/^\/api\/live\/([^/]+)$/);
  if (method === 'get' && roomMatch) {
    const room = roomById(roomMatch[1]);
    return room ? response(config, 200, room) : error(config, 404, 'Room not found');
  }
  const mediaMatch = path.match(/^\/api\/live\/([^/]+)\/media$/);
  if (method === 'put' && mediaMatch) {
    const room = roomById(mediaMatch[1]);
    if (!room) return error(config, 404, 'Room not found');
    if (room.hostId !== user.id) return error(config, 403, 'Only the host can change the playing media');
    room.youtubeVideoId = body.youtubeVideoId || null;
    return response(config, 200, room);
  }
  const commentsMatch = path.match(/^\/api\/live\/([^/]+)\/comments$/);
  if (commentsMatch && method === 'get') return response(config, 200, database.messages);
  if (commentsMatch && method === 'post') {
    const comment = { id: `m-${Date.now()}`, userId: user.id, text: body.text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    database.messages.push(comment);
    return response(config, 201, comment);
  }
  const seatsMatch = path.match(/^\/api\/live\/([^/]+)\/seats$/);
  if (seatsMatch && method === 'get') return response(config, 200, database.seatSections);
  const seatClaimMatch = path.match(/^\/api\/live\/([^/]+)\/seats\/([^/]+)$/);
  if (seatClaimMatch && method === 'post') {
    const seatId = seatClaimMatch[2];
    const seat = database.seatSections.flatMap((section) => section.rows).flatMap((row) => row.seats.map((item) => ({ item, id: `${row.rowLabel}${item.num}` }))).find(({ id }) => id === seatId)?.item;
    if (!seat || seat.status !== 'available') return error(config, 409, 'Seat is no longer available');
    seat.status = 'occupied';
    seat.name = user.name;
    return response(config, 200, { seatId });
  }
  return error(config, 404, `No dummy API route for ${method.toUpperCase()} ${path}`);
}
