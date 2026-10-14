"use client";

import Link from "next/link";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useAdminSave } from "./_components/admin-save-context";
import { DotPattern } from "@/components/ui/dot-pattern";

export function AdminHeader({ locale }: { locale: string }) {
  const t = useTranslations("common");
  const { state, triggerSave } = useAdminSave();

  return (
    <header className="sticky top-0 z-50 hidden w-full border-b-[2px] border-b-white/20 bg-bark text-white md:block">
      <DotPattern width={12} height={12} cr={0.5} className="text-foreground opacity-[0.025]" />
      <div className="relative mx-auto flex h-14 max-w-full items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Link
            href={`/${locale}`}
            className="flex shrink-0 items-center transition-opacity hover:opacity-80"
          >
            <BrandLogo
              width={160}
              height={63}
              className="h-8 w-auto brightness-0 invert"
              textClassName="text-base text-white"
            />
          </Link>
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-white/40">
            /
          </span>
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">
            {t("admin")}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {state.visible && (
            <>
              {state.dirty && (
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/60">
                  Alterações não salvas
                </span>
              )}
              <Button
                type="button"
                size="sm"
                onClick={triggerSave}
                disabled={!state.dirty || !state.canSave || state.saving}
                className="h-8 rounded-full bg-primary px-4 text-[11px] uppercase tracking-[0.1em] text-primary-foreground hover:bg-primary/90"
              >
                {state.saving ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <Save className="mr-1.5 size-3.5" />
                )}
                {state.label}
              </Button>
            </>
          )}
          <Link
            href={`/${locale}`}
            className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.1em] text-white/60 transition-colors hover:text-white"
          >
            <ArrowLeft className="size-3.5" />
            {t("backToSite")}
          </Link>
        </div>
      </div>
    </header>
  );
}
