"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { deleteUnit } from "@/lib/actions/units";

export function DeleteUnitButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">Delete</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Unit</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{name}</strong>? This will
            also delete all associated leases and transactions. This action
            cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <form action={() => deleteUnit(id)}>
            <Button type="submit" variant="destructive">
              Delete Unit
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
