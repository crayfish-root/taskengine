"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddTaskModal } from "./add-task-modal";
import { PickablePerson } from "./people-picker";

export function NewTaskButton({ people }: { people: PickablePerson[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> New task
      </Button>
      <AddTaskModal open={open} onClose={() => setOpen(false)} people={people} />
    </>
  );
}
