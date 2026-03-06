"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";

export function ToastHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const message = searchParams.get("toast");
    const error = searchParams.get("error");

    if (message) {
      toast.success(message);
      // Remove toast param from URL without triggering navigation
      const params = new URLSearchParams(searchParams.toString());
      params.delete("toast");
      const newUrl = params.toString()
        ? `${pathname}?${params.toString()}`
        : pathname;
      router.replace(newUrl, { scroll: false });
    }

    if (error) {
      toast.error(error);
      const params = new URLSearchParams(searchParams.toString());
      params.delete("error");
      const newUrl = params.toString()
        ? `${pathname}?${params.toString()}`
        : pathname;
      router.replace(newUrl, { scroll: false });
    }
  }, [searchParams, router, pathname]);

  return null;
}
