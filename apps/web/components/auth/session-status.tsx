"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  clearAuthSession,
  getStoredAccessToken,
  getStoredUserEmail,
  signInDemoAccount,
  storeAuthSession,
} from "../../lib/demo-auth";
import { type AuthResponse, requestApi } from "../../lib/api-client";

export function SessionStatus() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoLoading, setIsDemoLoading] = useState(false);

  useEffect(() => {
    void validateSession();

    window.addEventListener("insighthub:auth-session-changed", validateSession);
    return () => {
      window.removeEventListener(
        "insighthub:auth-session-changed",
        validateSession,
      );
    };
  }, []);

  async function validateSession() {
    const accessToken = getStoredAccessToken();

    if (!accessToken) {
      setEmail(null);
      setIsLoading(false);
      return;
    }

    setEmail(getStoredUserEmail());

    try {
      const user = await requestApi<AuthResponse["user"]>("/auth/me", {
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      storeAuthSession(
        {
          accessToken,
          user,
        },
        { notify: false },
      );
      setEmail(user.email);
    } catch {
      clearAuthSession({ notify: false });
      setEmail(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDemoLogin() {
    setError(null);
    setIsDemoLoading(true);

    try {
      const result = await signInDemoAccount();
      setEmail(result.user.email);
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to start demo session",
      );
    } finally {
      setIsDemoLoading(false);
    }
  }

  function handleSignOut() {
    clearAuthSession();
    setEmail(null);
    router.refresh();
  }

  if (isLoading) {
    return (
      <section className="session-card" aria-label="Session status">
        <p className="session-label">Session</p>
        <p className="session-email">Checking access...</p>
      </section>
    );
  }

  if (!email) {
    return (
      <section className="session-card" aria-label="Session status">
        <p className="session-label">Session</p>
        <p className="session-email">Guest mode</p>
        <button
          className="button full-width compact-button"
          disabled={isDemoLoading}
          onClick={handleDemoLogin}
          type="button"
        >
          {isDemoLoading ? "Opening demo..." : "Use demo account"}
        </button>
        <Link className="session-link" href="/login">
          Sign in manually
        </Link>
        {error ? <p className="session-error">{error}</p> : null}
      </section>
    );
  }

  return (
    <section className="session-card" aria-label="Session status">
      <p className="session-label">Signed in</p>
      <p className="session-email">{email}</p>
      <button
        className="table-action full-width"
        onClick={handleSignOut}
        type="button"
      >
        Sign out
      </button>
    </section>
  );
}
