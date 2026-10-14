"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Save, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslations } from "next-intl";

const BRAZIL_STATES = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS",
  "MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC",
  "SP","SE","TO",
];

interface Address {
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  zip: string;
}

interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

export function AccountDashboard() {
  const t = useTranslations("account");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const numberRef = useRef<HTMLInputElement>(null);
  const [address, setAddress] = useState<Address>({
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    zip: "",
  });

  const loadAddress = useCallback(async () => {
    try {
      const res = await fetch("/api/user/address");
      if (res.ok) {
        const data = await res.json();
        if (data.address) {
          setAddress({
            street: data.address.street || "",
            number: data.address.number || "",
            complement: data.address.complement || "",
            neighborhood: data.address.neighborhood || "",
            city: data.address.city || "",
            state: data.address.state || "",
            zip: data.address.zip || "",
          });
        }
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    loadAddress();
  }, [loadAddress]);

  function updateField(field: keyof Address, value: string) {
    setAddress((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  }

  async function lookupCep(cep: string) {
    const clean = cep.replace(/\D/g, "");
    if (clean.length !== 8) return;

    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      if (!res.ok) return;
      const data: ViaCepResponse = await res.json();
      if (data.erro) return;

      setAddress((prev) => ({
        ...prev,
        street: data.logradouro || prev.street,
        neighborhood: data.bairro || prev.neighborhood,
        city: data.localidade || prev.city,
        state: data.uf || prev.state,
        zip: data.cep || prev.zip,
      }));
      setSaved(false);
      setTimeout(() => numberRef.current?.focus(), 100);
    } catch {
      // silently fail
    } finally {
      setCepLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    try {
      const res = await fetch("/api/user/address", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(address),
      });
      if (res.ok) setSaved(true);
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="acc-zip">{t("zip")}</Label>
        <div className="relative">
          <Input
            id="acc-zip"
            required
            pattern="\d{5}-?\d{3}"
            placeholder="00000-000"
            value={address.zip}
            onChange={(e) => {
              updateField("zip", e.target.value);
              const clean = e.target.value.replace(/\D/g, "");
              if (clean.length === 8) lookupCep(clean);
            }}
            className="pe-10"
          />
          <div className="absolute end-0 top-0 flex h-9 w-9 items-center justify-center">
            {cepLoading ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            ) : (
              <Search className="size-4 text-muted-foreground" />
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{t("zipHint")}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="acc-street">{t("street")}</Label>
        <Input
          id="acc-street"
          required
          minLength={3}
          value={address.street}
          onChange={(e) => updateField("street", e.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="acc-number">{t("number")}</Label>
          <Input
            ref={numberRef}
            id="acc-number"
            required
            placeholder="123"
            value={address.number}
            onChange={(e) => updateField("number", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="acc-complement">{t("complement")}</Label>
          <Input
            id="acc-complement"
            placeholder={t("complementPlaceholder")}
            value={address.complement}
            onChange={(e) => updateField("complement", e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="acc-neighborhood">{t("neighborhood")}</Label>
        <Input
          id="acc-neighborhood"
          required
          minLength={2}
          value={address.neighborhood}
          onChange={(e) => updateField("neighborhood", e.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="acc-city">{t("city")}</Label>
          <Input
            id="acc-city"
            required
            minLength={2}
            value={address.city}
            onChange={(e) => updateField("city", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="acc-state">{t("state")}</Label>
          <Select
            value={address.state}
            onValueChange={(v) => updateField("state", v)}
          >
            <SelectTrigger id="acc-state" className="!h-9 w-full">
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

      <div className="pt-2">
        <Button type="submit" className="gap-2" disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saved ? t("saved") : t("save")}
        </Button>
      </div>
    </form>
  );
}
