export default function WorkspaceOpsLoading() {
  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6">
        <div className="h-4 w-28 animate-pulse rounded bg-white/10" />
        <div className="mt-3 h-10 w-72 animate-pulse rounded bg-white/10" />
        <div className="mt-4 h-20 w-full animate-pulse rounded-2xl bg-white/5" />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="h-80 animate-pulse rounded-[2rem] border border-white/10 bg-zinc-950/70" />
        <div className="h-80 animate-pulse rounded-[2rem] border border-white/10 bg-zinc-950/70" />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="h-96 animate-pulse rounded-[2rem] border border-white/10 bg-zinc-950/70" />
        <div className="h-96 animate-pulse rounded-[2rem] border border-white/10 bg-zinc-950/70" />
      </section>
    </div>
  );
}
