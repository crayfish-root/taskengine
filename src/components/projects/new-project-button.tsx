"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateProjectModal } from "./create-project-modal";
import { PickablePerson } from "@/components/tasks/people-picker";

export function NewProjectButton({
  people,
  departments,
  teams,
  currentUser,
  canPickAnyOwner,
}: {
  people: PickablePerson[];
  departments: { id: string; name: string }[];
  teams: { id: string; name: string; departmentId: string | null }[];
  currentUser: { id: string; name: string };
  canPickAnyOwner: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> New project
      </Button>
      <CreateProjectModal
        open={open}
        onClose={() => setOpen(false)}
        people={people}
        departments={departments}
        teams={teams}
        currentUser={currentUser}
        canPickAnyOwner={canPickAnyOwner}
      />
    </>
  );
}
