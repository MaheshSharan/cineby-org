interface SpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  color?: string;
}

const SIZE_CLASSES = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-7 w-7",
  xl: "h-14 w-14",
};

export function Spinner({
  className = "",
  size = "md",
  color = "currentColor",
}: SpinnerProps) {
  const sizeClass = SIZE_CLASSES[size] ?? SIZE_CLASSES.md;

  return (
    <svg
      className={`animate-spin ${sizeClass} ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="status"
      aria-label="Loading"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke={color}
        strokeWidth="3.5"
      />
      <path
        className="opacity-80"
        fill={color}
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
