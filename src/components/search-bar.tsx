"use client";

import * as React from "react";
import { Search, X, Loader2, Clock, History } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { useDebounce } from "@/hooks/use-debounce";
import { useExchangeRate } from "@/lib/exchange-rate";
import { formatPrice } from "@/lib/format-price";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { TypingAnimation } from "@/components/ui/typing-animation";

interface SearchResult {
  id: string;
  slug: string;
  images: string[];
  product_translations: {
    name: string;
    description: string;
  }[];
  product_variants: {
    price_cents: number;
  }[];
}

const RECENT_SEARCHES_KEY = "recent-searches";
const MAX_RECENT_SEARCHES = 5;

export function SearchBar() {
  const locale = useLocale();
  const t = useTranslations("common");
  const router = useRouter();
  const { rates, convertToBRL, convertToEUR } = useExchangeRate();

  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const debouncedQuery = useDebounce(query, 300);
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [recentSearches, setRecentSearches] = React.useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = React.useState(-1);

  const inputRef = React.useRef<HTMLInputElement>(null);

  // Load recent searches on mount
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load recent searches", e);
    }
  }, []);

  // Save recent search
  const saveRecentSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    try {
      const updated = [
        searchQuery,
        ...recentSearches.filter((s) => s.toLowerCase() !== searchQuery.toLowerCase()),
      ].slice(0, MAX_RECENT_SEARCHES);
      setRecentSearches(updated);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save recent search", e);
    }
  };

  const removeRecentSearch = (e: React.MouseEvent, searchToRemove: string) => {
    e.stopPropagation();
    try {
      const updated = recentSearches.filter((s) => s !== searchToRemove);
      setRecentSearches(updated);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to remove recent search", e);
    }
  };

  // Perform search
  React.useEffect(() => {
    async function performSearch() {
      if (!debouncedQuery.trim()) {
        setResults([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(debouncedQuery)}&locale=${locale}`
        );
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
        }
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setIsLoading(false);
      }
    }

    performSearch();
    setSelectedIndex(-1); // Reset selection on new search
  }, [debouncedQuery, locale]);

  const handleSelect = (item: SearchResult) => {
    saveRecentSearch(query);
    setOpen(false);
    setQuery("");
    router.push(`/${locale}/produto/${item.slug}`);
  };

  const handleRecentSearchSelect = (searchQuery: string) => {
    setQuery(searchQuery);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!results.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      const item = results[selectedIndex];
      if (item) handleSelect(item);
    }
  };

  // Helper to bold matching text
  const highlightMatch = (text: string, highlight: string) => {
    if (!highlight.trim()) return <span>{text}</span>;
    const parts = text.split(new RegExp(`(${highlight})`, "gi"));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === highlight.toLowerCase() ? (
            <span key={i} className="font-bold text-foreground">
              {part}
            </span>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  };

  // Wait for dialog to open before focusing input
  React.useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setQuery("");
    }
  }, [open]);

  const [inputFocused, setInputFocused] = React.useState(false);

  // Fallback translations if not present in common namespace
  const placeholder = t.has("searchPlaceholder") ? t("searchPlaceholder") : "Pesquisar produtos...";
  const searchSuggestions = [
    t.has("searchSuggestion1") ? t("searchSuggestion1") : "Sementes feminizadas...",
    t.has("searchSuggestion2") ? t("searchSuggestion2") : "Purple Haze...",
    t.has("searchSuggestion3") ? t("searchSuggestion3") : "Autoflower...",
  ];
  const recentTitle = t.has("recentSearches") ? t("recentSearches") : "Buscas recentes";
  const noResults = t.has("noSearchResults") ? t("noSearchResults") : "Nenhum produto encontrado.";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full h-8 w-8 md:h-9 md:w-9"
          aria-label="Search"
        >
          <Search className="h-4 w-4 md:h-5 md:w-5" />
        </Button>
      </DialogTrigger>
      
      <DialogContent 
        showCloseButton={false}
        className={cn(
          "fixed top-0 left-0 right-0 bottom-0 z-50 flex flex-col gap-0 rounded-none border-0 bg-background p-0 shadow-none transition-all duration-200 translate-x-0 translate-y-0",
          "md:top-[15%] md:bottom-auto md:left-[50%] md:w-full md:max-w-2xl md:translate-x-[-50%] md:translate-y-0 md:rounded-xl md:border md:shadow-xl",
          // Slide in from bottom on mobile, fade in on desktop
          "data-[state=closed]:slide-out-to-bottom-full md:data-[state=closed]:slide-out-to-bottom-0",
          "data-[state=open]:slide-in-from-bottom-full md:data-[state=open]:slide-in-from-bottom-0"
        )}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Pesquisar sementes</DialogTitle>
        </DialogHeader>

        {/* Search Input Area */}
        <div className="flex items-center border-b px-4 py-3 md:px-5 md:py-4">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <div className="relative flex-1">
            <Input
              ref={inputRef}
              type="text"
              placeholder=""
              className="flex-1 border-0 bg-transparent px-3 text-base shadow-none focus-visible:ring-0 md:text-lg h-auto w-full"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
            />
            {!query && (
              <div className="pointer-events-none absolute inset-0 flex items-center px-3">
                <TypingAnimation
                  words={searchSuggestions}
                  loop
                  showCursor={!inputFocused}
                  cursorStyle="line"
                  typeSpeed={60}
                  deleteSpeed={30}
                  pauseDelay={2000}
                  className="text-base text-muted-foreground md:text-lg"
                />
              </div>
            )}
          </div>
          {query ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full shrink-0"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Clear</span>
            </Button>
          ) : (
            <Button
              variant="ghost"
              className="px-2 font-medium text-muted-foreground shrink-0 md:hidden"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
          )}
          {/* Desktop Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:flex h-8 w-8 rounded-full ml-2 shrink-0 text-muted-foreground hover:bg-accent"
            onClick={() => setOpen(false)}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto px-2 py-3 md:px-3 md:py-4">
          {isLoading && !results.length ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : query.trim() && results.length === 0 && !isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Search className="mb-4 h-8 w-8 opacity-20" />
              <p>{noResults}</p>
            </div>
          ) : query.trim() && results.length > 0 ? (
            <div className="flex flex-col gap-1 pb-safe">
              {results.map((item, index) => {
                const isSelected = selectedIndex === index;
                const name = item.product_translations[0]?.name || "";
                const price = item.product_variants[0]?.price_cents || 0;
                const formattedPrice =
                  locale === "pt" && rates.brl
                    ? formatPrice(convertToBRL(price), "pt", "BRL")
                    : locale === "es" && rates.eur
                    ? formatPrice(convertToEUR(price), "es", "EUR")
                    : formatPrice(price, "en", "USD");

                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={cn(
                      "flex cursor-pointer items-center gap-4 rounded-lg p-3 text-sm transition-colors",
                      isSelected ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    {item.images?.[0] ? (
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                        <Image
                          src={item.images[0]}
                          alt={name}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      </div>
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-muted">
                        <Search className="h-5 w-5 text-muted-foreground/50" />
                      </div>
                    )}
                    <div className="flex flex-1 flex-col overflow-hidden">
                      <div className="truncate text-base font-medium text-muted-foreground">
                        {highlightMatch(name, query)}
                      </div>
                      <div className="text-muted-foreground font-mono text-xs mt-0.5">
                        {formattedPrice}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : !query.trim() && recentSearches.length > 0 ? (
            <div className="px-2">
              <h3 className="mb-3 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {recentTitle}
              </h3>
              <div className="flex flex-col">
                {recentSearches.map((search, i) => (
                  <div
                    key={i}
                    onClick={() => handleRecentSearchSelect(search)}
                    className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-3 hover:bg-accent"
                  >
                    <div className="flex items-center gap-3 text-sm text-foreground">
                      <History className="h-4 w-4 text-muted-foreground" />
                      <span>{search}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                      onClick={(e) => removeRecentSearch(e, search)}
                    >
                      <X className="h-3 w-3" />
                      <span className="sr-only">Remove</span>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
