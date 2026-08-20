import { Layers } from "lucide-react";
import { LoginForm } from "./login-form";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4">
      <div className="w-full max-w-[380px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[14px] bg-accent text-white shadow-[var(--shadow-md)]">
            <Layers className="h-6 w-6" strokeWidth={2.25} />
          </div>
          <h1 className="text-[20px] font-semibold tracking-[-0.015em]">TaskEngine</h1>
          <p className="mt-1 text-[13.5px] text-muted">The single place that keeps everyone up to speed.</p>
        </div>

        <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-6 shadow-[var(--shadow-sm)]">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
