import { useEffect, useState, useCallback } from "react";
import { usersApi } from "../../api/client";
import ConfirmDialog from "../../components/ConfirmDialog";
import { useToast } from "../../hooks/useToast";

const ROLES = [
  { id: 1, label: "Admin" },
  { id: 2, label: "Staff" },
  { id: 3, label: "Customer" },
];

function roleDisplayLabel(roleId) {
  if (roleId === 1) return "Admin";
  if (roleId === 2) return "Staff";
  return "Customer";
}

function roleBadgeClass(roleId) {
  if (roleId === 1) return "admin-status-shipped"; // violet/indigo
  if (roleId === 2) return "admin-status-processing"; // blue
  return "admin-status-delivered"; // emerald/green
}

function buildRoleDialogProps(change) {
  if (!change) return null;
  const { name, currentRole, nextRoleId } = change;
  const currentLabel = roleDisplayLabel(currentRole);

  if (nextRoleId === 1) {
    return {
      title: "Give this person admin access?",
      description: `${name} will change from ${currentLabel} to Admin.`,
      warning:
        "This is a high-impact change. Admins can manage users, change roles, edit products, and view private store activity. Only continue if you fully trust this person.",
      confirmLabel: "Yes, give admin access",
      tone: "danger",
    };
  }

  if (nextRoleId === 2) {
    return {
      title: "Give this person staff access?",
      description: `${name} will change from ${currentLabel} to Staff.`,
      warning:
        "Staff can manage orders and access customer activity. Confirm that this person should have access to store operations.",
      confirmLabel: "Yes, give staff access",
      tone: "warning",
    };
  }

  return {
    title: "Remove this person's staff access?",
    description: `${name} will change from ${currentLabel} to Customer.`,
    warning:
      "This will remove the person's staff or admin access and return them to a customer account.",
    confirmLabel: "Remove staff access",
    tone: "warning",
  };
}

