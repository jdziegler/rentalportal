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
import { deleteLease } from "@/lib/actions/leases";

export function DeleteLeaseButton({
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
          <DialogTitle>Delete Lease</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{name}</strong>? This will
            also remove any associated transaction links. This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <form action={() => deleteLease(id)}>
            <Button type="submit" variant="destructive">
              Delete Lease
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
