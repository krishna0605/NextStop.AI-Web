function DashboardMetricSkeleton() {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <div className="h-3 w-24 rounded-full bg-white/8" />
      <div className="mt-4 h-8 w-36 rounded-full bg-white/10" />
      <div className="mt-3 h-4 w-full rounded-full bg-white/6" />
      <div className="mt-2 h-4 w-2/3 rounded-full bg-white/6" />
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-7">
        <div className="h-8 w-44 rounded-full bg-white/8" />
        <div className="mt-5 h-14 w-2/3 rounded-3xl bg-white/10" />
        <div className="mt-4 h-4 w-full max-w-3xl rounded-full bg-white/6" />
        <div className="mt-2 h-4 w-3/4 rounded-full bg-white/6" />
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:max-w-xl">
          <div className="h-12 rounded-full bg-white/10" />
          <div className="h-12 rounded-full bg-white/8" />
          <div className="h-12 rounded-full bg-white/8" />
          <div className="h-12 rounded-full bg-white/8" />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6">
          <div className="h-4 w-36 rounded-full bg-white/8" />
          <div className="mt-3 h-7 w-60 rounded-full bg-white/10" />
          <div className="mt-3 h-4 w-full rounded-full bg-white/6" />
          <div className="mt-2 h-4 w-2/3 rounded-full bg-white/6" />
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DashboardMetricSkeleton />
            <DashboardMetricSkeleton />
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6">
          <div className="h-4 w-32 rounded-full bg-white/8" />
          <div className="mt-3 h-7 w-52 rounded-full bg-white/10" />
          <div className="mt-6 space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="rounded-2xl border border-white/10 bg-black/20 p-4"
              >
                <div className="h-4 w-full rounded-full bg-white/6" />
                <div className="mt-2 h-4 w-5/6 rounded-full bg-white/6" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
