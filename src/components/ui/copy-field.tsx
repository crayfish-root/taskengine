"use client";

import { useState } from "react";
import { Button } from "./button";
import { Copy, Check } from "lucide-react";

export function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="flex items-center gap-2 rounded-[10px] border border-border bg-black/[0.02] dark:bg-white/[0.03] p-2.5">
      <p className="min-w-0 flex-1 truncate font-mono text-[12px] text-foreground">{value}</p>
      <Button type="button" variant="secondary" size="sm" onClick={copy}>
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}
