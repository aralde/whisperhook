// import { useState } from "react";
// import "./App.css"; // Using index.css for tailwind
import { StatusOverlay } from "./components/StatusOverlay";
import { Settings } from "./components/Settings";

function App() {
  const path = window.location.pathname;

  if (path === '/settings') {
    return <Settings />;
  }

  return (
    <div className="w-screen h-screen bg-transparent overflow-hidden select-none flex items-center justify-center">
      <StatusOverlay />
    </div>
  );
}

export default App;
