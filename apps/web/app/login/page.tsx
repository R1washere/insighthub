import Link from "next/link";
import { AuthFormShell } from "../../components/auth/auth-form-shell";
import { DemoLoginButton } from "../../components/auth/demo-login-button";
import { LoginForm } from "../../components/auth/login-form";

export default function LoginPage() {
  return (
    <AuthFormShell
      title="Sign in to your analytics workspace"
      description="Use the demo account or your own user to open product analytics dashboards, projects, API keys, and funnels."
      footer={
        <>
          New to InsightHub? <Link href="/register">Create an account</Link>
        </>
      }
    >
      <LoginForm />
      <div className="auth-divider">
        <span>or</span>
      </div>
      <DemoLoginButton />
    </AuthFormShell>
  );
}
