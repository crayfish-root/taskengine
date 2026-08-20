"use client";

import { Avatar } from "@/components/ui/avatar";
import { DropdownMenu, MenuItem } from "@/components/ui/dropdown-menu";
import { LogOut, User as UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function UserMenu({
  user,
}: {
  user: { id: string; name: string; email: string; avatarColor: string; avatarEmoji: string | null };
}) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <DropdownMenu
      align="end"
      trigger={
        <button className="rounded-full">
          <Avatar name={user.name} color={user.avatarColor} emoji={user.avatarEmoji} size="sm" />
        </button>
      }
    >
      {(close) => (
        <>
          <div className="px-2.5 py-2 border-b border-border-soft mb-1">
            <p className="text-[13px] font-medium">{user.name}</p>
            <p className="text-[12px] text-muted">{user.email}</p>
          </div>
          <Link href={`/org/users/${user.id}`} onClick={close}>
            <MenuItem>
              <UserIcon className="h-3.5 w-3.5" /> My Profile
            </MenuItem>
          </Link>
          <MenuItem danger onClick={logout}>
            <LogOut className="h-3.5 w-3.5" /> Sign Out
          </MenuItem>
        </>
      )}
    </DropdownMenu>
  );
}
