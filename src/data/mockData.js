// Mock data layer for Live-Verse frontend.
// Swap for real API calls once backend is ready — keep the same shapes.

export const CONTENT_TYPES   = { MOVIE: 'movie', SERIES: 'series', LIVE_EVENT: 'live_event' };
export const ROOM_VISIBILITY = { PUBLIC: 'public', PRIVATE: 'private' };
export const ROOM_STATUS     = { LIVE: 'live', SCHEDULED: 'scheduled', ENDED: 'ended' };

export const currentUser = {
  id: 'u-001', name: 'Aarav Sharma', handle: '@aarav',
  avatarColor: '#FF5A3C', isHost: true,
};

export const mockUsers = [
  { id: 'u-001', name: 'Aarav Sharma',  handle: '@aarav',   avatarColor: '#FF5A3C' },
  { id: 'u-002', name: 'Priya Nair',    handle: '@priyan',  avatarColor: '#7C6BFF' },
  { id: 'u-003', name: 'Rohan Mehta',   handle: '@rohanm',  avatarColor: '#4ADE80' },
  { id: 'u-004', name: 'Sneha Iyer',    handle: '@sneha_i', avatarColor: '#FFD166' },
  { id: 'u-005', name: 'Kabir Singh',   handle: '@kabirs',  avatarColor: '#06D6A0' },
  { id: 'u-006', name: 'Meera Joshi',   handle: '@meeraj',  avatarColor: '#EF476F' },
];

// ─── Theatre seat sections ────────────────────────────────────────────────────
// Each section has: label, tier (price category), rows
// Each row has: rowLabel, seats[]
// Each seat has: num, status ('available'|'occupied'|'you'|'host'|'sold'), name?

const S  = 'sold';      // grey  – taken by someone else, not interactive
const A  = 'available'; // green – free to sit
const OC = 'occupied';  // orange-ish – anonymous viewer already watching
const H  = 'host';      // marquee red – host seat
const Y  = 'you';       // bright green highlight – the current user's seat

// Helper — build a row quickly
function mkRow(rowLabel, pattern) {
  // pattern: array of [seatNum, status, optionalName]
  return {
    rowLabel,
    seats: pattern.map(([num, status, name = null]) => ({
      num: String(num).padStart(2, '0'),
      status,
      name,
    })),
  };
}

export const SEAT_SECTIONS = [
  {
    id: 'premium',
    tier: 'PREMIUM ROW',
    tierSub: 'Host & Featured Seats',
    rows: [
      mkRow('A', [
        [10,S],[9,S],[8,H,'Aarav (Host)'],[7,OC,'Priya'],[6,Y,'You'],[5,OC,'Rohan'],
        [4,OC,'Sneha'],[3,OC,'Kabir'],[2,OC,'Meera'],[1,A],
      ]),
    ],
  },
  {
    id: 'premier',
    tier: 'PREMIER',
    tierSub: 'Centre Section',
    rows: [
      mkRow('B', [[14,OC],[13,OC],[12,OC],[11,S],[10,S],[9,A],[8,A],[7,OC],[6,OC],[5,A],[4,A],[3,OC],[2,OC],[1,A]]),
      mkRow('C', [[14,A],[13,A],[12,OC],[11,OC],[10,OC],[9,S],[8,S],[7,A],[6,A],[5,OC],[4,OC],[3,A],[2,A],[1,OC]]),
      mkRow('D', [[14,OC],[13,A],[12,A],[11,OC],[10,S],[9,A],[8,OC],[7,OC],[6,A],[5,S],[4,A],[3,OC],[2,A],[1,A]]),
      mkRow('E', [[14,A],[13,OC],[12,OC],[11,A],[10,A],[9,OC],[8,A],[7,S],[6,OC],[5,A],[4,OC],[3,A],[2,OC],[1,OC]]),
    ],
  },
  {
    id: 'classic',
    tier: 'CLASSIC',
    tierSub: 'Standard Seating',
    rows: [
      mkRow('F', [[16,OC],[15,OC],[14,S],[13,A],[12,A],[11,OC],[10,OC],[9,S],[8,A],[7,OC],[6,OC],[5,A],[4,A],[3,OC],[2,S],[1,A]]),
      mkRow('G', [[16,A],[15,OC],[14,OC],[13,OC],[12,S],[11,A],[10,A],[9,OC],[8,OC],[7,A],[6,S],[5,OC],[4,A],[3,A],[2,OC],[1,OC]]),
      mkRow('H', [[16,OC],[15,A],[14,A],[13,OC],[12,OC],[11,S],[10,OC],[9,A],[8,A],[7,OC],[6,OC],[5,A],[4,S],[3,OC],[2,A],[1,OC]]),
      mkRow('I', [[16,S],[15,OC],[14,OC],[13,A],[12,A],[11,OC],[10,S],[9,OC],[8,A],[7,A],[6,OC],[5,OC],[4,A],[3,A],[2,OC],[1,A]]),
      mkRow('J', [[16,A],[15,A],[14,OC],[13,OC],[12,S],[11,A],[10,OC],[9,OC],[8,A],[7,S],[6,A],[5,OC],[4,OC],[3,A],[2,A],[1,OC]]),
    ],
  },
];

