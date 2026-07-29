import seedData from '../../mockData.json';

// A tiny in-memory API. Its data is seeded from mockData.json and every response
// follows Axios's adapter contract, so components use the same calls as a real API.
const database = structuredClone(seedData);
const ENDED_ROOM_RETENTION_MS = 10 * 60 * 1000;
const wait = () => new Promise((resolve) => setTimeout(resolve, 250));
const clone = (value) => structuredClone(value);
const parseBody = (data) => (typeof data === 'string' ? JSON.parse(data || '{}') : data || {});
const response = (config, status, data) => ({ data: clone(data), status, statusText: status < 400 ? 'OK' : 'Error', headers: {}, config, request: {} });

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

  if (method === 'post' && /^\/api\/auth\/(login|register)$/.test(path)) {
    const isRegister = path.endsWith('/register');
    const name = isRegister ? body.name : database.currentUser.name;
    const user = { ...database.currentUser, name, handle: isRegister ? `@${name.toLowerCase().replace(/\s+/g, '')}` : database.currentUser.handle };
    if (isRegister) database.users[0] = user;
    database.currentUser = user;
    return response(config, 200, { user, accessToken: 'dummy-access-token' });
  }
  if (method === 'post' && path === '/api/auth/logout') return response(config, 204, null);
  if (method === 'post' && path === '/api/auth/refresh') return response(config, 200, { accessToken: 'dummy-access-token' });
  if (method === 'get' && path === '/api/users/me') return response(config, 200, database.currentUser);
  if (method === 'get' && path === '/api/users') return response(config, 200, database.users);
  if (method === 'get' && path === '/api/users/search') {
    const keyword = (config.params?.q || '').toLowerCase();
    return response(config, 200, database.users.filter((user) => user.name.toLowerCase().includes(keyword) || user.handle.toLowerCase().includes(keyword)));
  }
  if (method === 'put' && path === '/api/users/profile') {
    database.currentUser = { ...database.currentUser, ...body };
    database.users = database.users.map((user) => user.id === database.currentUser.id ? database.currentUser : user);
    return response(config, 200, database.currentUser);
  }
  const userMatch = path.match(/^\/api\/users\/([^/]+)$/);
  if (method === 'get' && userMatch) {
    const user = database.users.find((item) => item.id === userMatch[1]);
    return user ? response(config, 200, user) : error(config, 404, 'User not found');
  }
  if (method === 'get' && path === '/api/live') {
    removeExpiredRooms();
    return response(config, 200, database.rooms);
  }
  if (method === 'post' && path === '/api/live') {
    const id = `r-${Date.now()}`;
    const room = { id, title: body.title, description: body.description || '', contentType: body.contentType, visibility: body.visibility, code: body.code || null, status: body.scheduleNow ? 'live' : 'scheduled', hostId: database.currentUser.id, hostName: database.currentUser.name, viewerCount: 1, posterColor: '#3A1B4A', startedAt: body.scheduleNow ? 'Just now' : 'Starts soon' };
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
      if (room.hostId !== database.currentUser.id) return error(config, 403, 'Only the host can end this showing');
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
    if (room.hostId !== database.currentUser.id) return error(config, 403, 'Only the host can change the playing media');
    room.youtubeVideoId = body.youtubeVideoId || null;
    return response(config, 200, room);
  }
  const commentsMatch = path.match(/^\/api\/live\/([^/]+)\/comments$/);
  if (commentsMatch && method === 'get') return response(config, 200, database.messages);
  if (commentsMatch && method === 'post') {
    const comment = { id: `m-${Date.now()}`, userId: database.currentUser.id, text: body.text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
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
    seat.name = database.currentUser.name;
    return response(config, 200, { seatId });
  }
  return error(config, 404, `No dummy API route for ${method.toUpperCase()} ${path}`);
}
