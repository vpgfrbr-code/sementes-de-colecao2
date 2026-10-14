"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import {
  Check,
  ChevronRight,
  Loader2,
  Search,
  Trash2,
  UserCheck,
  UserMinus,
  Users,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { runMutation } from "@/lib/admin-mutation";
import { PayCommissionButton } from "../_components/commissions/pay-commission-button";
import { AdminEmptyState } from "../_components/ui/admin-empty-state";
import { AdminErrorState } from "../_components/ui/admin-error-state";
import { ListPageSkeleton } from "../_components/ui/admin-skeletons";
import { PullToRefresh } from "../_components/ui/pull-to-refresh";
import { ResponsiveOverlay } from "../_components/ui/responsive-overlay";

interface Reseller {
  id: string;
  user_id: string;
  display_name: string;
  email: string;
  status: "pending" | "active" | "inactive";
  notes: string;
  created_at: string;
  activated_at: string | null;
}

type ClerkUser = {
  id: string;
  displayName: string;
  email: string | null;
  username: string | null;
};

const STATUS_LABELS: Record<Reseller["status"], string> = {
  pending: "Pendente",
  active: "Ativo",
  inactive: "Inativo",
};

const STATUS_VARIANT: Record<Reseller["status"], "outline" | "default" | "secondary"> = {
  pending: "outline",
  active: "default",
  inactive: "secondary",
};

