import * as React from "react"
import { cva } from "class-variance-authority"
import { Loader2 } from "lucide-react"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

/**
 * FleetGuard button (handoff component sheet §04).
 *   default  Primary   — brand-dark fill, white text, hover brand-darker
 *   outline  Secondary — white, brand border, brand-dark text, hover brand-50
 *   ghost    transparent, hover surface
 *   link     Text link — brand-dark, no frame, hover underline; a trailing icon
 *            (`<ChevronRight data-icon="inline-end" />`) nudges right on hover
 *   secondary, destructive — shadcn extras
 * Sizes: sm h-9 · default h-10 · lg h-12 (+ icon sizes). Disabled = 50% opacity.
 * Touch: on coarse pointers sm/default/icon sizes grow to a 44×44px minimum (WCAG 2.5.5);
 * fine-pointer (desktop) sizes are unchanged. `link` stays text-sized.
 * `loading` disables the button, sets aria-busy and shows a spinner before the children.
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md border border-transparent bg-clip-padding text-sm font-semibold whitespace-nowrap transition-[color,background-color,border-color,box-shadow] duration-200 outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 aria-busy:cursor-progress aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-brand-darker",
        outline:
          "border-brand bg-white text-brand-dark hover:bg-brand-50 aria-expanded:bg-brand-50",
        ghost:
          "text-navy hover:bg-surface aria-expanded:bg-surface",
        link: "h-auto! min-h-0! px-0! text-brand-dark underline-offset-4 hover:underline [&_[data-icon=inline-end]]:transition-transform [&_[data-icon=inline-end]]:duration-200 hover:[&_[data-icon=inline-end]]:translate-x-0.5",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-line aria-expanded:bg-line",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:ring-destructive/20",
      },
      size: {
        sm: "h-9 px-4 pointer-coarse:min-h-11",
        default: "h-10 px-5 pointer-coarse:min-h-11",
        lg: "h-12 px-6 text-[15px]",
        icon: "size-10 pointer-coarse:min-h-11 pointer-coarse:min-w-11",
        "icon-sm": "size-9 pointer-coarse:min-h-11 pointer-coarse:min-w-11",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}) {
  const Comp = asChild ? Slot.Root : "button"
  // Slot needs exactly one child, so the spinner is only injected on a real <button>.
  const showSpinner = loading && !asChild

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={asChild ? undefined : disabled || loading}
      aria-disabled={asChild && (disabled || loading) ? true : undefined}
      aria-busy={loading || undefined}
      {...props}
    >
      {showSpinner ? (
        <>
          <Loader2 className="animate-spin" aria-hidden="true" />
          {children}
        </>
      ) : (
        children
      )}
    </Comp>
  )
}

export { Button, buttonVariants }
