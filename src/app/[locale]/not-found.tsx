import { useTranslations } from "next-intl";
import Link from "next/link";

export default function NotFoundPage() {
  const t = useTranslations("NotFoundPage");

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-foreground/50">
        404
      </p>
      <h1 className="mt-4 font-display text-3xl font-bold uppercase tracking-tight md:text-5xl">
        {t("title")}
      </h1>
      <p className="mt-4 max-w-md font-sans text-base text-foreground/60">
        {t("description")}
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center rounded-full bg-primary px-6 py-3 font-sans text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        {t("backHome")}
      </Link>
    </div>
  );
}
