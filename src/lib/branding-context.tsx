"use client";

import { createContext, useContext } from "react";
import type { BrandingSettings } from "@/lib/branding";

const BrandingContext = createContext<BrandingSettings | null>(null);

export function BrandingProvider({
  value,
  children,
}: {
  value: BrandingSettings;
  children: React.ReactNode;
}) {
  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
}

/** Returns branding or throws — use inside the provider. */
export function useBranding(): BrandingSettings {
  const v = useContext(BrandingContext);
  if (!v) {
    throw new Error("useBranding must be used within a BrandingProvider");
  }
  return v;
}

/** Returns branding or null — use when the component may render outside the provider. */
export function useBrandingOptional(): BrandingSettings | null {
  return useContext(BrandingContext);
}
