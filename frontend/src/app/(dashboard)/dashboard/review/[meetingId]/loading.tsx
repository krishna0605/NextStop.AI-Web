export default function MeetingReviewLoading() {
  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1">
            <div className="h-4 w-20 rounded-full bg-white/8" />
            <div className="mt-3 h-12 w-3/4 rounded-3xl bg-white/10" />
            <div className="mt-3 h-4 w-2/3 rounded-full bg-white/6" />
            <div className="mt-4 h-4 w-full rounded-full bg-white/6" />
          </div>
          <div className="grid w-full max-w-sm grid-cols-1 gap-3">
            <div className="h-11 rounded-full bg-white/10" />
            <div className="h-11 rounded-full bg-white/8" />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6">
          <div className="h-4 w-24 rounded-full bg-white/8" />
          <div className="mt-3 h-8 w-56 rounded-full bg-white/10" />
          <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-5">
            <div className="h-4 w-28 rounded-full bg-white/8" />
            <div className="mt-4 h-4 w-full rounded-full bg-white/6" />
            <div className="mt-2 h-4 w-11/12 rounded-full bg-white/6" />
            <div className="mt-2 h-4 w-2/3 rounded-full bg-white/6" />
          </div>
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="rounded-2xl border border-white/10 bg-black/20 p-5"
              >
                <div className="h-4 w-32 rounded-full bg-white/8" />
                <div className="mt-4 h-4 w-full rounded-full bg-white/6" />
                <div className="mt-2 h-4 w-5/6 rounded-full bg-white/6" />
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6"
            >
              <div className="h-4 w-32 rounded-full bg-white/8" />
              <div className="mt-4 h-4 w-full rounded-full bg-white/6" />
              <div className="mt-2 h-4 w-4/5 rounded-full bg-white/6" />
              <div className="mt-2 h-4 w-2/3 rounded-full bg-white/6" />
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