export default function AdminResellersPage() {
  const locale = useLocale();
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [deletingReseller, setDeletingReseller] = useState<Reseller | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ClerkUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchResellers();
  }, []);

  async function fetchResellers(opts: { silent?: boolean } = {}) {
    if (!opts.silent) setLoading(true);
    setLoadError(false);
    try {
      const res = await fetch("/api/admin/resellers");
      if (!res.ok) throw new Error("fetch failed");
      setResellers(await res.json());
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  // Search Clerk users for adding new resellers
  useEffect(() => {
    if (!addOpen) return;
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const params = new URLSearchParams();
        if (searchQuery.trim()) params.set("q", searchQuery.trim());
        params.set("limit", "20");
        const res = await fetch(`/api/admin/users?${params}`, { signal: controller.signal });
        if (res.ok) setSearchResults(await res.json());
      } catch {
        // busca abortada/atrasada — sem feedback necessário
      } finally {
        setSearchLoading(false);
      }
    }, 250);
    return () => { controller.abort(); clearTimeout(timeout); };
  }, [searchQuery, addOpen]);

  async function addReseller(user: ClerkUser) {
    setAdding(true);
    const { ok } = await runMutation({
      url: "/api/admin/resellers",
      method: "POST",
      body: {
        user_id: user.id,
        display_name: user.displayName,
        email: user.email ?? "",
      },
      successMessage: `${user.displayName} adicionado como revendedor`,
      errorMessage: "Falha ao adicionar o revendedor.",
    });
    if (ok) {
      setAddOpen(false);
      setSearchQuery("");
      await fetchResellers({ silent: true });
    }
    setAdding(false);
  }

  async function updateStatus(reseller: Reseller, status: Reseller["status"]) {
    await runMutation({
      url: `/api/admin/resellers/${reseller.id}`,
      method: "PUT",
      body: { status },
      successMessage:
        status === "active" ? "Revendedor ativado" : "Revendedor desativado",
      errorMessage: "Falha ao atualizar o status.",
      optimistic: () =>
        setResellers((prev) =>
          prev.map((r) =>
            r.id === reseller.id
              ? {
                  ...r,
                  status,
                  activated_at:
                    status === "active"
                      ? new Date().toISOString()
                      : r.activated_at,
                }
              : r
          )
        ),
      rollback: () =>
        setResellers((prev) =>
          prev.map((r) => (r.id === reseller.id ? reseller : r))
        ),
    });
  }

  async function confirmDelete() {
    if (!deletingReseller) return;
    setDeleting(true);
    await runMutation({
      url: `/api/admin/resellers/${deletingReseller.id}`,
      method: "DELETE",
      successMessage: "Revendedor removido",
      errorMessage: "Falha ao remover o revendedor.",
      onSuccess: () =>
        setResellers((prev) =>
          prev.filter((r) => r.id !== deletingReseller.id)
        ),
    });
    setDeleting(false);
    setDeletingReseller(null);
  }

  if (loading) {
    return <ListPageSkeleton variant="table" count={5} />;
  }

  if (loadError) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Revendedores</h1>
        <AdminErrorState
          message="Não foi possível carregar os revendedores."
          onRetry={() => fetchResellers()}
        />
      </div>
    );
  }

  // Filter already-added resellers from clerk search
  const existingUserIds = new Set(resellers.map((r) => r.user_id));

  return (
    <PullToRefresh onRefresh={() => fetchResellers({ silent: true })}>
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">Revendedores</h1>
          <p className="text-muted-foreground text-sm">
            {resellers.length} revendedor{resellers.length !== 1 ? "es" : ""}
          </p>
        </div>
        <Button
          className="h-11 shrink-0 md:h-10"
          onClick={() => { setSearchQuery(""); setAddOpen(true); }}
        >
          <Users className="mr-2 size-4" />
          Adicionar
        </Button>
      </div>

      {resellers.length === 0 ? (
        <AdminEmptyState
          icon={Users}
          title="Nenhum revendedor cadastrado"
          description="Adicione usuários como revendedores para atribuir cupons e comissões."
        />
      ) : (
        <div className="space-y-3">
          {resellers.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <Link
                  href={`/${locale}/admin/revendedores/${r.id}`}
                  className="flex min-w-0 items-center gap-3"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground/60">
                    <Users className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{r.display_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{r.email}</p>
                  </div>
                </Link>

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={STATUS_VARIANT[r.status]}>
                    {STATUS_LABELS[r.status]}
                  </Badge>
                  {r.status === "active" && (
                    <PayCommissionButton
                      resellerName={r.display_name}
                      resellerUserId={r.user_id}
                    />
                  )}
                  {r.status !== "active" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="size-11 p-0 md:size-9"
                      aria-label={`Ativar ${r.display_name}`}
                      onClick={() => updateStatus(r, "active")}
                    >
                      <UserCheck className="size-4 text-green-600" />
                    </Button>
                  )}
                  {r.status === "active" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="size-11 p-0 md:size-9"
                      aria-label={`Desativar ${r.display_name}`}
                      onClick={() => updateStatus(r, "inactive")}
                    >
                      <UserMinus className="size-4 text-amber-600" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="size-11 p-0 md:size-9"
                    aria-label={`Remover ${r.display_name}`}
                    onClick={() => setDeletingReseller(r)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="size-11 p-0 md:size-9"
                    aria-label={`Ver detalhe de ${r.display_name}`}
                    asChild
                  >
                    <Link href={`/${locale}/admin/revendedores/${r.id}`}>
                      <ChevronRight className="size-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add reseller — bottom sheet no mobile */}
      <ResponsiveOverlay
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Adicionar Revendedor"
        description="Busque um usuário cadastrado. Novos revendedores ficam com status Pendente até você ativar."
        dialogClassName="sm:max-w-md"
      >
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por email ou nome..."
              className="h-11 pl-9 pr-10 md:h-10"
              autoFocus
            />
            {searchQuery && (
              <button
                aria-label="Limpar busca"
                className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                onClick={() => setSearchQuery("")}
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto">
            {searchLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : searchResults.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {searchQuery ? "Nenhum usuário encontrado" : "Digite para buscar usuários"}
              </p>
            ) : (
              <div className="divide-y">
                {searchResults.map((user) => {
                  const alreadyAdded = existingUserIds.has(user.id);
                  return (
                    <div
                      key={user.id}
                      className="flex items-center justify-between px-1 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{user.displayName}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                      {alreadyAdded ? (
                        <Badge variant="secondary" className="shrink-0 ml-2 gap-1">
                          <Check className="size-3" />
                          Já adicionado
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          disabled={adding}
                          className="ml-2 h-10 shrink-0 md:h-9"
                          onClick={() => addReseller(user)}
                        >
                          Adicionar
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </ResponsiveOverlay>

      {/* Delete confirmation */}
      <ResponsiveOverlay
        open={!!deletingReseller}
        onOpenChange={(open) => !open && setDeletingReseller(null)}
        title="Remover Revendedor"
        description={
          deletingReseller
            ? `Remover ${deletingReseller.display_name}? Cupons já criados com este revendedor não serão afetados.`
            : undefined
        }
        footer={
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="h-11 sm:h-10"
              onClick={() => setDeletingReseller(null)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="h-11 gap-2 sm:h-10"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Remover
            </Button>
          </div>
        }
      >
        <span className="sr-only">Confirmação de remoção</span>
      </ResponsiveOverlay>
    </div>
    </PullToRefresh>
  );
}
