import { Skeleton } from "@/components/ui/skeleton";

export default function WorkspacesLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10" role="status" aria-label="Çalışma alanları yükleniyor">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div className="flex flex-1 flex-col gap-2"><Skeleton className="h-3 w-28" /><Skeleton className="h-8 w-56 max-w-full" /><Skeleton className="h-4 w-96 max-w-full" /></div>
        <Skeleton className="hidden h-9 w-40 sm:block" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => <div key={index} className="flex h-40 flex-col gap-3 rounded-xl border p-5"><Skeleton className="h-5 w-3/5" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-4/5" /><Skeleton className="mt-auto h-6 w-20" /></div>)}
      </div>
      <span className="sr-only">Yükleniyor...</span>
    </div>
  );
}
