interface StatCardProps {
  readonly value: string;
  readonly label: string;
}

export function StatCard({ value, label }: StatCardProps) {
  return (
    <div className="flex flex-col items-center gap-1 px-6 py-4">
      <span className="text-4xl md:text-5xl font-bold text-primary-800 tracking-tight">
        {value}
      </span>
      <span className="text-sm md:text-base text-text-muted font-medium">
        {label}
      </span>
    </div>
  );
}
