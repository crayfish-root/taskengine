"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { relativeTime } from "@/lib/utils";

export interface CommentRow {
  id: string;
  body: string;
  createdAt: string | Date;
  author: { id: string; name: string; avatarColor: string; avatarEmoji: string | null };
}

export function CommentsSection({
  taskId,
  comments,
  currentUser,
}: {
  taskId: string;
  comments: CommentRow[];
  currentUser: { name: string; avatarColor: string; avatarEmoji: string | null };
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!body.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/tasks/${taskId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: body.trim() }),
    });
    setSaving(false);
    if (res.ok) {
      setBody("");
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2.5">
        <Avatar name={currentUser.name} color={currentUser.avatarColor} emoji={currentUser.avatarEmoji} size="sm" />
        <div className="flex-1 space-y-2">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add a comment…"
            rows={2}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
            }}
          />
          <div className="flex justify-end">
            <Button size="sm" variant="primary" disabled={!body.trim() || saving} onClick={submit}>
              {saving ? "Posting…" : "Comment"}
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {comments.length === 0 && <p className="text-[13px] text-muted">No comments yet.</p>}
        {comments.map((c) => (
          <div key={c.id} className="flex gap-2.5">
            <Avatar name={c.author.name} color={c.author.avatarColor} emoji={c.author.avatarEmoji} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <p className="text-[13px] font-medium">{c.author.name}</p>
                <p className="text-[11px] text-muted-2">{relativeTime(c.createdAt)}</p>
              </div>
              <p className="mt-0.5 whitespace-pre-wrap text-[13px] text-foreground/90">{c.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