export default function UsersAdmin() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [roleChange, setRoleChange] = useState(null); // { id, name, currentRole, nextRoleId }
  const [savingRole, setSavingRole] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await usersApi.list();
      setUsers(res.data || []);
    } catch {
      setError("Couldn't load users. Make sure you have admin permissions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function handleRoleSelectChange(u, nextRoleId) {
    const id = u.User_ID || u.user_ID;
    const currentRole = u.Role_ID || u.role_ID || 3;
    const name = u.Name || u.name || "This user";

    if (nextRoleId === currentRole) return;
    setRoleChange({ id, name, currentRole, nextRoleId });
  }

  async function confirmRoleChange() {
    if (!roleChange) return;
    setSavingRole(true);
    try {
      await usersApi.updateRole(roleChange.id, roleChange.nextRoleId);
      const name = roleChange.name;
      const newLabel = roleDisplayLabel(roleChange.nextRoleId);
      setRoleChange(null);
      await load();
      toast.show(`${name} is now ${newLabel}.`, { tone: "success" });
    } catch (err) {
      toast.show(err.response?.data?.message || "Couldn't update role.", { tone: "error" });
    } finally {
      setSavingRole(false);
    }
  }

  const dialogProps = buildRoleDialogProps(roleChange);

  return (
    <div className="admin-glass-panel rounded-xl p-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Staff and customer accounts</h2>
          <p className="text-xs text-[var(--color-dark-ink)]/60">
            Assign store operational roles and review registered accounts.
          </p>
        </div>

        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="admin-btn-secondary self-start sm:self-auto"
          aria-label="Reload users"
        >
          <svg
            className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20 11a8.1 8.1 0 0 0-14.7-3L3 11" />
            <path d="M3 4v7h7" />
            <path d="M4 13a8.1 8.1 0 0 0 14.7 3L21 13" />
            <path d="M21 20v-7h-7" />
          </svg>
          <span>Refresh</span>
        </button>
      </div>

      {/* Loading state */}
      {loading && users.length === 0 && (
        <div className="py-16 text-center text-sm text-[var(--color-dark-ink)]/60 flex flex-col items-center justify-center gap-3">
          <svg className="w-6 h-6 animate-spin text-[var(--color-circuit)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
          </svg>
          <p>Loading accounts…</p>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="bg-[var(--color-signal)]/10 border border-[var(--color-signal)]/30 rounded-lg p-5 text-center my-4">
          <p className="text-sm text-[var(--color-signal)] mb-3">{error}</p>
          <button type="button" onClick={load} className="admin-btn-secondary">
            Try again
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && users.length === 0 && (
        <div className="py-16 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-[var(--color-dark-panel)] border border-[var(--color-dark-line)] flex items-center justify-center text-[var(--color-dark-ink)]/40 mb-3">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-white mb-1">No users found</h3>
          <p className="text-xs text-[var(--color-dark-ink)]/50 max-w-sm">
            Registered customer and staff accounts will appear here.
          </p>
        </div>
      )}

      {/* User list: Desktop table + Mobile stacked cards */}
      {users.length > 0 && (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Current Role</th>
                  <th className="text-right">Change Role</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const id = u.User_ID || u.user_ID;
                  const roleId = u.Role_ID || u.role_ID || 3;
                  const name = u.Name || u.name || "Unnamed user";
                  const email = u.Email || u.email;
                  const initials = name.substring(0, 2).toUpperCase();
                  const roleName = roleDisplayLabel(roleId);

                  return (
                    <tr key={id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[var(--color-circuit)]/15 border border-[var(--color-circuit)]/30 text-[var(--color-circuit)] flex items-center justify-center text-xs font-bold shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <span className="font-medium text-white block truncate">{name}</span>
                            <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-dark-ink)]/50">
                              #{id}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="font-[var(--font-mono)] text-xs text-[var(--color-dark-ink)]/70">
                        {email}
                      </td>
                      <td>
                        <span className={`admin-status-badge ${roleBadgeClass(roleId)}`}>
                          {roleName}
                        </span>
                      </td>
                      <td className="text-right">
                        <select
                          value={roleId}
                          disabled={savingRole && roleChange?.id === id}
                          onChange={(e) => handleRoleSelectChange(u, Number(e.target.value))}
                          className="admin-input-premium border border-[var(--color-dark-line)] rounded px-3 py-1.5 text-xs text-white outline-none cursor-pointer focus:border-[var(--color-circuit)]"
                          aria-label={`Change role for ${name}`}
                        >
                          {ROLES.map((r) => (
                            <option key={r.id} value={r.id} className="bg-[var(--color-dark-panel)]">
                              {r.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Cards */}
          <div className="md:hidden space-y-3">
            {users.map((u) => {
              const id = u.User_ID || u.user_ID;
              const roleId = u.Role_ID || u.role_ID || 3;
              const name = u.Name || u.name || "Unnamed user";
              const email = u.Email || u.email;
              const initials = name.substring(0, 2).toUpperCase();
              const roleName = roleDisplayLabel(roleId);

              return (
                <div key={id} className="admin-item-card rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[var(--color-circuit)]/15 border border-[var(--color-circuit)]/30 text-[var(--color-circuit)] flex items-center justify-center text-xs font-bold shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-white truncate text-sm">{name}</span>
                        <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-dark-ink)]/50 shrink-0">
                          #{id}
                        </span>
                      </div>
                      <p className="font-[var(--font-mono)] text-xs text-[var(--color-dark-ink)]/60 truncate mt-0.5">
                        {email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[var(--color-dark-line)]">
                    <span className={`admin-status-badge ${roleBadgeClass(roleId)}`}>
                      {roleName}
                    </span>

                    <select
                      value={roleId}
                      disabled={savingRole && roleChange?.id === id}
                      onChange={(e) => handleRoleSelectChange(u, Number(e.target.value))}
                      className="admin-input-premium border border-[var(--color-dark-line)] rounded px-2.5 py-1 text-xs text-white outline-none"
                      aria-label={`Change role for ${name}`}
                    >
                      {ROLES.map((r) => (
                        <option key={r.id} value={r.id} className="bg-[var(--color-dark-panel)]">
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Confirmation Dialog */}
      {dialogProps && (
        <ConfirmDialog
          open={Boolean(roleChange)}
          title={dialogProps.title}
          description={dialogProps.description}
          warning={dialogProps.warning}
          confirmLabel={dialogProps.confirmLabel}
          cancelLabel="Go back"
          tone={dialogProps.tone}
          busy={savingRole}
          onConfirm={confirmRoleChange}
          onCancel={() => setRoleChange(null)}
        />
      )}
    </div>
  );
}
