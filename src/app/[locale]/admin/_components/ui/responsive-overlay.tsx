"use client";

import * as React from "react";
import { useMobileState } from "@/hooks/use-is-mobile";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

interface ResponsiveOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Esconde o título visualmente (continua acessível para leitores de tela). */
  hideTitle?: boolean;
  footer?: React.ReactNode;
  children: React.ReactNode;
  dialogClassName?: string;
  drawerClassName?: string;
  /** Classe da área de conteúdo rolável (ex.: para remover padding). */
  bodyClassName?: string;
}

/**
 * Modal adaptativo do admin: bottom sheet (vaul) no mobile, Dialog no
 * desktop — uma API só. Overlays abrem pós-interação, então o estado
 * "pending" da primeira renderização nunca é visível na prática.
 */
export function ResponsiveOverlay({
  open,
  onOpenChange,
  title,
  description,
  hideTitle,
  footer,
  children,
  dialogClassName,
  drawerClassName,
  bodyClassName,
}: ResponsiveOverlayProps) {
  const mobileState = useMobileState();

  if (mobileState === "mobile") {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent
          className={cn("rounded-t-2xl pb-[env(safe-area-inset-bottom)]", drawerClassName)}
        >
          <DrawerHeader className={cn(hideTitle && "sr-only")}>
            <DrawerTitle>{title}</DrawerTitle>
            {description ? (
              <DrawerDescription>{description}</DrawerDescription>
            ) : null}
          </DrawerHeader>
          <div className={cn("overflow-y-auto px-4 pb-2", bodyClassName)}>
            {children}
          </div>
          {footer ? <DrawerFooter className="pt-2">{footer}</DrawerFooter> : null}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={dialogClassName}>
        <DialogHeader className={cn(hideTitle && "sr-only")}>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <div className={cn("max-h-[70vh] overflow-y-auto", bodyClassName)}>
          {children}
        </div>
        {footer ? <DialogFooter>{footer}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  );
}