// Flat seat list (used elsewhere if needed)
export const mockSeats = SEAT_SECTIONS.flatMap(sec =>
  sec.rows.flatMap(row =>
    row.seats.map(seat => ({
      seatId:        `${row.rowLabel}${seat.num}`,
      rowLabel:      row.rowLabel,
      num:           seat.num,
      status:        seat.status,
      name:          seat.name,
      isCurrentUser: seat.status === 'you',
      isHost:        seat.status === 'host',
    }))
  )
);

// ─── Rooms ────────────────────────────────────────────────────────────────────
export const mockRooms = [
  { id:'r-101', title:'Interstellar \u2014 Director\u2019s Watch', contentType:CONTENT_TYPES.MOVIE,       visibility:ROOM_VISIBILITY.PUBLIC,  status:ROOM_STATUS.LIVE,      hostName:'Priya Nair',   hostId:'u-002', viewerCount:248,  posterColor:'#1B2A4A', description:'Wormholes, watches, and a whole lot of crying.', code:null,      startedAt:'21 minutes ago' },
  { id:'r-102', title:'The Last Stand \u2014 S2 Finale',          contentType:CONTENT_TYPES.SERIES,      visibility:ROOM_VISIBILITY.PUBLIC,  status:ROOM_STATUS.LIVE,      hostName:'Kabir Singh',  hostId:'u-005', viewerCount:132,  posterColor:'#4A1B2A', description:'Season finale watch party. No spoilers.',       code:null,      startedAt:'8 minutes ago'  },
  { id:'r-103', title:'IPL Final \u2014 Live Watch Party',         contentType:CONTENT_TYPES.LIVE_EVENT, visibility:ROOM_VISIBILITY.PUBLIC,  status:ROOM_STATUS.LIVE,      hostName:'Rohan Mehta',  hostId:'u-003', viewerCount:1204, posterColor:'#1B4A2A', description:'Every six gets a chat explosion.',              code:null,      startedAt:'1 hour ago'     },
  { id:'r-104', title:'Midnight Animation Marathon',               contentType:CONTENT_TYPES.MOVIE,       visibility:ROOM_VISIBILITY.PRIVATE, status:ROOM_STATUS.LIVE,      hostName:'Aarav Sharma', hostId:'u-001', viewerCount:32,   posterColor:'#3A1B4A', description:'Friends-only. Three films, zero sleep.',        code:'MOON-42', startedAt:'34 minutes ago' },
  { id:'r-105', title:'Indie Sundays: Short Films Vol. 4',         contentType:CONTENT_TYPES.MOVIE,       visibility:ROOM_VISIBILITY.PUBLIC,  status:ROOM_STATUS.SCHEDULED, hostName:'Sneha Iyer',   hostId:'u-004', viewerCount:0,    posterColor:'#4A3A1B', description:'Curated indie shorts with director Q&A.',       code:null,      startedAt:'Starts in 2 hours' },
  { id:'r-106', title:'Book Club Watches the Adaptation',          contentType:CONTENT_TYPES.MOVIE,       visibility:ROOM_VISIBILITY.PRIVATE, status:ROOM_STATUS.SCHEDULED, hostName:'Meera Joshi',  hostId:'u-006', viewerCount:0,    posterColor:'#1B3A4A', description:'Members-only, invite code in our group chat.', code:'PAGE-09', startedAt:'Starts tomorrow, 8 PM' },
];

export const mockChatMessages = [
  { id:'m1', userId:'u-002', text:'okay this opening scene already hits different on a big screen', time:'21:02' },
  { id:'m2', userId:'u-003', text:"wait did everyone's stream just buffer or just mine",            time:'21:03' },
  { id:'m3', userId:'u-004', text:"mine's fine, might be your wifi rohan",                          time:'21:03' },
  { id:'m4', userId:'u-003', text:'figures lol',                                                    time:'21:04' },
  { id:'m5', userId:'u-005', text:'shhh its starting',                                              time:'21:04' },
  { id:'m6', userId:'u-006', text:'the score in this scene is so good',                             time:'21:06' },
];

export const mockReactions = ['❤️','😂','😮','👏','🔥'];
export const fakeDelay = (ms = 500) => new Promise(res => setTimeout(res, ms));