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
import { deleteProperty } from "@/lib/actions/properties";

export function DeletePropertyButton({
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
          <DialogTitle>Delete Property</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{name}</strong>? This will
            also delete all associated units, leases, and transactions. This
            action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <form action={() => deleteProperty(id)}>
            <Button type="submit" variant="destructive">
              Delete Property
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
