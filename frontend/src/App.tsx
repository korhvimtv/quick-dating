import React, { useState } from "react";
import { SignUpPage } from "./pages/SignUpPage";
import { LoginPage } from "./pages/LoginPage";

export const App: React.FC = () => {
  const [mode, setMode] = useState<"login" | "signup">("signup");

  return (
    <>
      {mode === "signup" ? (
        <SignUpPage onSwitchToLogin={() => setMode("login")} />
      ) : (
        <LoginPage onSwitchToSignup={() => setMode("signup")} />
      )}
    </>
  );
};

