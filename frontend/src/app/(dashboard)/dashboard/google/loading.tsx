export default function GoogleWorkspaceLoading() {
  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6">
        <div className="h-4 w-36 rounded-full bg-white/8" />
        <div className="mt-4 h-10 w-80 max-w-full rounded-3xl bg-white/10" />
        <div className="mt-3 h-4 w-full max-w-3xl rounded-full bg-white/6" />
        <div className="mt-2 h-4 w-2/3 rounded-full bg-white/6" />
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        {Array.from({ length: 2 }).map((_, index) => (
          <section
            key={index}
            className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6"
          >
            <div className="h-4 w-32 rounded-full bg-white/8" />
            <div className="mt-3 h-7 w-56 rounded-full bg-white/10" />
            <div className="mt-6 space-y-3">
              {Array.from({ length: 4 }).map((__, row) => (
                <div key={row} className="h-12 rounded-2xl bg-black/20" />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
