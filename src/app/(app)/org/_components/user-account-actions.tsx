"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { CopyField } from "@/components/ui/copy-field";
import { KeyRound, Send } from "lucide-react";

function LinkModal({
  open,
  onClose,
  title,
  description,
  link,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  link: string | null;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="lg">
      <div className="space-y-4">
        <p className="text-[13.5px] text-foreground">{description}</p>
        {link && <CopyField value={link} />}
        <div className="flex justify-end pt-2">
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function ResendInviteButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [link, setLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function trigger() {
    setLoading(true);
    try {
      const res = await fetch(`/api/org/users/${userId}/resend-invite`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not create invite link");
      setLink(`${window.location.origin}/accept-invite?token=${data.token}`);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Could not create invite link");
    } finally {
      setLoading(false);
    }
  }

  function close() {
    setLink(null);
    router.refresh();
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={trigger} disabled={loading}>
        <Send className="h-3.5 w-3.5" /> {loading ? "Generating…" : "Get invite link"}
      </Button>
      <LinkModal
        open={link !== null}
        onClose={close}
        title="Invite link"
        description="Share this link with them — it expires in 7 days:"
        link={link}
      />
    </>
  );
}

export function ResetPasswordButton({ userId }: { userId: string }) {
  const [link, setLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function trigger() {
    if (!window.confirm("Generate a password reset link for this person?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/org/users/${userId}/reset-password`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not create reset link");
      setLink(`${window.location.origin}/reset-password?token=${data.token}`);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Could not create reset link");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={trigger} disabled={loading}>
        <KeyRound className="h-3.5 w-3.5" /> {loading ? "Generating…" : "Reset password"}
      </Button>
      <LinkModal
        open={link !== null}
        onClose={() => setLink(null)}
        title="Password reset link"
        description="Share this link with them — it expires in 24 hours:"
        link={link}
      />
    </>
  );
}
