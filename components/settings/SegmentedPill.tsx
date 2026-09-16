interface Option<T extends string> {
  label: string;
  value: T;
}

interface SegmentedPillProps<T extends string> {
  options: Array<Option<T>>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function SegmentedPill<T extends string>({
  options,
  value,
  onChange,
  className = "",
}: SegmentedPillProps<T>) {
  return (
    <div
      className={`inline-flex items-center p-1 rounded-full bg-black/50 border border-white/10 ${className}`}
    >
      {options.map((opt) => {
        const isSelected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1 text-xs rounded-full font-medium transition-all duration-200 cursor-pointer ${
              isSelected
                ? "bg-white text-black font-semibold shadow-sm"
                : "text-white/70 hover:text-white"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
