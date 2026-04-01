function MeetingCardSkeleton() {
  return (
    <article className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="h-7 w-64 rounded-full bg-white/10" />
            <div className="h-6 w-24 rounded-full bg-white/8" />
            <div className="h-6 w-16 rounded-full bg-white/6" />
          </div>
          <div className="mt-3 h-4 w-40 rounded-full bg-white/6" />
          <div className="mt-4 h-4 w-full rounded-full bg-white/6" />
          <div className="mt-2 h-4 w-3/4 rounded-full bg-white/6" />
        </div>
        <div className="flex gap-3">
          <div className="h-20 w-32 rounded-2xl bg-black/20" />
          <div className="h-20 w-32 rounded-2xl bg-black/20" />
        </div>
      </div>
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-2xl border border-white/10 bg-black/20 p-4"
          >
            <div className="h-3 w-28 rounded-full bg-white/8" />
            <div className="mt-3 h-4 w-full rounded-full bg-white/6" />
            <div className="mt-2 h-4 w-5/6 rounded-full bg-white/6" />
          </div>
        ))}
      </div>
    </article>
  );
}

export default function WorkspaceLibraryLoading() {
  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6">
        <div className="h-4 w-36 rounded-full bg-white/8" />
        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex-1">
            <div className="h-11 w-96 max-w-full rounded-3xl bg-white/10" />
            <div className="mt-3 h-4 w-full max-w-2xl rounded-full bg-white/6" />
            <div className="mt-2 h-4 w-3/4 rounded-full bg-white/6" />
          </div>
          <div className="w-full max-w-sm space-y-3">
            <div className="h-12 rounded-2xl bg-black/20" />
            <div className="h-10 rounded-full bg-white/8" />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <MeetingCardSkeleton key={index} />
        ))}
      </section>
    </div>
  );
}
