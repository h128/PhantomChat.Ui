import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import { HomePage } from "./routes/HomePage";
import { MeetingRoomPage } from "./routes/MeetingRoomPage";
import { NotFoundPage } from "./routes/NotFoundPage";
import { SocketProvider } from "./context/SocketContext";
import { useChatSocketBridge } from "./hooks/useChatSocketBridge";

const router = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />,
  },
  {
    path: "/room/:roomName",
    element: <MeetingRoomPage />,
  },
  {
    path: "*",
    element: <NotFoundPage />,
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
