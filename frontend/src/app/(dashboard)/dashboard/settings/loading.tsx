export default function WorkspaceSettingsLoading() {
  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6">
        <div className="h-4 w-24 rounded-full bg-white/8" />
        <div className="mt-4 h-10 w-96 max-w-full rounded-3xl bg-white/10" />
        <div className="mt-3 h-4 w-full max-w-3xl rounded-full bg-white/6" />
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6">
        <div className="h-4 w-32 rounded-full bg-white/8" />
        <div className="mt-3 h-7 w-64 rounded-full bg-white/10" />
        <div className="mt-6 grid grid-cols-2 gap-3 max-w-xs">
          <div className="h-12 rounded-2xl bg-white/8" />
          <div className="h-12 rounded-2xl bg-black/20" />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <section
            key={index}
            className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6"
          >
            <div className="h-6 w-44 rounded-full bg-white/10" />
            <div className="mt-4 h-4 w-full rounded-full bg-white/6" />
            <div className="mt-2 h-4 w-5/6 rounded-full bg-white/6" />
          </section>
        ))}
      </div>
    </div>
  );
}
