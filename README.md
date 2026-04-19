# PhantomChat.UI

Frontend for [PhantomChat](https://github.com/h128/PhantomChat) — a secure, decentralized chat application built around privacy and simplicity. No contact lists, no dashboards, no extra steps. Just a clean place to start chatting.

> **Warning:** This project is still under construction and not ready for use or collaboration yet. Please stay tuned.

## Features

- **End-to-End Encryption** — Messages encrypted with libsodium (XSalsa20-Poly1305) using per-room key exchange
- **Ephemeral Rooms** — Create or join rooms instantly with a nickname and avatar
- **Voice & Video Calls** — WebRTC peer-to-peer calling with multi-peer grid layout
- **Screen Sharing** — Share your screen during calls
- **Dark / Light Mode** — Theme toggle with system preference detection
- **Internationalization** — English and Persian (Farsi) language support via i18next and Tolgee
- **Background Notifications** — Service worker-powered system notifications for incoming messages while the page is inactive
- **Responsive Design** — Mobile-first layout with Tailwind CSS

## Tech Stack

| Layer     | Technology                            |
| --------- | ------------------------------------- |
| Framework | React 19, TypeScript 5.9, Vite 8      |
| Styling   | Tailwind CSS v4                       |
| State     | Redux Toolkit with persist middleware |
| Routing   | React Router 7                        |
| Crypto    | libsodium-wrappers                    |
| Real-time | WebSocket (native), WebRTC            |
| i18n      | i18next, Tolgee                       |
| Compiler  | React Compiler (via Babel plugin)     |

## Getting Started

### Prerequisites

- Node.js (LTS recommended)
- Yarn

### Environment Variables

Create a `.env` file in the project root:

```env
VITE_WS_URL=wss://your-backend/room
VITE_HTTP_URL=https://your-backend
VITE_ENCRYPT_FILES=true
VITE_ICE_USERNAME=<STUN/TURN username>
VITE_ICE_CREDENTIAL=<STUN/TURN credential>
VITE_APP_TOLGEE_API_URL=<optional — Tolgee API URL>
VITE_APP_TOLGEE_API_KEY=<optional — Tolgee API key>
```

### Install & Run

```bash
yarn install
yarn dev
```

## Scripts

| Command           | Description                          |
| ----------------- | ------------------------------------ |
| `yarn dev`        | Start Vite dev server with HMR       |
| `yarn build`      | TypeScript check + production build  |
| `yarn preview`    | Preview the production build locally |
| `yarn lint`       | Run ESLint                           |
| `yarn format`     | Format all files with Prettier       |
| `yarn prettylint` | ESLint fix + Prettier format         |
| `yarn test`       | Run tests (Vitest, one-shot)         |
| `yarn test:watch` | Run tests in watch mode              |
| `yarn typecheck`  | TypeScript type check (no emit)      |

## Project Structure

```
src/
├── app/            # Redux store & typed hooks
├── components/     # Reusable UI components (ChatBox, UsersList, AvatarPicker, ...)
├── context/        # React Context (WebSocket provider)
├── features/       # Redux slices & domain logic (chat, profile, theme, ui)
├── hooks/          # Custom hooks (useSocket, useWebRTC, useChatSocketBridge, ...)
├── i18n/           # i18next configuration
├── locales/        # Translation files (en, fa)
├── routes/         # Page components (Home, MeetingRoom, NotFound)
├── services/       # WebSocket client, WebRTC service, crypto, notifications
└── utils/          # Shared utilities
```

## Background Notifications

- A lightweight service worker is registered for system notifications while the page is hidden or inactive (WebSocket session must still be alive).
- Notification permission is requested only from an explicit user action in the room UI.
- The service worker click handler routes the user back into the relevant room.
- True closed-tab delivery is not yet implemented — the backend does not expose Web Push subscription or push delivery support yet.
