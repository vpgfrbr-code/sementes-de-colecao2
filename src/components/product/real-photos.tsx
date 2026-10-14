"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface RealPhotosProps {
  photos: string[];
  title: string;
}

export function RealPhotos({ photos, title }: RealPhotosProps) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const openLightbox = useCallback((idx: number) => {
    setLightboxIdx(idx);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxIdx(null);
  }, []);

  const goNext = useCallback(() => {
    setLightboxIdx((prev) =>
      prev !== null ? (prev + 1) % photos.length : null
    );
  }, [photos.length]);

  const goPrev = useCallback(() => {
    setLightboxIdx((prev) =>
      prev !== null ? (prev - 1 + photos.length) % photos.length : null
    );
  }, [photos.length]);

  if (!photos.length) return null;

  return (
    <>
      <div className="mt-8">
        <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground mb-3">
          {title}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {photos.map((url, idx) => (
            <button
              key={url}
              type="button"
              onClick={() => openLightbox(idx)}
              className="relative aspect-square overflow-hidden rounded-xl bg-secondary group cursor-pointer"
            >
              <Image
                src={url}
                alt={`${title} ${idx + 1}`}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIdx !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/90"
          onClick={closeLightbox}
        >
          {/* Close */}
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-10 flex size-10 items-center justify-center rounded-full bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 transition-colors"
          >
            <X className="size-5" />
          </button>

          {/* Prev */}
          {photos.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              className="absolute left-4 z-10 flex size-10 items-center justify-center rounded-full bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 transition-colors"
            >
              <ChevronLeft className="size-5" />
            </button>
          )}

          {/* Image */}
          <div
            className="relative max-h-[85vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={photos[lightboxIdx]!}
              alt={`${title} ${lightboxIdx + 1}`}
              width={1200}
              height={900}
              className="max-h-[85vh] w-auto rounded-lg object-contain"
            />
          </div>

          {/* Next */}
          {photos.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              className="absolute right-4 z-10 flex size-10 items-center justify-center rounded-full bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 transition-colors"
            >
              <ChevronRight className="size-5" />
            </button>
          )}

          {/* Counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-primary-foreground/70 text-sm font-mono">
            {lightboxIdx + 1} / {photos.length}
          </div>
        </div>
      )}
    </>
  );
}
