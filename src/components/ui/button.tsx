import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/cn";

export const buttonVariants = cva(
  "inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-[background,border-color,color,opacity] duration-150 disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4",
  {
    variants: {
      variant: {
        // CTA branco, como no vercel.com.
        primary: "bg-fg text-bg hover:bg-white",
        secondary: "border border-line-strong bg-transparent text-fg hover:border-subtle hover:bg-surface-2",
        ghost: "text-muted hover:bg-surface-2 hover:text-fg",
        danger: "border border-danger/40 bg-danger/10 text-danger hover:bg-danger/20",
      },
      size: {
        sm: "h-8 px-3 text-[13px]",
        md: "h-10 px-4 text-sm",
        lg: "h-11 px-5 text-sm",
        icon: "size-9",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

export const Button = React.forwardRef<HTMLButtonElement, Props>(function Button(
  { className, variant, size, asChild, ...props },
  ref,
) {
  const Comp = asChild ? Slot : "button";
  return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
});
