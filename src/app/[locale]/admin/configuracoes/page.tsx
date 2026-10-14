"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  Plus,
  RefreshCw,
  Ticket,
  ToggleLeft,
  ToggleRight,
  Trash2,
  UserCheck,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { runMutation } from "@/lib/admin-mutation";
import { formatPrice } from "@/lib/format-price";
import { ExchangeRateSettings } from "@/components/admin/exchange-rate-settings";
import { BrandingSettings } from "@/components/admin/branding-settings";
import { StrainScienceCardSettings } from "@/components/admin/strain-science-card-settings";
import { AdminErrorState } from "../_components/ui/admin-error-state";
import { ResponsiveOverlay } from "../_components/ui/responsive-overlay";
import { SectionAnchorNav } from "../_components/ui/section-anchor-nav";

/**
 * Âncoras da navegação por seções — labels derivados dos títulos das
 * próprias seções (encurtados para caber nos chips).
 */
const SETTINGS_SECTIONS = [
  { id: "sec-cambio", label: "Câmbio USD → BRL" },
  { id: "sec-marca", label: "Marca / Branding" },
  { id: "sec-ciencia", label: "Ciência do Fenótipo" },
  { id: "sec-boas-vindas", label: "Cupom de boas-vindas" },
  { id: "sec-revendedor", label: "Revendedor padrão" },
  { id: "sec-promocional", label: "Código Promocional" },
];

interface ResellerOption {
  user_id: string;
  display_name: string;
  email: string;
  status: string;
}

interface DefaultResellerSetting {
  enabled: boolean;
  reseller_user_id: string | null;
  commission_percent: number;
}

interface WelcomeCouponPromoSetting {
  enabled: boolean;
  coupon_code: string;
  discount_percent: number;
}

interface CouponMember {
  id: string;
  code: string;
  type: string;
  value: number;
  active: boolean;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  total_sales_cents: number;
}

interface BalanceGroup {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
  members: CouponMember[];
}

interface AvailableCoupon {
  id: string;
  code: string;
  type: string;
  value: number;
  active: boolean;
}

