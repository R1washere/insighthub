import Link from "next/link";
import { AuthFormShell } from "../../components/auth/auth-form-shell";
import { RegisterForm } from "../../components/auth/register-form";

export default function RegisterPage() {
  return (
    <AuthFormShell
      title="Create your analytics workspace"
      description="Start with a user account, then create an organization, project, and tracking API key for a SaaS product."
      footer={
        <>
          Already have an account? <Link href="/login">Sign in</Link>
        </>
      }
    >
      <RegisterForm />
    </AuthFormShell>
  );
}
