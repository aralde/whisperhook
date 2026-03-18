import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { StatusOverlay } from "./components/StatusOverlay";
import { Settings } from "./components/Settings";
import { SplashScreen } from "./components/SplashScreen";

function App() {
  const path = window.location.pathname;

  // Apply window-specific CSS class so each Tauri window gets the right background
  if (path === '/settings') {
    document.body.classList.add('window-settings');
    return <Settings />;
  }

  document.body.classList.add('window-main');
  return <MainApp />;
}

function MainApp() {
  const [showSplash, setShowSplash] = useState<boolean | null>(null); // null = loading

  useEffect(() => {
    invoke<{ show_splash: boolean }>('get_settings')
      .then(s => setShowSplash(s.show_splash))
      .catch(() => setShowSplash(false)); // on error, skip splash
  }, []);

  const handleSplashDone = useCallback(() => setShowSplash(false), []);

  // While loading settings, render nothing to avoid flash
  if (showSplash === null) return null;

  return (
    <div className="w-screen h-screen bg-transparent overflow-hidden select-none flex items-center justify-center">
      {showSplash && <SplashScreen onDone={handleSplashDone} />}
      {!showSplash && <StatusOverlay />}
    </div>
  );
}

export default App;
