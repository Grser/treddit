export default function SidebarLeft({ communities = [] as string[] }) {
  return (
    <aside className="w-64 hidden md:flex flex-col gap-2 p-4 border-r border-border">
      <nav className="flex flex-col gap-2">
        <a className="hover:bg-muted/60 rounded-lg px-3 py-2">Inicio</a>
        <a className="hover:bg-muted/60 rounded-lg px-3 py-2">Popular</a>
        <a className="hover:bg-muted/60 rounded-lg px-3 py-2">Explorar</a>
      </nav>
      <hr className="my-3 border-border" />
      <p className="text-xs opacity-70 px-3">Comunidades</p>
      <div className="flex flex-col">
        {communities.length === 0 && (
          <span className="px-3 py-2 text-sm opacity-60">Sin datos</span>
        )}
        {communities.map((t) => (
          <a key={t} className="px-3 py-2 hover:bg-muted/60 rounded-lg">r/{t.replace(/^#/, "")}</a>
        ))}
      </div>
    </aside>
  );
}
