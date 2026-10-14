"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  Loader2,
  Lock,
  Package,
  Search,
  Shield,
  Tag,
  Truck,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { SafeImage } from "@/components/safe-image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCartStore } from "@/store/cart";
import { useHydration } from "@/hooks/use-hydration";
import { formatCpf, isValidCpf } from "@/lib/cpf";
import { formatPrice } from "@/lib/format-price";
import { PriceDisplay } from "@/components/price-display";
import { useExchangeRate } from "@/lib/exchange-rate";
import { useLocale, useTranslations } from "next-intl";

const BRAZIL_STATES = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS",
  "MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC",
  "SP","SE","TO",
];

const STEP_KEYS = ["contact", "shipping", "review"] as const;

interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

export function CheckoutForm() {
  const locale = useLocale();
  const t = useTranslations("checkout");
  const ct = useTranslations("common");
  const router = useRouter();
  const { isSignedIn, isLoaded: isUserLoaded, user } = useUser();
  const hydrated = useHydration();
  const { rates } = useExchangeRate();
  const items = useCartStore((s) => s.items);
  const totalCents = useCartStore((s) => s.totalCents);
  const totalShippingCents = useCartStore((s) => s.totalShippingCents);
  const clearCart = useCartStore((s) => s.clearCart);
  const numberRef = useRef<HTMLInputElement>(null);
  const affiliateApplied = useRef(false);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveAddress, setSaveAddress] = useState(true);
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    couponId: string;
    code: string;
    type: string;
    value: number;
    discountCents: number;
  } | null>(null);

  const [form, setForm] = useState({
    email: user?.emailAddresses[0]?.emailAddress ?? "",
    name: user?.fullName ?? "",
    cpf: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    zip: "",
  });

  // Pre-fill from Clerk metadata
  const loadSavedAddress = useCallback(async () => {
    if (!isSignedIn) return;
    try {
      const res = await fetch("/api/user/address");
      if (res.ok) {
        const data = await res.json();
        if (data.address) {
          setForm((prev) => ({
            ...prev,
            street: data.address.street || prev.street,
            number: data.address.number || prev.number,
            complement: data.address.complement || prev.complement,
            neighborhood: data.address.neighborhood || prev.neighborhood,
            city: data.address.city || prev.city,
            state: data.address.state || prev.state,
            zip: data.address.zip || prev.zip,
          }));
        }
      }
    } catch {
      // silently fail
    }
  }, [isSignedIn]);

  useEffect(() => {
    loadSavedAddress();
  }, [loadSavedAddress]);

  // Hydrate form draft from localStorage on mount (survives page refresh).
  useEffect(() => {
    try {
      const saved = localStorage.getItem("checkout-form-draft");
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<typeof form>;
        setForm((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      // ignore malformed draft
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync email/name once Clerk finishes loading. Without this the email input
  // stays locked and empty on refresh because useUser() returns null on the
  // first render.
  useEffect(() => {
    if (!isUserLoaded || !isSignedIn || !user) return;
    setForm((prev) => ({
      ...prev,
      email: prev.email || user.emailAddresses[0]?.emailAddress || "",
      name: prev.name || user.fullName || "",
    }));
  }, [isUserLoaded, isSignedIn, user]);

  // Persist draft on every change so a refresh mid-checkout preserves state.
  useEffect(() => {
    try {
      localStorage.setItem("checkout-form-draft", JSON.stringify(form));
    } catch {
      // quota or privacy mode — non-fatal
    }
  }, [form]);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function maskEmail(email: string): string {
    const at = email.indexOf("@");
    if (at < 0) return email;
    const local = email.slice(0, at);
    const domain = email.slice(at);
    const visible = local.slice(0, Math.min(2, local.length));
    const stars = "*".repeat(Math.max(local.length - visible.length, 4));
    return `${visible}${stars}${domain}`;
  }

  // ViaCEP auto-fill
  async function lookupCep(cep: string) {
    const clean = cep.replace(/\D/g, "");
    if (clean.length !== 8) return;

    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      if (!res.ok) return;
      const data: ViaCepResponse = await res.json();
      if (data.erro) return;

      setForm((prev) => ({
        ...prev,
        street: data.logradouro || prev.street,
        neighborhood: data.bairro || prev.neighborhood,
        city: data.localidade || prev.city,
        state: data.uf || prev.state,
        zip: data.cep || prev.zip,
      }));

      // Gentle confirmation toast — only focus number field if it's still empty, without scroll jump.
      toast.success(t("cepAutoFilled"), { duration: 2500 });
      setTimeout(() => {
        const el = numberRef.current;
        if (el && !el.value) {
          el.focus({ preventScroll: true });
        }
      }, 150);
    } catch {
      // silently fail — user can fill manually
    } finally {
      setCepLoading(false);
    }
  }

  const subtotalCents = items.reduce(
    (sum, i) => sum + i.priceCents * i.quantity,
    0
  );
  const shippingCents = items.reduce(
    (max, i) => Math.max(max, i.shippingCents),
    0
  );

  async function applyCoupon(codeOverride?: string) {
    const code = (codeOverride ?? couponCode).trim();
    if (!code) return;
    setCouponLoading(true);
    setCouponError(null);

    try {
      const res = await fetch("/api/coupon/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          subtotalCents,
          shippingCents,
        }),
      });

      const data = await res.json();

      if (!data.valid) {
        const reasons: Record<string, string> = {
          not_found: t("couponNotFound"),
          expired: t("couponExpired"),
          max_uses_reached: t("couponMaxUses"),
          min_order_not_met: t("couponMinOrder"),
        };
        setCouponError(reasons[data.reason] ?? t("couponInvalid"));
        return;
      }

      setAppliedCoupon({
        couponId: data.couponId,
        code: code.toUpperCase(),
        type: data.type,
        value: data.value,
        discountCents: data.discountCents,
      });
      setCouponCode(code.toUpperCase());
      setCouponError(null);
    } catch {
      setCouponError(t("couponInvalid"));
    } finally {
      setCouponLoading(false);
    }
  }

  // Auto-apply affiliate coupon from cookie
  useEffect(() => {
    if (affiliateApplied.current || appliedCoupon || !hydrated || items.length === 0) return;
    const match = document.cookie.match(/(?:^|;\s*)affiliate_coupon=([^;]*)/);
    const raw = match?.[1];
    if (!raw) return;
    const code = decodeURIComponent(raw).trim();
    if (!code) return;
    affiliateApplied.current = true;
    setCouponCode(code);
    applyCoupon(code);
  }, [hydrated, items.length, appliedCoupon]); // eslint-disable-line react-hooks/exhaustive-deps

  function removeCoupon() {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError(null);
  }

  function canAdvance(): boolean {
    if (step === 1) {
      return form.name.length >= 2 && form.email.includes("@") && isValidCpf(form.cpf);
    }
    if (step === 2) {
      return (
        form.street.length >= 3 &&
        form.number.length >= 1 &&
        form.neighborhood.length >= 2 &&
        form.city.length >= 2 &&
        form.state.length === 2 &&
        /^\d{5}-?\d{3}$/.test(form.zip)
      );
    }
    return true;
  }

  const nextStep = () => setStep((prev) => Math.min(prev + 1, 3));
  const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

  async function handleSubmit() {
    setError(null);
    setLoading(true);

    try {
      // Optionally save address
      if (isSignedIn && saveAddress) {
        fetch("/api/user/address", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            street: form.street,
            number: form.number,
            complement: form.complement,
            neighborhood: form.neighborhood,
            city: form.city,
            state: form.state,
            zip: form.zip,
          }),
        }).catch(() => {});
      }

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          name: form.name,
          cpf: form.cpf,
          clerkUserId: isSignedIn ? user?.id : undefined,
          couponCode: appliedCoupon?.code ?? undefined,
          address: {
            street: form.street,
            number: form.number,
            complement: form.complement,
            neighborhood: form.neighborhood,
            city: form.city,
            state: form.state,
            zip: form.zip,
          },
          items: items.map((i) => ({
            variantId: i.variantId,
            quantity: i.quantity,
          })),
          // Browser timezone offset in minutes east of UTC at submit time.
          // Wrapped to swallow any environment without Date access (silent).
          customerTzOffset: (() => {
            try {
              return -new Date().getTimezoneOffset();
            } catch {
              return undefined;
            }
          })(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Checkout failed");
      }

      const { orderId } = await res.json();
      clearCart();
      // Clear draft now that order is placed.
      try {
        localStorage.removeItem("checkout-form-draft");
      } catch {
        // ignore
      }
      // Clear affiliate coupon cookie after successful order
      document.cookie = "affiliate_coupon=; path=/; max-age=0";
      router.push(`/${locale}/pedido/${orderId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setLoading(false);
    }
  }

  if (!hydrated) return null;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-20 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-foreground/50">{ct("emptyCart")}</p>
        <Link href={`/${locale}`}>
          <Button variant="outline" className="gap-2 rounded-none border-foreground/30 font-mono text-[11px] uppercase tracking-[0.1em]">
            <ArrowLeft className="size-4" />
            {ct("continueShopping")}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-muted/30">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 font-display text-3xl font-bold uppercase tracking-[0.1em]">
            {t("title")}
          </h1>
          <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-foreground/40">
            {t("subtitle")}
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8 flex justify-center">
          <div className="flex items-center gap-2 sm:gap-4">
            {STEP_KEYS.map((key, idx) => {
              const stepNumber = idx + 1;
              return (
                <div key={key} className="flex items-center">
                  <div
                    className={`flex size-7 items-center justify-center font-mono text-xs font-bold transition-colors sm:size-10 sm:text-sm ${
                      stepNumber < step
                        ? "border-2 border-foreground bg-foreground text-background"
                        : stepNumber === step
                          ? "border-2 border-foreground bg-foreground text-background"
                          : "border border-foreground/20 text-foreground/40"
                    }`}
                  >
                    {stepNumber < step ? (
                      <Check className="size-3 sm:size-4" />
                    ) : (
                      stepNumber
                    )}
                  </div>
                  {stepNumber < 3 ? (
                    <div
                      className={`mx-2 h-px w-8 transition-colors sm:mx-4 sm:w-16 ${
                        stepNumber < step ? "bg-foreground" : "bg-foreground/20"
                      }`}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <Card className="rounded-none border-t-[2px] border-t-foreground">
              <CardHeader className="border-b border-foreground/10">
                <CardTitle className="font-display text-sm font-bold uppercase tracking-[0.2em]">
                  {t(`steps.${STEP_KEYS[step - 1]}.title`)}
                </CardTitle>
                <CardDescription className="font-mono text-[10px] uppercase tracking-[0.15em]">
                  {t(`steps.${STEP_KEYS[step - 1]}.description`)}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
                {/* Step 1: Contact Information */}
                {step === 1 ? (
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="checkout-email">{t("email")}</Label>
                      <Input
                        id="checkout-email"
                        type="email"
                        placeholder="john@example.com"
                        value={
                          isUserLoaded && isSignedIn && form.email
                            ? maskEmail(form.email)
                            : form.email
                        }
                        onChange={(e) => updateField("email", e.target.value)}
                        disabled={isUserLoaded && !!isSignedIn && !!form.email}
                        className="h-9"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="checkout-name">{t("name")}</Label>
                      <Input
                        id="checkout-name"
                        placeholder={t("name")}
                        value={form.name}
                        onChange={(e) => updateField("name", e.target.value)}
                        className="h-9"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="checkout-cpf">{t("cpf")}</Label>
                      <Input
                        id="checkout-cpf"
                        placeholder="000.000.000-00"
                        value={form.cpf}
                        onChange={(e) => updateField("cpf", formatCpf(e.target.value))}
                        inputMode="numeric"
                        maxLength={14}
                        className="h-9"
                      />
                      {form.cpf.length > 0 && !isValidCpf(form.cpf) && (
                        <p className="text-xs text-destructive">{t("cpfInvalid")}</p>
                      )}
                    </div>

                    {!isSignedIn && (
                      <p className="text-xs text-muted-foreground">
                        {t("orLogin")}{" "}
                        <Link
                          href={`/${locale}/sign-in`}
                          className="text-primary underline underline-offset-2"
                        >
                          {ct("signIn")}
                        </Link>
                      </p>
                    )}
                  </div>
                ) : null}

                {/* Step 2: Shipping Address */}
                {step === 2 ? (
                  <div className="flex flex-col gap-4">
                    {/* ZIP with ViaCEP lookup */}
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="checkout-zip">{t("zip")}</Label>
                      <div className="relative">
                        <Input
                          id="checkout-zip"
                          placeholder="00000-000"
                          value={form.zip}
                          onChange={(e) => {
                            updateField("zip", e.target.value);
                            const clean = e.target.value.replace(/\D/g, "");
                            if (clean.length === 8) {
                              lookupCep(clean);
                            }
                          }}
                          className="h-9 pe-10"
                        />
                        <div className="absolute end-0 top-0 flex h-9 w-9 items-center justify-center">
                          {cepLoading ? (
                            <Loader2 className="size-4 animate-spin text-muted-foreground" />
                          ) : (
                            <Search className="size-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t("zipHint")}
                      </p>
                    </div>

                    {/* Street */}
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="checkout-street">{t("street")}</Label>
                      <Input
                        id="checkout-street"
                        placeholder={t("street")}
                        value={form.street}
                        onChange={(e) => updateField("street", e.target.value)}
                        className="h-9"
                      />
                    </div>

                    {/* Number + Complement */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="checkout-number">{t("number")}</Label>
                        <Input
                          ref={numberRef}
                          id="checkout-number"
                          placeholder="123"
                          value={form.number}
                          onChange={(e) => updateField("number", e.target.value)}
                          className="h-9"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="checkout-complement">
                          {t("complement")}
                        </Label>
                        <Input
                          id="checkout-complement"
                          placeholder={t("complementPlaceholder")}
                          value={form.complement}
                          onChange={(e) =>
                            updateField("complement", e.target.value)
                          }
                          className="h-9"
                        />
                      </div>
                    </div>

                    {/* Neighborhood */}
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="checkout-neighborhood">
                        {t("neighborhood")}
                      </Label>
                      <Input
                        id="checkout-neighborhood"
                        placeholder={t("neighborhood")}
                        value={form.neighborhood}
                        onChange={(e) =>
                          updateField("neighborhood", e.target.value)
                        }
                        className="h-9"
                      />
                    </div>

                    {/* City + State */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="checkout-city">{t("city")}</Label>
                        <Input
                          id="checkout-city"
                          placeholder={t("city")}
                          value={form.city}
                          onChange={(e) => updateField("city", e.target.value)}
                          className="h-9"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="checkout-state">{t("state")}</Label>
                        <Select
                          value={form.state}
                          onValueChange={(value) =>
                            updateField("state", value)
                          }
                        >
                          <SelectTrigger
                            id="checkout-state"
                            className="mt-2 py-3 !h-9 w-full"
                          >
                            <SelectValue placeholder={t("state")} />
                          </SelectTrigger>
                          <SelectContent position="popper">
                            {BRAZIL_STATES.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {isSignedIn && (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="checkout-save"
                          checked={saveAddress}
                          onCheckedChange={(checked) =>
                            setSaveAddress(checked as boolean)
                          }
                        />
                        <Label htmlFor="checkout-save" className="text-sm">
                          {t("saveAddress")}
                        </Label>
                      </div>
                    )}
                  </div>
                ) : null}

                {/* Step 3: Review & Pay */}
                {step === 3 ? (
                  <div className="flex flex-col gap-6">
                    {/* Summary cards */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="border border-foreground/15 p-4">
                        <p className="mb-1 font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-foreground/50">
                          {t("email")}
                        </p>
                        <p className="text-sm">{form.email}</p>
                        <p className="mt-2 mb-1 font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-foreground/50">
                          {t("name")}
                        </p>
                        <p className="text-sm">{form.name}</p>
                        <p className="mt-2 mb-1 font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-foreground/50">
                          {t("cpf")}
                        </p>
                        <p className="text-sm">{form.cpf}</p>
                      </div>
                      <div className="border border-foreground/15 p-4">
                        <p className="mb-1 font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-foreground/50">
                          {t("address")}
                        </p>
                        <p className="text-sm">
                          {form.street}, {form.number}
                          {form.complement ? ` — ${form.complement}` : ""}
                        </p>
                        <p className="text-sm">{form.neighborhood}</p>
                        <p className="text-sm">
                          {form.city}, {form.state} — {form.zip}
                        </p>
                      </div>
                    </div>

                    {/* Coupon Code */}
                    <div className="border border-foreground/15 p-4">
                      <p className="mb-2 font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-foreground/50">
                        {t("couponLabel")}
                      </p>
                      {appliedCoupon ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Tag className="size-4 text-foreground/60" />
                            <span className="font-mono text-sm font-bold uppercase">
                              {appliedCoupon.code}
                            </span>
                            <span className="border border-foreground/20 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.15em] text-foreground/60">
                              {appliedCoupon.type === "percentage"
                                ? `-${appliedCoupon.value}%`
                                : `-${formatPrice(appliedCoupon.value, locale)}`}
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={removeCoupon}
                          >
                            <X className="size-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Input
                            value={couponCode}
                            onChange={(e) =>
                              setCouponCode(e.target.value.toUpperCase())
                            }
                            placeholder={t("couponPlaceholder")}
                            className="h-9 rounded-none font-mono uppercase"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => applyCoupon()}
                            disabled={couponLoading || !couponCode.trim()}
                            className="h-9 shrink-0 rounded-none font-mono text-[11px] uppercase tracking-[0.1em]"
                          >
                            {couponLoading ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              t("couponApply")
                            )}
                          </Button>
                        </div>
                      )}
                      {couponError && (
                        <p className="mt-2 text-xs text-destructive">
                          {couponError}
                        </p>
                      )}
                    </div>

                    {/* Payment info */}
                    <div className="border border-foreground/15 p-4">
                      <p className="mb-2 font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-foreground/50">
                        {t("paymentMethod")}
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center border border-foreground/20">
                          <Lock className="size-4 text-foreground/60" />
                        </div>
                        <div>
                          <p className="font-display text-sm font-bold uppercase tracking-[0.1em]">PIX</p>
                          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-foreground/40">
                            {t("pixDescription")}
                          </p>
                        </div>
                      </div>
                    </div>

                    {error && (
                      <p className="text-sm text-destructive">{error}</p>
                    )}
                  </div>
                ) : null}

                {/* Navigation Buttons */}
                <div className="flex justify-between pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={prevStep}
                    disabled={step === 1}
                    className="h-9 cursor-pointer items-center gap-2 rounded-none border-foreground/30 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.1em]"
                  >
                    <ArrowLeft className="size-4" />
                    {t("back")}
                  </Button>

                  {step < 3 ? (
                    <Button
                      type="button"
                      onClick={nextStep}
                      disabled={!canAdvance()}
                      className="h-9 cursor-pointer rounded-none px-4 py-2 font-mono text-[11px] uppercase tracking-[0.1em]"
                    >
                      {t("continue")}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={handleSubmit}
                      disabled={loading}
                      className="h-9 cursor-pointer items-center gap-2 rounded-none px-4 py-2 font-mono text-[11px] uppercase tracking-[0.1em]"
                    >
                      {loading ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Lock className="size-4" />
                      )}
                      {t("payWithPix")}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8 rounded-none border-t-[2px] border-t-foreground">
              <CardHeader className="border-b border-foreground/10">
                <CardTitle className="font-display text-sm font-bold uppercase tracking-[0.2em]">
                  {t("orderSummary")}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {/* Items */}
                <div className="flex flex-col gap-4">
                  {items.map((item) => (
                    <div key={item.variantId} className="flex gap-4 border-b border-foreground/10 pb-4">
                      <div className="relative">
                        <div className="relative size-16 overflow-hidden border border-foreground/10">
                          <SafeImage
                            src={item.image}
                            alt={item.name}
                            width={64}
                            height={64}
                            className="size-16 object-cover"
                          />
                        </div>
                        <span className="absolute -end-2 -top-2 flex size-6 items-center justify-center border border-foreground bg-foreground p-0 font-mono text-[10px] text-background">
                          {item.quantity}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="truncate font-display text-sm font-bold uppercase tracking-[0.05em]">
                          {item.name}
                        </h4>
                        <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-foreground/40">
                          {item.variantLabel}
                        </p>
                        <div className="mt-1">
                          <PriceDisplay
                            usdCents={item.priceCents * item.quantity}
                            originalUsdCents={item.originalPriceCents ? item.originalPriceCents * item.quantity : undefined}
                            size="sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pricing */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between">
                    <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-foreground/50">
                      {t("subtotal")}
                    </span>
                    <PriceDisplay usdCents={subtotalCents} size="sm" />
                  </div>
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.2em] text-foreground/50">
                      <Truck className="size-3" />
                      {t("shippingLabel")}
                    </span>
                    <PriceDisplay usdCents={shippingCents} size="sm" />
                  </div>
                  {appliedCoupon && (
                    <div className="flex justify-between text-primary">
                      <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.2em]">
                        <Tag className="size-3" />
                        {appliedCoupon.code}
                        <span className="border border-primary/30 px-1 py-0.5 text-[8px] tracking-[0.1em]">
                          {appliedCoupon.type === "percentage"
                            ? `-${appliedCoupon.value}%`
                            : `-${formatPrice(appliedCoupon.value, locale)}`}
                        </span>
                      </span>
                      <span className="flex items-center font-mono text-sm">
                        -<PriceDisplay usdCents={appliedCoupon.discountCents} size="sm" priceClassName="text-primary" />
                      </span>
                    </div>
                  )}
                </div>

                <div className="h-px bg-foreground/20" />

                <div className="flex justify-between">
                  <span className="font-display text-sm font-bold uppercase tracking-[0.1em]">{ct("total")}</span>
                  <PriceDisplay
                    usdCents={totalCents() + totalShippingCents() - (appliedCoupon?.discountCents ?? 0)}
                    size="lg"
                  />
                </div>

                {/* Exchange rate note for BRL */}
                {locale === "pt" && rates.brl && (
                  <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-foreground/30">
                    US$1 = {formatPrice(Math.round(rates.brl * 100), "pt", "BRL")}
                  </p>
                )}

                {/* Trust Indicators */}
                <div className="flex flex-col gap-3 border-t border-foreground/10 pt-4">
                  <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.15em] text-foreground/40">
                    <Shield className="size-3.5" />
                    <span>{t("trustSecure")}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.15em] text-foreground/40">
                    <Package className="size-3.5" />
                    <span>{t("trustShipping")}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
