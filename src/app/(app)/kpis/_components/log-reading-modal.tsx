"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label, FieldGroup } from "@/components/ui/input";
import { PlusCircle } from "lucide-react";

export function LogReadingButton({
  kpiId,
  unit,
  trigger,
}: {
  kpiId: string;
  unit: string;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [periodEnd, setPeriodEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/kpis/${kpiId}/records`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: Number(value), periodEnd, note: note || undefined }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not save reading");
      return;
    }
    setOpen(false);
    setValue("");
    setNote("");
    router.refresh();
  }

  return (
    <>
      <span onClick={() => setOpen(true)} className="contents">
        {trigger ?? (
          <Button type="button" variant="ghost" size="sm">
            <PlusCircle className="h-3.5 w-3.5" /> Log reading
          </Button>
        )}
      </span>
      <Modal open={open} onClose={() => setOpen(false)} title="Log a new reading" description="Adds a data point to this KPI's history.">
        <form onSubmit={submit} className="space-y-4">
          <FieldGroup>
            <Label htmlFor="value">Value{unit ? ` (${unit})` : ""}</Label>
            <Input id="value" type="number" step="any" required value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="periodEnd">As of</Label>
            <Input id="periodEnd" type="date" required value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="note">Note (optional)</Label>
            <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Any context for this reading" />
          </FieldGroup>
          {error && <p className="text-[12.5px] text-danger">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? "Saving…" : "Save reading"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
