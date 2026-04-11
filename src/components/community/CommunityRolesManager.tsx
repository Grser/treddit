"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type CommunityRole = {
  id: number;
  name: string;
  can_edit_community: boolean;
  can_manage_roles: boolean;
  can_kick_members: boolean;
  can_ban_members: boolean;
  can_mute_members: boolean;
  can_manage_chat: boolean;
  can_manage_voice_channels: boolean;
  can_chat: boolean;
};

type CommunityMember = {
  id: number;
  username: string;
  nickname: string | null;
  base_role: string;
  role_id: number | null;
};

type RolesResponse = {
  roles?: CommunityRole[];
  members?: CommunityMember[];
  error?: string;
};

const PERMISSION_FIELDS = [
  { key: "can_edit_community", label: "Editar comunidad" },
  { key: "can_manage_roles", label: "Gestionar roles" },
  { key: "can_kick_members", label: "Expulsar miembros" },
  { key: "can_ban_members", label: "Banear miembros" },
  { key: "can_mute_members", label: "Silenciar chat" },
  { key: "can_manage_chat", label: "Gestionar chat" },
  { key: "can_manage_voice_channels", label: "Crear/gestionar salas de voz" },
  { key: "can_chat", label: "Puede escribir" },
] as const;

type RoleFormState = {
  name: string;
  can_edit_community: boolean;
  can_manage_roles: boolean;
  can_kick_members: boolean;
  can_ban_members: boolean;
  can_mute_members: boolean;
  can_manage_chat: boolean;
  can_manage_voice_channels: boolean;
  can_chat: boolean;
};

const defaultForm: RoleFormState = {
  name: "",
  can_edit_community: false,
  can_manage_roles: false,
  can_kick_members: false,
  can_ban_members: false,
  can_mute_members: false,
  can_manage_chat: false,
  can_manage_voice_channels: false,
  can_chat: true,
};

function normalizeBaseRole(role: string) {
  if (role === "owner") return "Dueño";
  if (role === "admin") return "Admin";
  if (role === "moderator") return "Moderador";
  return "Miembro";
}

