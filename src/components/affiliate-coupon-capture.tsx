"use client";

import { useEffect, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Tag } from "lucide-react";
import { claimAffiliateCoupon } from "@/lib/affiliate-cookie";

export function AffiliateCouponCapture() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("common");
  const handled = useRef(false);

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (!ref || handled.current) return;
    handled.current = true;

    const code = ref.trim().toUpperCase();
    if (!code) return;

    // Persist coupon in cookie so checkout auto-applies it. Duration reflects
    // the coupon's own persistence window (configured per coupon in admin).
    void claimAffiliateCoupon(code);

    toast(t("couponSaved", { code }), {
      icon: <Tag className="h-4 w-4" />,
    });

    // Clean ?ref= from URL without page reload
    const params = new URLSearchParams(searchParams.toString());
    params.delete("ref");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [searchParams, router, pathname, t]);

  return null;
}
