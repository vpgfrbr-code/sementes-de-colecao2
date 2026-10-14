interface SpecimenBarcodeProps {
  className?: string;
}

export function SpecimenBarcode({ className }: SpecimenBarcodeProps) {
  return (
    <div
      className={className}
      aria-hidden="true"
      style={{
        backgroundColor: "currentColor",
        maskImage: "url(/barcode.svg)",
        WebkitMaskImage: "url(/barcode.svg)",
        maskSize: "100% 100%",
        WebkitMaskSize: "100% 100%",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
      }}
    />
  );
}