export default function AdminConfiguracoesPage() {
  const [groups, setGroups] = useState<BalanceGroup[]>([]);
  const [allCoupons, setAllCoupons] = useState<AvailableCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);
  const [deletingGroup, setDeletingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [creating, setCreating] = useState(false);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [selectedCouponId, setSelectedCouponId] = useState("");

  const [resellers, setResellers] = useState<ResellerOption[]>([]);
  const [defaultSetting, setDefaultSetting] = useState<DefaultResellerSetting>({
    enabled: false,
    reseller_user_id: null,
    commission_percent: 25,
  });
  const [savingSetting, setSavingSetting] = useState(false);
  const [settingMessage, setSettingMessage] = useState<string | null>(null);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState<string | null>(null);

  const [welcomePromo, setWelcomePromo] = useState<WelcomeCouponPromoSetting>({
    enabled: false,
    coupon_code: "BEMVINDO10",
    discount_percent: 10,
  });
  const [savingWelcomePromo, setSavingWelcomePromo] = useState(false);
  const [welcomePromoMessage, setWelcomePromoMessage] = useState<string | null>(
    null
  );

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    setLoadError(false);
    try {
      const [groupsRes, couponsRes, resellersRes, settingRes, welcomePromoRes] = await Promise.all([
        fetch("/api/admin/balance-groups"),
        fetch("/api/admin/coupons"),
        fetch("/api/admin/resellers?status=active"),
        fetch("/api/admin/settings/default-reseller"),
        fetch("/api/admin/settings/welcome-coupon"),
      ]);
      if (groupsRes.ok) setGroups(await groupsRes.json());
      if (couponsRes.ok) setAllCoupons(await couponsRes.json());
      if (resellersRes.ok) setResellers(await resellersRes.json());
      if (settingRes.ok) {
        const s: DefaultResellerSetting = await settingRes.json();
        setDefaultSetting({
          enabled: !!s.enabled,
          reseller_user_id: s.reseller_user_id ?? null,
          commission_percent:
            typeof s.commission_percent === "number" ? s.commission_percent : 25,
        });
      }
      if (welcomePromoRes.ok) {
        const w: WelcomeCouponPromoSetting = await welcomePromoRes.json();
        setWelcomePromo({
          enabled: !!w.enabled,
          coupon_code:
            typeof w.coupon_code === "string" && w.coupon_code
              ? w.coupon_code
              : "BEMVINDO10",
          discount_percent:
            typeof w.discount_percent === "number" ? w.discount_percent : 10,
        });
      }
    } catch {
      // Sem dados não dá para editar com segurança — mostra erro com retry.
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  async function saveDefaultSetting() {
    if (defaultSetting.enabled && !defaultSetting.reseller_user_id) {
      setSettingMessage("Selecione um revendedor antes de ativar.");
      return;
    }
    setSavingSetting(true);
    setSettingMessage(null);
    try {
      const res = await fetch("/api/admin/settings/default-reseller", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(defaultSetting),
      });
      if (res.ok) {
        setSettingMessage("Configuração salva.");
      } else {
        const err = await res.json().catch(() => ({}));
        setSettingMessage(err.error ?? "Falha ao salvar.");
      }
    } catch {
      setSettingMessage("Falha ao salvar.");
    } finally {
      setSavingSetting(false);
    }
  }

  async function saveWelcomePromo() {
    const code = welcomePromo.coupon_code.trim().toUpperCase();
    if (!code) {
      setWelcomePromoMessage("Informe o código do cupom.");
      return;
    }
    if (
      !Number.isFinite(welcomePromo.discount_percent) ||
      welcomePromo.discount_percent < 1 ||
      welcomePromo.discount_percent > 100
    ) {
      setWelcomePromoMessage("Porcentagem deve estar entre 1 e 100.");
      return;
    }
    setSavingWelcomePromo(true);
    setWelcomePromoMessage(null);
    try {
      const res = await fetch("/api/admin/settings/welcome-coupon", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: welcomePromo.enabled,
          coupon_code: code,
          discount_percent: Math.round(welcomePromo.discount_percent),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.value) setWelcomePromo(data.value);
        setWelcomePromoMessage("Configuração salva.");
      } else {
        const err = await res.json().catch(() => ({}));
        setWelcomePromoMessage(err.error ?? "Falha ao salvar.");
      }
    } catch {
      setWelcomePromoMessage("Falha ao salvar.");
    } finally {
      setSavingWelcomePromo(false);
    }
  }

  async function runBackfill(dryRun: boolean) {
    if (!defaultSetting.reseller_user_id) {
      setBackfillResult("Selecione e salve um revendedor antes.");
      return;
    }
    setBackfilling(true);
    setBackfillResult(null);
    try {
      const res = await fetch(
        "/api/admin/settings/default-reseller/backfill",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reseller_user_id: defaultSetting.reseller_user_id,
            commission_percent: defaultSetting.commission_percent,
            dry_run: dryRun,
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const n = dryRun ? data.eligible_orders : data.updated_orders;
        setBackfillResult(
          dryRun
            ? `${n ?? 0} pedidos elegíveis para backfill.`
            : `${n ?? 0} pedidos atribuídos.`
        );
      } else {
        const err = await res.json().catch(() => ({}));
        setBackfillResult(err.error ?? "Falha no backfill.");
      }
    } catch {
      setBackfillResult("Falha no backfill.");
    } finally {
      setBackfilling(false);
    }
  }

  async function createGroup() {
    if (!newGroupName.trim()) return;
    setCreating(true);
    await runMutation<BalanceGroup>({
      url: "/api/admin/balance-groups",
      body: { name: newGroupName.trim() },
      successMessage: "Grupo criado",
      errorMessage: "Falha ao criar o grupo.",
      onSuccess: (group) => {
        setGroups((prev) => [{ ...group, members: [] }, ...prev]);
        setNewGroupName("");
      },
    });
    setCreating(false);
  }

  async function toggleGroupActive(group: BalanceGroup) {
    const next = !group.active;
    await runMutation({
      url: `/api/admin/balance-groups/${group.id}`,
      method: "PUT",
      body: { active: next },
      successMessage: next ? "Grupo ativado" : "Grupo desativado",
      errorMessage: "Falha ao atualizar o grupo.",
      optimistic: () =>
        setGroups((prev) =>
          prev.map((g) => (g.id === group.id ? { ...g, active: next } : g))
        ),
      rollback: () =>
        setGroups((prev) =>
          prev.map((g) =>
            g.id === group.id ? { ...g, active: group.active } : g
          )
        ),
    });
  }

  async function deleteGroup(groupId: string) {
    setDeletingGroup(true);
    await runMutation({
      url: `/api/admin/balance-groups/${groupId}`,
      method: "DELETE",
      successMessage: "Grupo excluído",
      errorMessage: "Falha ao excluir o grupo.",
      onSuccess: () =>
        setGroups((prev) => prev.filter((g) => g.id !== groupId)),
    });
    setDeletingGroup(false);
    setDeleteGroupId(null);
  }

  async function addMember(groupId: string) {
    if (!selectedCouponId) return;
    const result = await runMutation({
      url: `/api/admin/balance-groups/${groupId}/members`,
      body: { couponId: selectedCouponId },
      successMessage: "Cupom adicionado",
      errorMessage: "Erro ao adicionar cupom",
    });
    if (result.ok) {
      setSelectedCouponId("");
      setAddingTo(null);
      await fetchData();
    }
  }

  async function removeMember(groupId: string, couponId: string) {
    const previous = groups;
    await runMutation({
      url: `/api/admin/balance-groups/${groupId}/members?couponId=${couponId}`,
      method: "DELETE",
      successMessage: "Cupom removido",
      errorMessage: "Falha ao remover o cupom.",
      optimistic: () =>
        setGroups((prev) =>
          prev.map((g) =>
            g.id === groupId
              ? { ...g, members: g.members.filter((m) => m.id !== couponId) }
              : g
          )
        ),
      rollback: () => setGroups(previous),
    });
  }

  function getAvailableCoupons(group: BalanceGroup) {
    const memberIds = new Set(group.members.map((m) => m.id));
    const firstMember = group.members[0];

    return allCoupons.filter((c) => {
      if (memberIds.has(c.id)) return false;
      if (firstMember) {
        return c.type === firstMember.type && c.value === firstMember.value;
      }
      return true;
    });
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Configurações
          </h1>
          <p className="text-sm text-muted-foreground">Apenas superadmin</p>
        </div>
        <AdminErrorState
          message="Não foi possível carregar as configurações."
          onRetry={fetchData}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Configurações
          </h1>
          <p className="text-sm text-muted-foreground">
            Apenas superadmin
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-11 md:h-8"
          onClick={fetchData}
        >
          <RefreshCw className="mr-1.5 size-3.5" />
          Atualizar
        </Button>
      </div>

      {/* Chips sticky de navegação entre as seções da página */}
      <SectionAnchorNav sections={SETTINGS_SECTIONS} />

      <section id="sec-cambio" className="scroll-mt-32">
        <ExchangeRateSettings />
      </section>

      <section id="sec-marca" className="scroll-mt-32">
        <BrandingSettings />
      </section>

      <section id="sec-ciencia" className="scroll-mt-32">
        <StrainScienceCardSettings />
      </section>

      <section id="sec-boas-vindas" className="scroll-mt-32 space-y-4">
        <h2 className="font-display text-lg font-semibold tracking-tight">
          Cupom de boas-vindas (banner e modal)
        </h2>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Ticket className="size-4" />
              <span className="font-mono text-sm font-bold">
                Promoção exibida no rodapé e no exit-intent
              </span>
              <Badge
                variant={welcomePromo.enabled ? "default" : "outline"}
                className="text-xs"
              >
                {welcomePromo.enabled ? "Ativo" : "Inativo"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Quando desativado, a barra inferior e o modal de exit-intent
              não aparecem para visitantes. O cupom em si continua válido se
              o cliente digitá-lo no checkout — gerencie o cupom em{" "}
              <strong>Cupons</strong>.
            </p>

            <div className="grid gap-4 sm:grid-cols-[1fr_160px_auto]">
              <div className="space-y-2">
                <Label className="text-sm">Código do cupom</Label>
                <Input
                  value={welcomePromo.coupon_code}
                  onChange={(e) =>
                    setWelcomePromo((s) => ({
                      ...s,
                      coupon_code: e.target.value.toUpperCase().slice(0, 32),
                    }))
                  }
                  placeholder="BEMVINDO10"
                  className="h-11 font-mono uppercase md:h-9"
                  maxLength={32}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Desconto (%)</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  step={1}
                  value={welcomePromo.discount_percent}
                  onChange={(e) =>
                    setWelcomePromo((s) => ({
                      ...s,
                      discount_percent: Number(e.target.value),
                    }))
                  }
                  className="h-11 font-mono md:h-9"
                />
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setWelcomePromo((s) => ({ ...s, enabled: !s.enabled }))
                  }
                  className="h-11 w-full sm:w-auto md:h-8"
                >
                  {welcomePromo.enabled ? (
                    <>
                      <ToggleRight className="mr-1.5 size-4" />
                      Ativo
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="mr-1.5 size-4" />
                      Inativo
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                className="h-11 md:h-8"
                onClick={saveWelcomePromo}
                disabled={savingWelcomePromo}
              >
                {savingWelcomePromo && (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                )}
                Salvar configuração
              </Button>
              {welcomePromoMessage && (
                <span className="text-xs text-muted-foreground">
                  {welcomePromoMessage}
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Atenção: o código informado aqui deve existir e estar ativo na
              tabela de cupons para que o checkout aplique o desconto.
            </p>
          </CardContent>
        </Card>
      </section>

      <section id="sec-revendedor" className="scroll-mt-32 space-y-4">
        <h2 className="font-display text-lg font-semibold tracking-tight">
          Atribuição padrão de revendedor (pedidos sem cupom)
        </h2>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <UserCheck className="size-4" />
              <span className="font-mono text-sm font-bold">
                Redirecionar comissão de vendas sem cupom
              </span>
              <Badge
                variant={defaultSetting.enabled ? "default" : "outline"}
                className="text-xs"
              >
                {defaultSetting.enabled ? "Ativo" : "Inativo"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Quando ativo, todo pedido fechado sem cupom é atribuído ao
              revendedor abaixo para fins de comissão. O preço do cliente
              não muda. A porcentagem é congelada em cada pedido.
            </p>

            <div className="grid gap-4 sm:grid-cols-[1fr_160px_auto]">
              <div className="space-y-2">
                <Label className="text-sm">Revendedor</Label>
                <Select
                  value={defaultSetting.reseller_user_id ?? ""}
                  onValueChange={(v) =>
                    setDefaultSetting((s) => ({ ...s, reseller_user_id: v }))
                  }
                >
                  <SelectTrigger className="max-md:min-h-11">
                    <SelectValue placeholder="Selecionar revendedor ativo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {resellers.length === 0 ? (
                      <SelectItem value="__none" disabled>
                        Nenhum revendedor ativo
                      </SelectItem>
                    ) : (
                      resellers.map((r) => (
                        <SelectItem key={r.user_id} value={r.user_id}>
                          {r.display_name}
                          {r.email ? ` — ${r.email}` : ""}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Comissão (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={defaultSetting.commission_percent}
                  onChange={(e) =>
                    setDefaultSetting((s) => ({
                      ...s,
                      commission_percent: Number(e.target.value),
                    }))
                  }
                  className="h-11 font-mono md:h-9"
                />
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setDefaultSetting((s) => ({ ...s, enabled: !s.enabled }))
                  }
                  className="h-11 w-full sm:w-auto md:h-8"
                >
                  {defaultSetting.enabled ? (
                    <>
                      <ToggleRight className="mr-1.5 size-4" />
                      Ativo
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="mr-1.5 size-4" />
                      Inativo
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                className="h-11 md:h-8"
                onClick={saveDefaultSetting}
                disabled={savingSetting}
              >
                {savingSetting && (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                )}
                Salvar configuração
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-11 md:h-8"
                onClick={() => runBackfill(true)}
                disabled={backfilling || !defaultSetting.reseller_user_id}
              >
                Simular backfill
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-11 md:h-8"
                onClick={() => runBackfill(false)}
                disabled={backfilling || !defaultSetting.reseller_user_id}
              >
                {backfilling && (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                )}
                Aplicar a pedidos antigos
              </Button>
              {settingMessage && (
                <span className="text-xs text-muted-foreground">
                  {settingMessage}
                </span>
              )}
              {backfillResult && (
                <span className="text-xs text-muted-foreground">
                  {backfillResult}
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Backfill só atinge pedidos sem cupom e sem atribuição manual
              prévia (cancelados são ignorados).
            </p>
          </CardContent>
        </Card>
      </section>

      <section id="sec-promocional" className="scroll-mt-32 space-y-4">
        <h2 className="font-display text-lg font-semibold tracking-tight">
          Código Promocional Superadmin
        </h2>

        {/* Create new group */}
        <Card>
          <CardContent className="flex flex-col gap-3 pt-4 md:flex-row md:items-center">
            <Input
              placeholder="Nome do grupo (ex: Revendedores 20%)"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createGroup()}
              className="h-11 md:h-9 md:flex-1"
            />
            <Button
              className="h-11 w-full md:h-9 md:w-auto"
              onClick={createGroup}
              disabled={creating || !newGroupName.trim()}
            >
              {creating ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <Plus className="mr-1.5 size-3.5" />
              )}
              Criar Grupo
            </Button>
          </CardContent>
        </Card>

        {/* Groups list */}
        {groups.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhum grupo criado.
          </p>
        )}

        {groups.map((group) => {
          const available = getAvailableCoupons(group);
          const totalSales = group.members.reduce(
            (sum, m) => sum + m.total_sales_cents,
            0
          );

          return (
            <Card key={group.id}>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-mono text-sm font-bold">{group.name}</h3>
                  <Badge
                    variant={group.active ? "default" : "outline"}
                    className="text-xs"
                  >
                    {group.active ? "Ativo" : "Inativo"}
                  </Badge>
                  {group.members.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      Total: {formatPrice(totalSales, "pt")}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-11 md:size-8"
                    title={group.active ? "Desativar" : "Ativar"}
                    aria-label={group.active ? "Desativar grupo" : "Ativar grupo"}
                    onClick={() => toggleGroupActive(group)}
                  >
                    {group.active ? (
                      <ToggleRight className="size-4" />
                    ) : (
                      <ToggleLeft className="size-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-11 md:size-8"
                    title="Excluir grupo"
                    aria-label="Excluir grupo"
                    onClick={() => setDeleteGroupId(group.id)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Members table */}
                {group.members.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Nenhum cupom neste grupo. Adicione cupons com o mesmo tipo e
                    valor de desconto.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="pb-2 pr-3 font-medium">Código</th>
                          <th className="pb-2 pr-3 font-medium">Desconto</th>
                          <th className="pb-2 pr-3 text-right font-medium">
                            Vendas
                          </th>
                          <th className="pb-2 pr-3 text-right font-medium">
                            Status
                          </th>
                          <th className="pb-2 text-right font-medium" />
                        </tr>
                      </thead>
                      <tbody>
                        {group.members
                          .sort(
                            (a, b) =>
                              a.total_sales_cents - b.total_sales_cents
                          )
                          .map((member) => (
                            <tr
                              key={member.id}
                              className="border-b last:border-0"
                            >
                              <td className="py-2 pr-3 font-mono font-bold">
                                {member.code}
                              </td>
                              <td className="py-2 pr-3 font-mono">
                                {member.type === "percentage"
                                  ? `${member.value}%`
                                  : formatPrice(member.value, "pt")}
                              </td>
                              <td className="py-2 pr-3 text-right font-mono font-medium text-primary">
                                {formatPrice(member.total_sales_cents, "pt")}
                              </td>
                              <td className="py-2 pr-3 text-right">
                                <Badge
                                  variant={
                                    member.active ? "default" : "outline"
                                  }
                                  className="text-[10px]"
                                >
                                  {member.active ? "Ativo" : "Inativo"}
                                </Badge>
                              </td>
                              <td className="py-2 text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-11 md:size-6"
                                  title="Remover do grupo"
                                  aria-label="Remover do grupo"
                                  onClick={() =>
                                    removeMember(group.id, member.id)
                                  }
                                >
                                  <X className="size-3 text-destructive" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Add coupon */}
                {addingTo === group.id ? (
                  <div className="flex flex-col gap-2 md:flex-row md:items-center">
                    <select
                      value={selectedCouponId}
                      onChange={(e) => setSelectedCouponId(e.target.value)}
                      className="h-11 rounded-md border bg-background px-3 py-1.5 text-sm md:h-auto md:flex-1"
                    >
                      <option value="">Selecione um cupom...</option>
                      {available.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.code} ({c.type === "percentage" ? `${c.value}%` : formatPrice(c.value, "pt")})
                        </option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      className="h-11 md:h-8"
                      onClick={() => addMember(group.id)}
                      disabled={!selectedCouponId}
                    >
                      Adicionar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-11 md:h-8"
                      onClick={() => {
                        setAddingTo(null);
                        setSelectedCouponId("");
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-11 w-full md:h-8 md:w-auto"
                    onClick={() => setAddingTo(group.id)}
                    disabled={available.length === 0 && group.members.length > 0}
                  >
                    <Plus className="mr-1.5 size-3" />
                    Adicionar Cupom
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </section>
      <ResponsiveOverlay
        open={deleteGroupId !== null}
        onOpenChange={(open) => !open && setDeleteGroupId(null)}
        title="Excluir grupo"
        description="Os cupons do grupo não são excluídos — apenas deixam de compartilhar saldo."
        footer={
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="h-11 sm:h-10"
              onClick={() => setDeleteGroupId(null)}
              disabled={deletingGroup}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="h-11 sm:h-10"
              onClick={() => deleteGroupId && deleteGroup(deleteGroupId)}
              disabled={deletingGroup}
            >
              {deletingGroup ? "Excluindo…" : "Excluir grupo"}
            </Button>
          </div>
        }
      >
        <span className="sr-only">Confirmação de exclusão de grupo</span>
      </ResponsiveOverlay>
    </div>
  );
}
