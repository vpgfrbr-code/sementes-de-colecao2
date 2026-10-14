import * as React from "react";
import { cn } from "@/lib/utils";

interface ColorOption {
  label: string;
  value: string;
  hex: string;
}

interface ColorVariantFieldProps {
  colors: ColorOption[];
  selectedColor?: string;
  onColorChange?: (colorValue: string) => void;
  className?: string;
}

export default function ColorVariantField({
  colors,
  selectedColor,
  onColorChange,
  className,
}: ColorVariantFieldProps) {
  const [selected, setSelected] = React.useState<string | undefined>(
    selectedColor,
  );

  React.useEffect(() => {
    setSelected(selectedColor);
  }, [selectedColor]);

  const handleColorClick = (colorValue: string) => {
    setSelected(colorValue);
    onColorChange?.(colorValue);
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-row items-center gap-2">
        {colors.map((colorOption) => {
          const isSelected = selected === colorOption.value;
          return (
            <button
              key={colorOption.value}
              type="button"
              onClick={() => handleColorClick(colorOption.value)}
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                isSelected ? "border-foreground" : "border-border",
              )}
              aria-label={colorOption.label}
              aria-pressed={isSelected}
            >
              <div
                className="border-foreground/15 size-7 rounded-full border"
                style={{ backgroundColor: colorOption.hex }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
