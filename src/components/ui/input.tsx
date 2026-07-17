import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  className,
}: {
  label?: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={htmlFor} className="px-0.5 text-[0.8125rem] font-semibold text-text-2">
          {label}
        </label>
      )}
      {children}
      {(hint || error) && (
        <p className={cn("px-0.5 text-[0.75rem]", error ? "text-negative" : "text-text-3")}>
          {error || hint}
        </p>
      )}
    </div>
  );
}

const baseInput =
  "w-full rounded-[14px] border border-border bg-surface-2 px-3.5 text-[0.95rem] text-text placeholder:text-text-3 transition-colors focus:border-border-strong focus:bg-surface focus:outline-none disabled:opacity-50";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(baseInput, "h-12", className)} {...props} />;
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(baseInput, "resize-none py-3 leading-relaxed", className)} {...props} />;
});
