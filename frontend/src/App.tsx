import React, { useEffect, useState } from "react";
import { SignUpPage } from "./pages/SignUpPage";
import { LoginPage } from "./pages/LoginPage";
import { ProfilePage } from "./pages/ProfilePage";
import { EditProfilePage } from "./pages/EditProfilePage";
import { SettingsPage } from "./pages/SettingsPage";
import { SessionRoundPage } from "./pages/SessionRoundPage";
import { MatchesPage } from "./pages/MatchesPage";

export type AppView = "signup" | "login" | "profile" | "editProfile" | "settings" | "session" | "matches";

export const App: React.FC = () => {
  const [view, setView] = useState<AppView>("signup");
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("auth_token");
    if (stored) {
      setToken(stored);
      setView("profile");
    }
  }, []);

  const handleLoggedIn = (newToken: string) => {
    setToken(newToken);
    localStorage.setItem("auth_token", newToken);
    setView("profile");
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem("auth_token");
    setView("login");
  };

  if (!token) {
    return view === "signup" ? (
      <SignUpPage onSwitchToLogin={() => setView("login")} />
    ) : (
      <LoginPage onSwitchToSignup={() => setView("signup")} onLoggedIn={handleLoggedIn} />
    );
  }

  return (
    <div className="app-shell">
      <header className="app-shell-header">
        <h1 className="brand">
          quick<span>date</span>
        </h1>
        <nav className="app-shell-nav">
          <button
            type="button"
            className={view === "session" ? "nav-tab nav-tab-active" : "nav-tab"}
            onClick={() => setView("session")}
          >
            Session
          </button>
          <button
            type="button"
            className={view === "matches" ? "nav-tab nav-tab-active" : "nav-tab"}
            onClick={() => setView("matches")}
          >
            Matches
          </button>
          <button
            type="button"
            className={view === "profile" ? "nav-tab nav-tab-active" : "nav-tab"}
            onClick={() => setView("profile")}
          >
            My profile
          </button>
          <button
            type="button"
            className={view === "editProfile" ? "nav-tab nav-tab-active" : "nav-tab"}
            onClick={() => setView("editProfile")}
          >
            Edit profile
          </button>
          <button
            type="button"
            className={view === "settings" ? "nav-tab nav-tab-active" : "nav-tab"}
            onClick={() => setView("settings")}
          >
            Settings
          </button>
        </nav>
        <button type="button" className="link-button small-link" onClick={handleLogout}>
          Log out
        </button>
      </header>
      <main className="app-shell-main">
        {view === "session" && <SessionRoundPage token={token} />}
        {view === "matches" && <MatchesPage token={token} />}
        {view === "profile" && <ProfilePage token={token} />}
        {view === "editProfile" && <EditProfilePage token={token} />}
        {view === "settings" && <SettingsPage token={token} />}
      </main>
    </div>
  );
};

