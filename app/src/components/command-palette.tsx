"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { globalSearch, type SearchResult } from "@/lib/actions/search";

const typeIcons: Record<string, string> = {
  property: "🏢",
  unit: "🚪",
  tenant: "👤",
  lease: "📄",
  transaction: "💰",
  maintenance: "🔧",
};

const typeLabels: Record<string, string> = {
  property: "Properties",
  unit: "Units",
  tenant: "Tenants",
  lease: "Leases",
  transaction: "Transactions",
  maintenance: "Maintenance",
};

const quickLinks = [
  { title: "Dashboard", href: "/dashboard" },
  { title: "Properties", href: "/properties" },
  { title: "Units", href: "/units" },
  { title: "Tenants", href: "/tenants" },
  { title: "Leases", href: "/leases" },
  { title: "Transactions", href: "/transactions" },
  { title: "Maintenance", href: "/maintenance" },
  { title: "Add Property", href: "/properties/new" },
  { title: "Add Unit", href: "/units/new" },
  { title: "Add Tenant", href: "/tenants/new" },
  { title: "Add Lease", href: "/leases/new" },
  { title: "Add Transaction", href: "/transactions/new" },
  { title: "New Maintenance Request", href: "/maintenance/new" },
  { title: "Account Settings", href: "/settings/account" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSearch = useCallback(
    (value: string) => {
      setQuery(value);
      if (value.length < 2) {
        setResults([]);
        return;
      }
      startTransition(async () => {
        const data = await globalSearch(value);
        setResults(data);
      });
    },
    []
  );

  const handleSelect = useCallback(
    (href: string) => {
      setOpen(false);
      setQuery("");
      setResults([]);
      router.push(href);
    },
    [router]
  );

  // Group results by type
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {});

  // Filter quick links by query
  const filteredQuickLinks =
    query.length > 0
      ? quickLinks.filter((l) =>
          l.title.toLowerCase().includes(query.toLowerCase())
        )
      : quickLinks;

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search properties, tenants, leases..."
        value={query}
        onValueChange={handleSearch}
      />
      <CommandList>
        <CommandEmpty>
          {isPending ? "Searching..." : "No results found."}
        </CommandEmpty>

        {Object.entries(grouped).map(([type, items]) => (
          <CommandGroup key={type} heading={typeLabels[type] || type}>
            {items.map((item) => (
              <CommandItem
                key={`${item.type}-${item.id}`}
                value={`${item.title} ${item.subtitle}`}
                onSelect={() => handleSelect(item.href)}
              >
                <span className="mr-2">{typeIcons[item.type]}</span>
                <div className="flex flex-col">
                  <span>{item.title}</span>
                  <span className="text-xs text-gray-500">{item.subtitle}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}

        {results.length === 0 && filteredQuickLinks.length > 0 && (
          <CommandGroup heading="Quick Links">
            {filteredQuickLinks.map((link) => (
              <CommandItem
                key={link.href}
                value={link.title}
                onSelect={() => handleSelect(link.href)}
              >
                {link.title}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
