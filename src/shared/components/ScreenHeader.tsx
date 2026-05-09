import { StatusBadge } from "./StatusBadge";

type ScreenHeaderProps = {
  description: string;
  status: string;
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
      <StatusBadge tone={tone}>{status}</StatusBadge>
      <h1 className="mt-5 text-4xl font-bold leading-[1.05] tracking-normal text-[#1C2520]">
        {title}
      </h1>
      <p className="mt-4 max-w-sm text-base leading-7 text-[#66706A]">
        {description}
      </p>
    </div>
  );
}

