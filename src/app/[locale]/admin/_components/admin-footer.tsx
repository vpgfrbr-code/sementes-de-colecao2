import Link from "next/link";
import { useTranslations } from "next-intl";

export function AdminFooter() {
  const t = useTranslations("common");
  const year = new Date().getFullYear();

  return (
    <footer className="border-t bg-background text-muted-foreground mt-auto py-6">
      <div className="container mx-auto px-4 md:px-8 flex flex-col items-center justify-between gap-4 md:flex-row text-xs font-mono uppercase tracking-widest">
        <span>
          &copy; {year} {t("brand")}
        </span>
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="transition-colors hover:text-foreground"
          >
            Sementes de Coleção
          </Link>
          <span className="text-muted-foreground/50">/</span>
          <span className="text-muted-foreground/70">Painel Administrativo</span>
        </div>
      </div>
    </footer>
  );
}
