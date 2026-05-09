import type { ComponentPropsWithoutRef, CSSProperties } from "react";

type CardPadding = "sm" | "md" | "lg";

type CardProps = ComponentPropsWithoutRef<"div"> & {
  delayMs?: number;
  padding?: CardPadding;
};

type AnimationStyle = CSSProperties & {
  "--card-delay"?: string;
};

const paddingClasses: Record<CardPadding, string> = {
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
};

export function Card({
  children,
  className = "",
  delayMs = 40,
  padding = "md",
  style,
  ...props
}: CardProps) {
  const animationStyle: AnimationStyle = {
    ...style,
    "--card-delay": `${delayMs}ms`,
  };

  return (
    <div
      className={[
        "animate-card-in rounded-[24px] border border-[#E5EAE4] bg-white shadow-[0_18px_48px_rgba(28,37,32,0.055)]",
        paddingClasses[padding],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={animationStyle}
      {...props}
    >
      {children}
    </div>
  );
}
