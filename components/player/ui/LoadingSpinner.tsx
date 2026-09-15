import { Spinner } from "@/components/ui/Spinner";

interface LoadingSpinnerProps {
  className?: string;
}

export function LoadingSpinner({
  className = "",
}: LoadingSpinnerProps) {
  return (
    <div
      className={`flex items-center justify-center ${className}`}
      role="status"
      aria-label="Loading"
    >
      <Spinner size="xl" className="text-white" />
    </div>
  );
}
