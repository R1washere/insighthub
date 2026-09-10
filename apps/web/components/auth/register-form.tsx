"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { AuthResponse, requestApi } from "../../lib/api-client";
import { storeAuthSession } from "../../lib/demo-auth";

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    try {
      const result = await requestApi<AuthResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          password: formData.get("password"),
        }),
      });

      storeAuthSession(result);
      router.push("/onboarding");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to register");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <label className="field">
        <span>Name</span>
        <input name="name" type="text" autoComplete="name" required />
      </label>

      <label className="field">
        <span>Email</span>
        <input name="email" type="email" autoComplete="email" required />
      </label>

      <label className="field">
        <span>Password</span>
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </label>

      {error ? <p className="form-error">{error}</p> : null}

      <button
        className="button full-width"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}
