type InfoRowProps = {
  label: string;
  value: string;
  detail?: string;
};

export function InfoRow({ label, value, detail }: InfoRowProps) {
  return (
    <div className="grid gap-1 border-t border-[#e6ebe5] py-3 first:border-t-0">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-sm font-medium text-[#536159]">{label}</span>
        <span className="text-sm font-semibold text-[#26312c]">{value}</span>
      </div>
      {detail ? <p className="text-sm leading-6 text-[#66736b]">{detail}</p> : null}
    </div>
  );
}

