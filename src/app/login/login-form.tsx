"use client";

import { Button } from "@/components/ui/button";
import { Input, Label, FieldGroup } from "@/components/ui/input";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong");
      return;
    }
    router.push(params.get("next") || "/dashboard");
    router.refresh();
  }

  function useDemo(demoEmail: string) {
    setEmail(demoEmail);
    setPassword("password123");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FieldGroup>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
      </FieldGroup>
      <FieldGroup>
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
      </FieldGroup>

      {error && <p className="text-[13px] text-danger">{error}</p>}

      <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
        {loading ? "Signing in…" : "Sign In"}
      </Button>

      <div className="pt-2">
        <p className="text-[11.5px] font-medium uppercase tracking-wide text-muted-2 mb-2">Try a demo role</p>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            ["CIO", "cio@taskengine.io"],
            ["Director", "director.tech@taskengine.io"],
            ["Manager", "manager.eng@taskengine.io"],
            ["Staff", "staff.eng1@taskengine.io"],
          ].map(([label, mail]) => (
            <button
              type="button"
              key={mail}
              onClick={() => useDemo(mail)}
              className="rounded-[8px] border border-border px-2.5 py-1.5 text-left text-[12px] text-muted hover:border-accent hover:text-accent transition-colors"
            >
              {label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11.5px] text-muted-2">Password for all demo accounts: password123</p>
      </div>
    </form>
  );
}
