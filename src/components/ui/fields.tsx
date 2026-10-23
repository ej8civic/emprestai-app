import * as React from "react";
import { cn } from "@/lib/cn";

const base =
  "w-full rounded-md border border-line-strong bg-bg px-3 text-sm text-fg placeholder:text-subtle transition-colors hover:border-subtle focus-visible:border-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-turbo-blue/40 disabled:opacity-45 aria-invalid:border-danger";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(base, "h-10", className)} {...props} />;
  },
);

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, ...props }, ref) {
    return <select ref={ref} className={cn(base, "h-10 appearance-none pr-8", className)} {...props} />;
  },
);

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn(base, "min-h-24 resize-none py-2.5", className)} {...props} />;
  },
);

export function Field({
  label,
  error,
  hint,
  className,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("flex flex-col gap-2", className)}>
      <span className="text-[13px] font-medium text-muted">{label}</span>
      {children}
      {error ? (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      ) : hint ? (
        <span className="text-xs text-subtle">{hint}</span>
      ) : null}
    </label>
  );
}
