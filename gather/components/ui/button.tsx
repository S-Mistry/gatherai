import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "btn focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "",
        clay: "clay",
        sage: "sage",
        ghost: "ghost",
        outline: "ghost",
        secondary: "ghost",
        destructive: "ghost text-[var(--rose)] border-[var(--rose)]",
        link: "!bg-transparent !shadow-none !p-0 underline underline-offset-4 text-[var(--clay)] hover:text-[var(--ink)]",
      },
      size: {
        default: "",
        xs: "sm",
        sm: "sm",
        lg: "lg",
        icon: "!p-0 !w-9 !h-9",
        "icon-sm": "!p-0 !w-8 !h-8",
        "icon-lg": "!p-0 !w-10 !h-10",
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
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { Button, buttonVariants }
