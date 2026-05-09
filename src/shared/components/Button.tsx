import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border-[#0b6f61] bg-[#0b6f61] text-white shadow-sm hover:bg-[#09594e] focus-visible:outline-[#0b6f61]",
  secondary:
    "border-[#d8ded6] bg-white text-[#26312c] hover:bg-[#f5f8f6] focus-visible:outline-[#0b6f61]",
  ghost:
    "border-transparent bg-transparent text-[#536159] hover:bg-[#edf3ef] focus-visible:outline-[#0b6f61]",
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
        "inline-flex min-h-11 items-center justify-center rounded-lg border px-4 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
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

