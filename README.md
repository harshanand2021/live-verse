# Live-Verse 🎟️

A virtual theatre for watching together. Live-Verse lets a host stream a movie, web-series episode, or live event into a **room**, while everyone in that room watches in sync and chats alongside the screen — like sitting in the same theatre, just remotely.

Built as the course project for **C-DAC PGCP-AC**.

> **Status:** Frontend-only build with mock data. No backend, auth, or real video/WebSocket connection is wired up yet — see [What's mocked vs. real](#whats-mocked-vs-real) below.

---

## ✨ Features in this build

- **Auth screens** — Login and Signup pages (mock session, stored in memory only)
- **Marquee Board** — the room listing page, with filters for Public / Private / Live Now and a search bar
- **Host a Room** — a form to configure a new room: title, description, content type (Movie / Web Series / Live Event), visibility (Public / Private), and an auto-generated invite code for private rooms
- **Watch Room** — the core viewing screen: a cinema-style player frame + a live chat panel ("The Seat Row") with quick reactions
- **Host Controls** — visible only to the room's host: playback control, an "Up Next" queue, a viewer list (mute/remove), and room settings (lock room, toggle chat/reactions, end the show)

---

## 🎨 Design direction

The visual language leans into the *physical theatre* rather than a generic "streaming app" look:

| Element | Why |
|---|---|
| **Ticket-stub room cards** with a perforated tear line | Rooms are framed as admission tickets, not generic cards |
| **Marquee bulb** logo mark + pulsing "LIVE" dot | Echoes cinema marquee lighting |
| Near-black "theatre dark" background (`#0E0B12`) with a warm marquee-orange accent (`#FF5A3C`) and a violet accent (`#7C6BFF`) for host/private elements | Distinguishes host-only and private-room UI from regular public/viewer UI at a glance |
| Condensed display type (Anton) for headings, humanist sans (Work Sans) for body, mono (IBM Plex Mono) for codes/timestamps | Marquee-lettering feel for headings, ticket-stub printer feel for codes |

All color, type, and spacing values live as CSS variables in `src/index.css` — change the theme from one place.

---

## 🗂️ Project structure

```
live-verse/
├─ src/
│  ├─ components/        # Reusable UI: Button, Logo, Navbar, RoomCard,
│  │                      # ScreenPlayer, ChatPanel, HostControls, AppShell,
│  │                      # ProtectedRoute (+ matching .css per component)
│  ├─ context/
│  │  └─ AuthContext.jsx # Mock auth state (login/signup/logout), in-memory only
│  ├─ data/
│  │  └─ mockData.js     # Mock rooms, users, chat messages — swap for API calls later
│  ├─ pages/
│  │  ├─ Login.jsx / Signup.jsx       # Auth screens
│  │  ├─ RoomList.jsx                 # "Marquee Board" — browse/filter/search rooms
│  │  ├─ CreateRoom.jsx               # "Host a Room" form
│  │  ├─ HostReady.jsx                # Confirmation screen after creating a room
│  │  └─ WatchRoom.jsx                # The viewing room: player + chat + host controls
│  ├─ App.jsx             # Route definitions
│  ├─ main.jsx            # App entry point
│  └─ index.css           # Design tokens (colors, type, spacing) + global resets
├─ index.html
├─ package.json
└─ vite.config.js
```

---

## 🚀 Getting started

```bash
cd live-verse
npm install
npm run dev
```

Then open the local URL Vite prints (localhost: `http://localhost:5173`).

Other scripts:

```bash
npm run build     # production build → dist/
npm run preview   # preview the production build locally
npm run lint      # oxlint
```

---

## 🧭 How to navigate it

1. **`/login`** or **`/signup`** — enter any non-empty values; the mock auth accepts anything and logs you in as a sample user ("Aarav Sharma").
2. **`/rooms`** — the Marquee Board. Filter by Public/Private/Live, or search by title. Click any ticket card to enter that room.
3. **`/host/new`** — fill out the form to "host" a room. Choosing **Private** generates a sample invite code (e.g. `MOON-42`).
4. After submitting, you land on a confirmation screen, then **"Enter Room as Host"** drops you into a room where you *are* the host — this is the only mock room where the Host Controls panel and playback controls are enabled, so you can see that flow end-to-end.
5. Any other room card from the board (e.g. *Interstellar — Director's Watch*) opens the same Watch Room as a **viewer** — chat works, but playback is host-controlled and shows "Synced to Host."

---

## 🔌 What's mocked vs. real

This phase is **frontend-only**, built so the backend can be dropped in later without restructuring the UI.

| Area | Current state | Swap-in point |
|---|---|---|
| Auth | In-memory mock; any credentials "work" | `src/context/AuthContext.jsx` — replace `login`/`signup` with real API calls, persist a token |
| Rooms list | Static array in `mockData.js` | Replace with a `GET /rooms` fetch (consider React Query or plain `useEffect`) |
| Create room | Generates a fake code, no persistence | `POST /rooms` — return the real room id/code and route to it |
| Video playback | A styled placeholder screen (no real `<video>` element) | Wire up your streaming layer here — e.g. HLS.js / WebRTC — inside `ScreenPlayer.jsx` |
| Chat | Local React state only, not shared between users | Connect a WebSocket (Socket.IO / native WS) inside `ChatPanel.jsx`'s send/receive logic |
| Host controls | UI only — buttons don't call anything yet | Wire mute/remove/lock/end actions to your room-management API + broadcast over the socket |
| Sync ("Synced to Host") | Cosmetic label only | Real implementation needs the host's playback position broadcast to viewers via WebSocket |

The shapes in `mockData.js` (room, user, message objects) are intentionally close to what a real API response would look like, so once the backend exists, most components should need minimal changes — mainly swapping `mockRooms` for fetched data.

---

## 🛠️ Tech stack

- **React 19** + **Vite** for the build tooling
- **React Router v7** for client-side routing and route protection
- Plain CSS with custom properties (no CSS framework) — keeps the theatre design system fully custom
- No backend, no real-time layer yet (see table above)

---

## 📋 Our next steps

1. Build the backend with Java using Spring Boot or Quarkus, and integrate real-time room features such as chat and playback sync through WebSockets or SSE.
2. Define the `Room`, `User`, and `Message` schemas to match `mockData.js` and expose REST endpoints for room creation, joining, and state updates.
3. Replace `AuthContext` with real JWT/session-based auth.
4. Wire `ScreenPlayer` to an actual video source — for true synchronized playback across viewers, look at HLS for streaming + a WebSocket-driven "play/pause/seek" event broadcast from host to viewers.
5. Add room persistence so `CreateRoom` → `HostReady` → `WatchRoom` uses one real room id throughout, instead of a hardcoded mock id.
6. Add presence (who's currently in the room) and proper viewer-count updates over the socket connection.
