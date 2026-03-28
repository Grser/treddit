"use client";

export default function AdminError({ error: _error, reset }: { error: Error; reset: () => void }) {
  void _error;
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col items-center justify-center px-6 py-10 text-center">
      <div className="w-full rounded-2xl border border-amber-400/40 bg-amber-500/10 p-6">
        <h1 className="text-xl font-semibold text-amber-200">No eres administrador</h1>
        <p className="mt-2 text-sm text-amber-100/90">
          Cuidado donde entras 👀. Esta zona es solo para administradores del sistema.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-4 rounded-full border border-amber-300/60 px-4 py-2 text-sm font-medium text-amber-100 hover:bg-amber-400/15"
        >
          Intentar de nuevo
        </button>
      </div>
    </main>
  );
}
