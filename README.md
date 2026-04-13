# PhantomChat.UI

## FE for the https://github.com/h128/PhantomChat

Vite + React + TypeScript starter configured with:

- React Compiler
- Tailwind CSS v4
- Redux Toolkit
- React Router

## Scripts

- `yarn dev`
- `yarn build`
- `yarn lint`
- `yarn preview`

## Background Notifications

- The frontend now registers a lightweight notification service worker and can show system notifications for incoming messages while the page is hidden or inactive, as long as the websocket session is still alive.
- Notification permission is requested only from an explicit user action in the room UI.
- True closed-tab or browser-closed delivery is not implemented yet because the current backend does not expose Web Push subscription or push delivery support.
- The service worker click handler already routes the user back into the relevant room, so future backend push delivery can target the same worker entry point.

### Warning:

> this is still under construction and not ready for usse, nor collaboration yet. Please stay tuned
