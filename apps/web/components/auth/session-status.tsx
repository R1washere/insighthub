"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  clearAuthSession,
  getStoredUserEmail,
  signInDemoAccount,
} from "../../lib/demo-auth";
import { useWorkspace } from "../app/workspace-provider";

export function SessionStatus() {
  const workspace = useWorkspace();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const demoEnabled =
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PUBLIC_DEMO_LOGIN_ENABLED === "true";
  async function loginDemo() {
    setSubmitting(true);
    setError(null);
    try {
      await signInDemoAccount();
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <section className="session-card" aria-label="Session status">
      <p className="session-label">Session</p>
      <p className="session-email">
        {workspace.status === "loading"
          ? "Checking access..."
          : workspace.accessToken
            ? workspace.expired
              ? "Session expired"
              : getStoredUserEmail()
            : "Guest mode"}
      </p>
      {workspace.accessToken ? (
        <>
          {workspace.expired ? (
            <Link className="session-link" href="/login">
              Sign in again
            </Link>
          ) : null}
          <button
            className="table-action full-width"
            type="button"
            onClick={() => {
              clearAuthSession();
              router.refresh();
            }}
          >
            Sign out
          </button>
        </>
      ) : (
        <>
          {demoEnabled && workspace.preview ? (
            <button
              className="button full-width compact-button"
              disabled={submitting}
              onClick={loginDemo}
              type="button"
            >
              {submitting ? "Opening demo..." : "Use demo account"}
            </button>
          ) : null}
          <Link className="session-link" href="/login">
            Sign in manually
          </Link>
        </>
      )}
      {error ? (
        <p className="session-error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
