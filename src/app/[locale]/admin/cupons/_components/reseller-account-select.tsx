"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { Loader2, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type ResellerAccount = {
  id: string; // reseller.user_id (Clerk ID)
  email: string | null;
  displayName: string;
  username: string | null;
};

type Props = {
  value: string;
  onChange: (nextValue: string) => void;
  legacyName?: string | null;
  legacyEmail?: string | null;
};

export function ResellerAccountSelect({
  value,
  onChange,
  legacyName,
  legacyEmail,
}: Props) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<ResellerAccount[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch missing specific reseller if editing an existing coupon (may be inactive)
  useEffect(() => {
    if (!value) return;
    if (accounts.some((a) => a.id === value)) return;

    let mounted = true;
    // Load all active resellers and check; fall back to legacy name if not found
    fetch(`/api/admin/resellers?status=active`)
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error();
      })
      .then((data: { user_id: string; display_name: string; email: string }[]) => {
        if (!mounted) return;
        const found = data.find((r) => r.user_id === value);
        if (found) {
          setAccounts((prev) => {
            if (prev.some((a) => a.id === value)) return prev;
            return [{ id: found.user_id, displayName: found.display_name, email: found.email, username: null }, ...prev];
          });
        }
      })
      .catch(() => {});

    return () => { mounted = false; };
  }, [value, accounts]);

  // Fetch active resellers for search
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ status: "active" });
        if (query.trim()) params.set("q", query.trim());

        const res = await fetch(`/api/admin/resellers?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data: { user_id: string; display_name: string; email: string }[] = await res.json();
        const mapped: ResellerAccount[] = data.map((r) => ({
          id: r.user_id,
          displayName: r.display_name,
          email: r.email || null,
          username: null,
        }));
        setAccounts((prev) => {
          const selected = prev.find((a) => a.id === value);
          if (selected && !mapped.some((a) => a.id === value)) {
            return [selected, ...mapped];
          }
          return mapped;
        });
      } catch {
        toast.error("Não foi possível carregar as contas.");
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [query, value]);

  const selectedAccount = useMemo(
    () =>
      accounts.find((account) => account.id === value) ??
      (value
        ? {
            id: value,
            displayName: "Carregando...",
            email: null,
            username: null,
          }
        : null),
    [accounts, value]
  );

  return (
    <div className="space-y-2 flex flex-col" ref={containerRef}>
      <Label>Conta do Revendedor</Label>

      {value ? (
        <div className="flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors">
          <div className="flex flex-col">
            <span className="font-medium">{selectedAccount?.displayName}</span>
            <span className="text-xs text-muted-foreground">
              {selectedAccount?.email ??
                selectedAccount?.username ??
                selectedAccount?.id}
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-foreground"
            onClick={() => {
              onChange("");
              setQuery("");
              setIsOpen(true);
            }}
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              placeholder="Buscar por email ou usuário..."
              className="pl-9"
            />
            {loading && (
              <Loader2 className="absolute right-2.5 top-2.5 size-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {isOpen && (query.trim() || accounts.length > 0) && (
            <div className="absolute top-full z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md outline-none">
              {accounts.length === 0 && !loading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Nenhuma conta encontrada.
                </div>
              ) : (
                <div className="p-1 flex flex-col gap-1">
                  {accounts.map((account) => (
                    <button
                      type="button"
                      key={account.id}
                      className="relative flex w-full cursor-pointer select-none flex-col rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground text-left"
                      onClick={() => {
                        onChange(account.id);
                        setIsOpen(false);
                        setQuery("");
                      }}
                    >
                      <span className="font-medium">{account.displayName}</span>
                      <span className="text-xs text-muted-foreground">
                        {account.email ?? account.username ?? account.id}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!value && (legacyName || legacyEmail) && (
        <p className="text-xs text-muted-foreground">
          Cupom legado: {legacyName ?? "Sem nome"}
          {legacyEmail ? ` (${legacyEmail})` : ""}. Selecione uma conta para vincular.
        </p>
      )}
    </div>
  );
}
