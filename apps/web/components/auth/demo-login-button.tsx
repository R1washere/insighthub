"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { signInDemoAccount } from "../../lib/demo-auth";

type DemoLoginButtonProps = {
  className?: string;
  redirectTo?: string;
};

export function DemoLoginButton({
  className = "button full-width",
  redirectTo = "/",
}: DemoLoginButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleDemoLogin() {
    setError(null);
    setIsSubmitting(true);

    try {
      await signInDemoAccount();
      router.push(redirectTo);
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to start demo session",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="demo-login-block">
      <button
        className={className}
        disabled={isSubmitting}
        onClick={handleDemoLogin}
        type="button"
      >
        {isSubmitting ? "Opening demo..." : "Use demo account"}
      </button>
      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}
