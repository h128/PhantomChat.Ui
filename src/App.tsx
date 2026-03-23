import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { HomePage } from "./routes/HomePage";
import { MeetingRoomPage } from "./routes/MeetingRoomPage";
import { NotFoundPage } from "./routes/NotFoundPage";

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

export default function App() {
  return <RouterProvider router={router} />;
}
