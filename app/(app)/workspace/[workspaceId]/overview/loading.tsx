export default function WorkspaceOverviewLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl animate-pulse px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="mb-7 h-16 w-full max-w-md rounded-xl bg-muted/70" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-28 rounded-xl bg-muted/70" />)}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="h-80 rounded-xl bg-muted/70" />
        <div className="h-80 rounded-xl bg-muted/70" />
      </div>
    </div>
  );
}
