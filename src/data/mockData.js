// Mock data layer for Live-Verse frontend.
// This simulates what a real backend (REST + WebSocket) would return.
// Swap these for real API calls once the backend is ready -
// keep the same shape so components don't need to change.

export const CONTENT_TYPES = {
  MOVIE: 'movie',
  SERIES: 'series',
  LIVE_EVENT: 'live_event',
};

export const ROOM_VISIBILITY = {
  PUBLIC: 'public',
  PRIVATE: 'private',
};

export const ROOM_STATUS = {
  LIVE: 'live',
  SCHEDULED: 'scheduled',
  ENDED: 'ended',
};

export const currentUser = {
  id: 'u-001',
  name: 'Aarav Sharma',
  handle: '@aarav',
  avatarColor: '#FF5A3C',
  isHost: true,
};

export const mockUsers = [
  { id: 'u-001', name: 'Aarav Sharma', handle: '@aarav', avatarColor: '#FF5A3C' },
  { id: 'u-002', name: 'Priya Nair', handle: '@priyan', avatarColor: '#7C6BFF' },
  { id: 'u-003', name: 'Rohan Mehta', handle: '@rohanm', avatarColor: '#4ADE80' },
  { id: 'u-004', name: 'Sneha Iyer', handle: '@sneha_i', avatarColor: '#FFD166' },
  { id: 'u-005', name: 'Kabir Singh', handle: '@kabirs', avatarColor: '#06D6A0' },
  { id: 'u-006', name: 'Meera Joshi', handle: '@meeraj', avatarColor: '#EF476F' },
];

export const mockRooms = [
  {
    id: 'r-101',
    title: 'Interstellar — Director\u2019s Watch',
    contentType: CONTENT_TYPES.MOVIE,
    visibility: ROOM_VISIBILITY.PUBLIC,
    status: ROOM_STATUS.LIVE,
    hostName: 'Priya Nair',
    hostId: 'u-002',
    viewerCount: 248,
    posterColor: '#1B2A4A',
    description: 'Wormholes, watches, and a whole lot of crying. Bring tissues.',
    code: null,
    startedAt: '21 minutes ago',
  },
  {
    id: 'r-102',
    title: 'The Last Stand — S2 Finale',
    contentType: CONTENT_TYPES.SERIES,
    visibility: ROOM_VISIBILITY.PUBLIC,
    status: ROOM_STATUS.LIVE,
    hostName: 'Kabir Singh',
    hostId: 'u-005',
    viewerCount: 132,
    posterColor: '#4A1B2A',
    description: 'Season finale watch party. No spoilers in chat or you get muted.',
    code: null,
    startedAt: '8 minutes ago',
  },
  {
    id: 'r-103',
    title: 'IPL Final — Live Watch Party',
    contentType: CONTENT_TYPES.LIVE_EVENT,
    visibility: ROOM_VISIBILITY.PUBLIC,
    status: ROOM_STATUS.LIVE,
    hostName: 'Rohan Mehta',
    hostId: 'u-003',
    viewerCount: 1204,
    posterColor: '#1B4A2A',
    description: 'Every six gets a chat explosion. You\u2019ve been warned.',
    code: null,
    startedAt: '1 hour ago',
  },
  {
    id: 'r-104',
    title: 'Midnight Animation Marathon',
    contentType: CONTENT_TYPES.MOVIE,
    visibility: ROOM_VISIBILITY.PRIVATE,
    status: ROOM_STATUS.LIVE,
    hostName: 'Aarav Sharma',
    hostId: 'u-001',
    viewerCount: 6,
    posterColor: '#3A1B4A',
    description: 'Friends-only. Three films, zero sleep.',
    code: 'MOON-42',
    startedAt: '34 minutes ago',
  },
  {
    id: 'r-105',
    title: 'Indie Sundays: Short Films Vol. 4',
    contentType: CONTENT_TYPES.MOVIE,
    visibility: ROOM_VISIBILITY.PUBLIC,
    status: ROOM_STATUS.SCHEDULED,
    hostName: 'Sneha Iyer',
    hostId: 'u-004',
    viewerCount: 0,
    posterColor: '#4A3A1B',
    description: 'Curated indie shorts, hosted live with director Q&A after.',
    code: null,
    startedAt: 'Starts in 2 hours',
  },
  {
    id: 'r-106',
    title: 'Book Club Watches the Adaptation',
    contentType: CONTENT_TYPES.MOVIE,
    visibility: ROOM_VISIBILITY.PRIVATE,
    status: ROOM_STATUS.SCHEDULED,
    hostName: 'Meera Joshi',
    hostId: 'u-006',
    viewerCount: 0,
    posterColor: '#1B3A4A',
    description: 'Members-only, invite code shared in our group chat.',
    code: 'PAGE-09',
    startedAt: 'Starts tomorrow, 8 PM',
  },
];

export const mockChatMessages = [
  { id: 'm1', userId: 'u-002', text: 'okay this opening scene already hits different on a big screen', time: '21:02' },
  { id: 'm2', userId: 'u-003', text: 'wait did everyone\'s stream just buffer or just mine', time: '21:03' },
  { id: 'm4', userId: 'u-004', text: 'mine\'s fine, might be your wifi rohan', time: '21:03' },
  { id: 'm5', userId: 'u-003', text: 'figures lol', time: '21:04' },
  { id: 'm6', userId: 'u-005', text: 'shhh its starting', time: '21:04' },
  { id: 'm7', userId: 'u-006', text: 'the score in this scene is so good', time: '21:06' },
];

export const mockReactions = ['❤️', '😂', '😮', '👏', '🔥'];

// Simulated network delay so loading states have something to show
export const fakeDelay = (ms = 500) => new Promise((res) => setTimeout(res, ms));