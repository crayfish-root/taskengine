import { cn, initials } from "@/lib/utils";

const sizes = {
  xs: "h-5 w-5 text-[9px]",
  sm: "h-7 w-7 text-[11px]",
  md: "h-9 w-9 text-[13px]",
  lg: "h-12 w-12 text-[16px]",
  xl: "h-16 w-16 text-[22px]",
};

export function Avatar({
  name,
  color = "#6366f1",
  emoji,
  size = "md",
  className,
  ring,
}: {
  name: string;
  color?: string | null;
  emoji?: string | null;
  size?: keyof typeof sizes;
  className?: string;
  ring?: boolean;
}) {
  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white select-none",
        sizes[size],
        ring && "ring-2 ring-surface",
        className
      )}
      style={{ backgroundColor: color || "#6366f1" }}
      title={name}
    >
      {emoji ?? initials(name)}
    </div>
  );
}

export function AvatarStack({
  users,
  max = 4,
  size = "sm",
}: {
  users: { id: string; name: string; avatarColor?: string | null; avatarEmoji?: string | null }[];
  max?: number;
  size?: keyof typeof sizes;
}) {
  const shown = users.slice(0, max);
  const rest = users.length - shown.length;
  return (
    <div className="flex -space-x-2">
      {shown.map((u) => (
        <Avatar key={u.id} name={u.name} color={u.avatarColor} emoji={u.avatarEmoji} size={size} ring />
      ))}
      {rest > 0 && (
        <div
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-full bg-black/[0.06] dark:bg-white/[0.12] font-semibold text-foreground ring-2 ring-surface",
            sizes[size]
          )}
        >
          +{rest}
        </div>
      )}
    </div>
  );
}
