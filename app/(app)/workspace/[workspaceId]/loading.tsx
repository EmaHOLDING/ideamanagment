import { Skeleton } from "@/components/ui/skeleton";

export default function WorkspaceLoading() {
  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col" role="status" aria-label="Fikir panosu yükleniyor">
      <div className="flex min-h-14 items-center justify-between border-b px-3 py-2.5 sm:px-4 sm:py-3"><div className="flex items-center gap-3"><Skeleton className="size-9 rounded-md" /><div className="flex flex-col gap-1.5"><Skeleton className="hidden h-2.5 w-20 sm:block" /><Skeleton className="h-5 w-40" /></div></div><Skeleton className="h-8 w-24" /></div>
      <div className="flex gap-2 border-b px-3 py-3 sm:px-4"><Skeleton className="h-8 w-full sm:w-64" /><Skeleton className="hidden h-8 w-32 sm:block" /><Skeleton className="hidden h-8 w-32 sm:block" /></div>
      <div className="scrollbar-subtle flex flex-1 gap-3 overflow-hidden p-3 sm:gap-4 sm:p-4">
        {Array.from({ length: 3 }).map((_, columnIndex) => <div key={columnIndex} className="flex w-[min(20rem,calc(100vw-1.5rem))] shrink-0 flex-col gap-3 rounded-xl border p-3 sm:w-72"><div className="flex items-center justify-between"><Skeleton className="h-4 w-28" /><Skeleton className="h-5 w-16 rounded-full" /></div>{Array.from({ length: columnIndex === 1 ? 2 : 3 }).map((_, cardIndex) => <div key={cardIndex} className="flex h-32 flex-col gap-2 rounded-xl border p-3"><Skeleton className="h-4 w-4/5" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-2/3" /><Skeleton className="mt-auto h-6 w-20" /></div>)}</div>)}
      </div>
      <span className="sr-only">Yükleniyor...</span>
    </div>
  );
}
