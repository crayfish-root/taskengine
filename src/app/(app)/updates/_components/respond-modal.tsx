"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Textarea, Label, FieldGroup } from "@/components/ui/input";

export function RespondButton({ requestId, question }: { requestId: string; question: string }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/updates/${requestId}/responses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not send response");
      return;
    }
    setOpen(false);
    setMessage("");
    router.refresh();
  }

  return (
    <>
      <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
        Respond
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Respond" description={question}>
        <form onSubmit={submit} className="space-y-4">
          <FieldGroup>
            <Label htmlFor="message">Your update</Label>
            <Textarea id="message" required autoFocus value={message} onChange={(e) => setMessage(e.target.value)} className="min-h-[120px]" />
          </FieldGroup>
          {error && <p className="text-[12.5px] text-danger">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? "Sending…" : "Send response"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
