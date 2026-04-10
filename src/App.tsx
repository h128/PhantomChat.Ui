import { Suspense, lazy } from "react";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import { SocketProvider } from "./context/SocketContext";
import { useChatSocketBridge } from "./hooks/useChatSocketBridge";

const HomePage = lazy(() =>
  import("./routes/HomePage").then((m) => ({ default: m.HomePage })),
);
const MeetingRoomPage = lazy(() =>
  import("./routes/MeetingRoomPage").then((m) => ({
    default: m.MeetingRoomPage,
  })),
);
const NotFoundPage = lazy(() =>
  import("./routes/NotFoundPage").then((m) => ({ default: m.NotFoundPage })),
);

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <Suspense>
        <HomePage />
      </Suspense>
    ),
  },
  {
    path: "/room/:roomName",
    element: (
      <Suspense>
        <MeetingRoomPage />
      </Suspense>
    ),
  },
  {
    path: "*",
    element: (
      <Suspense>
        <NotFoundPage />
      </Suspense>
    ),
  },
]);

function SocketBridgeLoader() {
  useChatSocketBridge();
  return null;
}

export default function App() {
  return (
    <SocketProvider>
      <SocketBridgeLoader />
      <RouterProvider router={router} />
      <Toaster />
    </SocketProvider>
  );
}
