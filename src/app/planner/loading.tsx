import { Skeleton } from "@/components/ui/skeleton";

export default function SuggestionLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
      <Skeleton className="h-20" />
      <Skeleton className="h-60" />
      <Skeleton className="h-60" />
    </div>
  );
}
