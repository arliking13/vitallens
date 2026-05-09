import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border-[#157A6E] bg-[#157A6E] text-white shadow-[0_12px_28px_rgba(21,122,110,0.18)] hover:bg-[#116b60] focus-visible:outline-[#157A6E]",
  secondary:
    "border-[#E5EAE4] bg-white text-[#1C2520] shadow-[0_8px_20px_rgba(28,37,32,0.045)] hover:bg-[#fbfcfa] focus-visible:outline-[#157A6E]",
  ghost:
    "border-transparent bg-transparent text-[#66706A] hover:bg-white/70 focus-visible:outline-[#157A6E]",
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
        "interactive-press inline-flex min-h-14 items-center justify-center rounded-[18px] border px-5 text-base font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
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
