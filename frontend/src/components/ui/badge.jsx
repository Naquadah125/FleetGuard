import * as React from "react"
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

/**
 * FleetGuard badge / tag (handoff component sheet §06): pill, 12/18 semibold.
 * Variants: default (brand-50 / brand-dark), info, warning, danger, success, violet, neutral.
 * Pastel backgrounds are the status color at 10–12%; text uses a darker shade for contrast.
 */
const badgeVariants = cva(
  "group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2.5 py-0.5 text-body-sm font-semibold whitespace-nowrap transition-colors focus-visible:ring-3 focus-visible:ring-ring/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-brand-50 text-brand-dark",
        info: "bg-info/10 text-[color:color-mix(in_oklab,var(--color-info),black_30%)]",
        warning: "bg-warning/12 text-[color:color-mix(in_oklab,var(--color-warning),black_40%)]",
        danger: "bg-danger/10 text-[color:color-mix(in_oklab,var(--color-danger),black_25%)]",
        success: "bg-success/12 text-[color:color-mix(in_oklab,var(--color-success),black_45%)]",
        violet: "bg-violet/10 text-[color:color-mix(in_oklab,var(--color-violet),black_25%)]",
        neutral: "bg-surface text-ink",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
