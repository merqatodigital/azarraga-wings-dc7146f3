import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type DisplayCurrency = "PHP" | "USD" | "EUR";

const CONFIG: Record<DisplayCurrency, { symbol: string; locale: string }> = {
  PHP: { symbol: "₱", locale: "en-PH" },
  USD: { symbol: "$", locale: "en-US" },
  EUR: { symbol: "€", locale: "en-IE" },
};

export type ApprovedRate = { quote: string; rate: number; source: string; effective_at: string };

type Ctx = {
  currency: DisplayCurrency;
  setCurrency: (c: DisplayCurrency) => void;
  rates: Record<string, ApprovedRate>;
  /** PHP is authoritative. Non-PHP display requires a human-approved rate. */
  format: (centavosPHP: number | null | undefined) => string;
  formatPHP: (centavosPHP: number | null | undefined) => string;
  rateMissing: boolean;
  symbol: string;
};

const CurrencyContext = createContext<Ctx | null>(null);

export function formatPeso(centavos: number | null | undefined) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 2 }).format(
    (Number(centavos) || 0) / 100,
  );
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<DisplayCurrency>("PHP");

  const { data } = useQuery({
    queryKey: ["exchange-rates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exchange_rates")
        .select("quote, rate, source, effective_at, human_approved")
        .eq("base", "PHP")
        .eq("human_approved", true)
        .order("effective_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const rates = useMemo(() => {
    const map: Record<string, ApprovedRate> = {};
    for (const r of data ?? []) if (!map[r.quote]) map[r.quote] = r as ApprovedRate;
    return map;
  }, [data]);

  const rateMissing = currency !== "PHP" && !rates[currency];

  const value: Ctx = {
    currency,
    setCurrency,
    rates,
    rateMissing,
    symbol: CONFIG[currency].symbol,
    formatPHP: formatPeso,
    format: (centavosPHP) => {
      const php = Number(centavosPHP) || 0;
      if (currency === "PHP") return formatPeso(php);
      const rate = rates[currency];
      if (!rate) return `${formatPeso(php)} (no approved ${currency} rate)`;
      return new Intl.NumberFormat(CONFIG[currency].locale, {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
      }).format((php / 100) * Number(rate.rate));
    },
  };

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used inside CurrencyProvider");
  return ctx;
}
