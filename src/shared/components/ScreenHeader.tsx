import { StatusBadge } from "./StatusBadge";

type ScreenHeaderProps = {
  description: string;
  status?: string;
  title: string;
  tone?: "brand" | "pulse" | "breath" | "neutral" | "warning";
};

export function ScreenHeader({
  description,
  status,
  title,
  tone = "brand",
}: ScreenHeaderProps) {
  return (
    <div>
      {status ? <StatusBadge tone={tone}>{status}</StatusBadge> : null}
      <h1
        className={[
          status ? "mt-5" : "",
          "text-4xl font-bold leading-[1.03] tracking-normal text-[var(--vl-text)]",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {title}
      </h1>
      <p className="mt-4 max-w-sm text-base leading-7 text-[var(--vl-text-muted)]">
        {description}
      </p>
    </div>
  );
}
