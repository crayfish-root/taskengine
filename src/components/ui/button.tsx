import { cn } from "@/lib/utils";
import Link from "next/link";
import { ButtonHTMLAttributes, forwardRef } from "react";

const base =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] text-[13px] font-medium transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] active:scale-[0.98]";

const variants = {
  primary: "bg-accent text-white shadow-sm hover:bg-accent-hover",
  secondary:
    "bg-surface text-foreground border border-border hover:bg-black/[0.03] dark:hover:bg-white/[0.06] shadow-xs",
  ghost: "text-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.07]",
  danger: "bg-danger text-white hover:brightness-95 shadow-sm",
  outline: "border border-border text-foreground hover:bg-black/[0.03] dark:hover:bg-white/[0.06]",
};

const sizes = {
  sm: "h-7 px-2.5",
  md: "h-9 px-3.5",
  lg: "h-11 px-5 text-[14px]",
  icon: "h-9 w-9",
};

type Variant = keyof typeof variants;
type Size = keyof typeof sizes;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "secondary", size = "md", ...props }, ref) => (
    <button ref={ref} className={cn(base, variants[variant], sizes[size], className)} {...props} />
  )
);
Button.displayName = "Button";

export function ButtonLink({
  href,
  className,
  variant = "secondary",
  size = "md",
  children,
}: {
  href: string;
  className?: string;
  variant?: Variant;
  size?: Size;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={cn(base, variants[variant], sizes[size], className)}>
      {children}
    </Link>
  );
}
