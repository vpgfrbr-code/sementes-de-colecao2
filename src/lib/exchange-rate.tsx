"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";

interface ExchangeRates {
  brl: number | null;
  eur: number | null;
}

interface ExchangeRateContextValue {
  rates: ExchangeRates;
  loading: boolean;
  convertToBRL: (usdCents: number) => number;
  convertToEUR: (usdCents: number) => number;
}

const ExchangeRateContext = createContext<ExchangeRateContextValue>({
  rates: { brl: null, eur: null },
  loading: true,
  convertToBRL: () => 0,
  convertToEUR: () => 0,
});

const REFRESH_INTERVAL = 30 * 60 * 1000; // 30 minutes

export function ExchangeRateProvider({ children }: { children: ReactNode }) {
  const [rates, setRates] = useState<ExchangeRates>({ brl: null, eur: null });
  const [loading, setLoading] = useState(true);

  const fetchRate = useCallback(async () => {
    try {
      const res = await fetch("/api/exchange-rate");
      if (!res.ok) return;
      const data = await res.json();
      if (data.brl && data.brl > 0) {
        setRates({ brl: data.brl, eur: data.eur ?? null });
      }
    } catch {
      // keep previous rates if available
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRate();
    const interval = setInterval(fetchRate, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchRate]);

  const convertToBRL = useCallback(
    (usdCents: number) => {
      if (!rates.brl) return 0;
      return Math.round(usdCents * rates.brl);
    },
    [rates.brl]
  );

  const convertToEUR = useCallback(
    (usdCents: number) => {
      if (!rates.eur) return 0;
      return Math.round(usdCents * rates.eur);
    },
    [rates.eur]
  );

  return (
    <ExchangeRateContext.Provider value={{ rates, loading, convertToBRL, convertToEUR }}>
      {children}
    </ExchangeRateContext.Provider>
  );
}

export function useExchangeRate() {
  return useContext(ExchangeRateContext);
}
