import { useState } from "react";
import { RouterProvider } from "react-router";
import { router } from "./routes";
import { BootLoader } from "./components/BootLoader";

export default function App() {
  const [isServerReady, setIsServerReady] = useState(false);

  if (!isServerReady) {
    return <BootLoader onReady={() => setIsServerReady(true)} />;
  }

  return <RouterProvider router={router} />;
}
