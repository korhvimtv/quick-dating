import React from "react";

type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export const AuthLayout: React.FC<Props> = ({ title, subtitle, children, footer }) => {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <header className="auth-header">
          <h1 className="brand">
            quick<span>date</span>
          </h1>
          <h2>{title}</h2>
          {subtitle && <p className="subtitle">{subtitle}</p>}
        </header>
        <main>{children}</main>
        {footer && <footer className="auth-footer">{footer}</footer>}
      </div>
    </div>
  );
};

