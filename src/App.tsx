// import { useState } from "react";
// import "./App.css"; // Using index.css for tailwind
import { StatusOverlay } from "./components/StatusOverlay";

function App() {
  return (
    <div className="w-screen h-screen bg-transparent overflow-hidden select-none flex items-center justify-center">
      <StatusOverlay />
    </div>
  );
}

export default App;
