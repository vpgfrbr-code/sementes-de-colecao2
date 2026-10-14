import { Skeleton } from "@/components/ui/skeleton";

export function HeroSkeleton() {
  return (
    <section className="relative w-full">
      <div className="relative aspect-[4/5] md:aspect-[21/9] w-full overflow-hidden">
        <Skeleton className="absolute inset-0" />

        {/* Gradient overlay matching real hero */}
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-foreground/20 to-transparent" />

        {/* Text placeholder at bottom-left */}
        <div className="absolute bottom-0 left-0 right-0 mx-auto w-full max-w-7xl px-4 pb-10 md:pb-16 md:px-6">
          <Skeleton className="h-10 w-72 bg-primary-foreground/10 md:h-14 md:w-96" />
          <Skeleton className="mt-3 h-5 w-48 bg-primary-foreground/10 md:w-64" />
        </div>

        {/* Top gradient matching header blend */}
        <div className="pointer-events-none absolute left-0 top-0 right-0 h-32 bg-gradient-to-b from-black/50 via-black/20 to-transparent" />
      </div>
    </section>
  );
}
