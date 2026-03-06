"use client";

import { Button } from "@/components/ui/button";
import { toggleListingActive } from "@/lib/actions/listings";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ToggleActiveButton({
  id,
  isActive,
}: {
  id: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);
    await toggleListingActive(id, !isActive);
    router.refresh();
    setLoading(false);
  }

  return (
    <Button
      variant="outline"
      onClick={handleToggle}
      disabled={loading}
    >
      {loading
        ? "..."
        : isActive
          ? "Deactivate"
          : "Activate"}
    </Button>
  );
}
