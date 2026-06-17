# ChatSphere - A real time Team communication platform frontend

ChatSphere is the frontend application for a real-time team communication platform. It provides an intuitive UI for channels, direct messages, presence, and real-time message updates.

## Features

- Real-time messaging (channels & direct messages)
- Presence indicators (online/offline)
- Threaded conversations and message history
- User profiles and basic settings
- Responsive UI for desktop and mobile

## Tech Stack

- React (hooks & context)
- WebSocket or Socket.IO for realtime updates
- CSS Modules / Styled Components (or project-specific styling)
- Axios or fetch for REST API calls

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install` or `yarn`
3. Create a .env file with API and socket endpoints as required by the project
4. Run the app: `npm start` or `yarn start`

## Folder Structure (example)

- src/

  - components/      # React components
    - pages/           # Page-level components / routes
    - services/        # API and websocket services
    - context/         # React contexts (auth, socket, theme)
    - hooks/           # Reusable hooks
    - styles/          # Global styles and theme

## Contributing

Contributions are welcome. Please open issues or pull requests with clear descriptions of changes.

## License

Specify project license (e.g., MIT) in LICENSE file.

---
Generated README for the ChatSphere frontend project.
