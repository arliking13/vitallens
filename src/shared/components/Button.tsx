import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "vl-primary-button hover:brightness-[0.99] focus-visible:outline-[var(--vl-peach)]",
  secondary:
    "vl-secondary-button hover:bg-white/70 focus-visible:outline-[var(--vl-peach)]",
  ghost:
    "border-transparent bg-transparent text-[var(--vl-text-muted)] hover:bg-white/50 focus-visible:outline-[var(--vl-peach)]",
};

export function Button({
  className = "",
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        "interactive-press inline-flex min-h-14 items-center justify-center px-5 text-base font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        variantClasses[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      type={type}
      {...props}
    />
  );
}
