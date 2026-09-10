import Link from "next/link";
import type { ReactNode } from "react";

type AuthFormShellProps = {
  title: string;
  description: string;
  footer: ReactNode;
  children: ReactNode;
};

export function AuthFormShell({
  title,
  description,
  footer,
  children,
}: AuthFormShellProps) {
  return (
    <main className="auth-page">
      <section className="auth-hero">
        <Link className="auth-logo" href="/">
          InsightHub
        </Link>
        <div>
          <p className="eyebrow auth-eyebrow">
            Product analytics for SaaS teams
          </p>
          <h1 className="auth-title">{title}</h1>
          <p className="auth-description">{description}</p>
        </div>
      </section>

      <section className="auth-panel">
        {children}
        <div className="auth-footer">{footer}</div>
      </section>
    </main>
  );
}
