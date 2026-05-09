import type { ComponentPropsWithoutRef } from "react";

type CardPadding = "sm" | "md" | "lg";

type CardProps = ComponentPropsWithoutRef<"div"> & {
  padding?: CardPadding;
};

const paddingClasses: Record<CardPadding, string> = {
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
};

export function Card({
  children,
  className = "",
  padding = "md",
  ...props
}: CardProps) {
  return (
    <div
      className={[
        "rounded-[24px] border border-[#E5EAE4] bg-white shadow-[0_18px_48px_rgba(28,37,32,0.055)]",
        paddingClasses[padding],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}

