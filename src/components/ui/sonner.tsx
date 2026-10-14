"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { usePathname } from "next/navigation"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()
  // No admin os toasts sobem para o topo: o rodapé já é ocupado pelo
  // bottom nav (z-40) e pela save bar / sticky action bar (z-60).
  const pathname = usePathname()
  const isAdmin = /^\/[a-z]{2}(?:-[A-Z]{2})?\/admin(?:\/|$)/.test(pathname ?? "")
  const adminProps: Partial<ToasterProps> = isAdmin
    ? {
        position: "top-center",
        offset: 16,
        mobileOffset: { top: 64 },
        closeButton: true,
      }
    : {}

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      {...adminProps}
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
