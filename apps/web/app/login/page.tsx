import Link from "next/link";
import { AuthFormShell } from "../../components/auth/auth-form-shell";
import { DemoLoginButton } from "../../components/auth/demo-login-button";
import { LoginForm } from "../../components/auth/login-form";

export default function LoginPage() {
  const demoLoginEnabled =
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PUBLIC_DEMO_LOGIN_ENABLED === "true";

  return (
    <AuthFormShell
      title="Sign in to your analytics workspace"
      description="Sign in with your user to open product analytics dashboards, projects, API keys, and funnels."
      footer={
        <>
          New to InsightHub? <Link href="/register">Create an account</Link>
        </>
      }
    >
      <LoginForm />
      {demoLoginEnabled ? (
        <>
          <div className="auth-divider">
            <span>or</span>
          </div>
          <DemoLoginButton />
        </>
      ) : null}
    </AuthFormShell>
  );
}