export default function CommunityRolesManager({ communityId }: { communityId: number }) {
  const [roles, setRoles] = useState<CommunityRole[]>([]);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<RoleFormState>(defaultForm);
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null);

  const refreshData = useCallback(async () => {
    const res = await fetch(`/api/communities/${communityId}/roles`, { cache: "no-store" });
    const payload = (await res.json().catch(() => null)) as RolesResponse | null;
    if (!res.ok) {
      throw new Error(payload?.error || "No se pudo cargar el panel de roles");
    }
    setRoles(Array.isArray(payload?.roles) ? payload.roles : []);
    setMembers(Array.isArray(payload?.members) ? payload.members : []);
  }, [communityId]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    void refreshData()
      .catch((err) => {
        if (mounted) setError(err instanceof Error ? err.message : "No se pudo cargar el panel");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [communityId, refreshData]);

  async function submitRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);

    try {
      const action = editingRoleId ? "update_role" : "create_role";
      const res = await fetch(`/api/communities/${communityId}/roles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, roleId: editingRoleId, ...form }),
      });
      const payload = (await res.json().catch(() => null)) as RolesResponse | null;
      if (!res.ok) {
        throw new Error(payload?.error || "No se pudo guardar el rol");
      }

      setRoles(Array.isArray(payload?.roles) ? payload.roles : []);
      setMembers(Array.isArray(payload?.members) ? payload.members : []);
      setForm(defaultForm);
      setEditingRoleId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  }

  async function callAction(payload: Record<string, unknown>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/communities/${communityId}/roles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => null)) as RolesResponse | null;
      if (!res.ok) {
        throw new Error(data?.error || "No se pudo ejecutar la acción");
      }
      if (Array.isArray(data?.roles)) setRoles(data.roles);
      if (Array.isArray(data?.members)) setMembers(data.members);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo ejecutar la acción");
    } finally {
      setBusy(false);
    }
  }

  const rolesById = useMemo(() => new Map(roles.map((role) => [role.id, role])), [roles]);

  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="text-lg font-semibold">Roles y permisos</h2>
      <p className="mt-1 text-xs text-foreground/70">
        Crea roles tipo Discord y asigna permisos de editar, banear, kickear y silenciar chat.
      </p>

      {loading ? (
        <p className="mt-3 text-sm opacity-70">Cargando roles...</p>
      ) : (
        <>
          <form onSubmit={submitRole} className="mt-4 space-y-3 rounded-xl border border-border/70 bg-background/40 p-3">
            <div className="flex items-center justify-between gap-2">
              <input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Nombre del rol (ej. Administrador)"
                maxLength={60}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-brand/40 focus:ring"
                required
              />
              {editingRoleId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingRoleId(null);
                    setForm(defaultForm);
                  }}
                  className="rounded-full border border-border px-3 py-2 text-xs hover:bg-muted/60"
                >
                  Cancelar
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {PERMISSION_FIELDS.map((item) => (
                <label key={item.key} className="flex items-center gap-2 rounded-md border border-border/60 px-2 py-1.5">
                  <input
                    type="checkbox"
                    checked={form[item.key]}
                    onChange={(event) => setForm((prev) => ({ ...prev, [item.key]: event.target.checked }))}
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>

            <button type="submit" disabled={busy} className="rounded-full bg-brand px-4 py-2 text-sm text-white disabled:opacity-60">
              {editingRoleId ? "Guardar rol" : "Crear rol"}
            </button>
          </form>

          <div className="mt-4 space-y-2">
            {roles.length === 0 && <p className="text-sm opacity-70">Todavía no hay roles personalizados.</p>}
            {roles.map((role) => (
              <article key={role.id} className="rounded-xl border border-border/70 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{role.name}</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingRoleId(role.id);
                        setForm({
                          name: role.name,
                          can_edit_community: role.can_edit_community,
                          can_manage_roles: role.can_manage_roles,
                          can_kick_members: role.can_kick_members,
                          can_ban_members: role.can_ban_members,
                          can_mute_members: role.can_mute_members,
                          can_manage_chat: role.can_manage_chat,
                          can_manage_voice_channels: role.can_manage_voice_channels,
                          can_chat: role.can_chat,
                        });
                      }}
                      className="rounded-full border border-border px-2 py-1 text-xs hover:bg-muted/60"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!confirm(`¿Eliminar el rol ${role.name}?`)) return;
                        void callAction({ action: "delete_role", roleId: role.id });
                      }}
                      className="rounded-full border border-red-400/40 px-2 py-1 text-xs text-red-400 hover:bg-red-500/10"
                    >
                      Borrar
                    </button>
                  </div>
                </div>
                <p className="mt-1 text-xs opacity-70">
                  {PERMISSION_FIELDS.filter((item) => role[item.key]).map((item) => item.label).join(" · ") || "Sin permisos"}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-5">
            <h3 className="text-sm font-semibold">Miembros</h3>
            <ul className="mt-2 space-y-2">
              {members.map((member) => (
                <li key={member.id} className="rounded-xl border border-border/70 px-3 py-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{member.nickname || member.username}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 opacity-80">{normalizeBaseRole(String(member.base_role || "member"))}</span>
                    {member.role_id && (
                      <span className="rounded-full bg-brand/10 px-2 py-0.5 text-brand">
                        {rolesById.get(member.role_id)?.name || "Rol"}
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <select
                      value={member.role_id ?? ""}
                      onChange={(event) => {
                        const value = event.target.value;
                        void callAction({ action: "assign_role", targetUserId: member.id, roleId: value ? Number(value) : null });
                      }}
                      className="rounded-lg border border-border bg-background px-2 py-1"
                    >
                      <option value="">Sin rol personalizado</option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>{role.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => void callAction({ action: "member_action", moderationAction: "kick", targetUserId: member.id })}
                      className="rounded-full border border-border px-2 py-1 hover:bg-muted/60"
                    >
                      Kick
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const reason = prompt("Motivo del baneo (opcional)") || "";
                        void callAction({ action: "member_action", moderationAction: "ban", targetUserId: member.id, reason });
                      }}
                      className="rounded-full border border-red-400/40 px-2 py-1 text-red-400 hover:bg-red-500/10"
                    >
                      Ban
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const minutes = Number(prompt("Minutos de silencio (0 = indefinido)") || 0);
                        void callAction({ action: "member_action", moderationAction: "mute", targetUserId: member.id, minutes });
                      }}
                      className="rounded-full border border-amber-400/40 px-2 py-1 text-amber-300 hover:bg-amber-400/10"
                    >
                      Silenciar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
    </section>
  );
}
