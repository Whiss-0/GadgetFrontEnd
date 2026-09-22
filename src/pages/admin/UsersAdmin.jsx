import { useEffect, useState } from "react";
import { usersApi } from "../../api/client";
import ConfirmDialog from "../../components/ConfirmDialog";

const ROLES = [
  { id: 1, label: "Admin" },
  { id: 2, label: "Moderator" },
  { id: 3, label: "User" },
];

// Display label used in dialogs — "Staff" is more understandable than "Moderator"
function roleDisplayLabel(roleId) {
  if (roleId === 1) return "Admin";
  if (roleId === 2) return "Staff";
  return "Customer";
}

// Build the appropriate dialog config based on the requested role change
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

  // Downgrading from Admin or Staff back to Customer
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
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [roleChange, setRoleChange] = useState(null); // { id, name, currentRole, nextRoleId }
  const [savingRole, setSavingRole] = useState(false);

  function load() {
    usersApi
      .list()
      .then((res) => setUsers(res.data || []))
      .catch(() => setError("Couldn't load users."));
  }

  useEffect(load, []);

  function handleRoleSelectChange(u, nextRoleId) {
    const id = u.User_ID || u.user_ID;
    const currentRole = u.Role_ID || u.role_ID || 3;
    const name = u.Name || u.name || "This user";

    // No-op if same role
    if (nextRoleId === currentRole) return;

    setRoleChange({ id, name, currentRole, nextRoleId });
  }

  async function confirmRoleChange() {
    if (!roleChange) return;
    setSavingRole(true);
    try {
      await usersApi.updateRole(roleChange.id, roleChange.nextRoleId);
      setRoleChange(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't update role.");
    } finally {
      setSavingRole(false);
    }
  }

  const dialogProps = buildRoleDialogProps(roleChange);

  return (
    <div className="admin-glass-panel rounded-xl p-6">
      {error && <p className="text-sm text-[var(--color-signal)] mb-4">{error}</p>}
      <div className="space-y-3">
        {users.map((u) => {
          // UserResponse DTO: User_ID, Name, Email, Address, Role_ID
          const id     = u.User_ID || u.user_ID;
          const roleId = u.Role_ID || u.role_ID || 3;
          const name   = u.Name || u.name;
          const email  = u.Email || u.email;
          const initials = name ? name.substring(0, 2).toUpperCase() : "U";
          return (
            <div
              key={id}
              className="flex items-center justify-between admin-item-card rounded-lg px-5 py-4 gap-4"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center bg-gradient-to-br from-[var(--color-circuit)] to-[var(--color-circuit-dark)] text-[#0F1629] font-bold shadow-lg shadow-[var(--color-circuit)]/20">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="font-medium flex items-center gap-2 truncate">
                    {name}
                    <span className="font-[var(--font-mono)] text-[10px] bg-[var(--color-dark-bg)] border border-[var(--color-dark-line)] text-[var(--color-dark-ink)]/70 px-1.5 py-0.5 rounded-full shrink-0">
                      ID:{id}
                    </span>
                  </p>
                  <p className="font-[var(--font-mono)] text-xs text-[var(--color-dark-ink)]/50 mt-0.5 truncate">{email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-medium text-[var(--color-dark-ink)]/50 hidden sm:block">Role:</span>
                <select
                  value={roleId}
                  disabled={savingRole && roleChange?.id === id}
                  onChange={(e) => handleRoleSelectChange(u, Number(e.target.value))}
                  className="admin-input-premium border border-[var(--color-dark-line)] rounded px-3 py-1.5 text-sm text-white outline-none cursor-pointer"
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
        {users.length === 0 && !error && (
          <p className="text-[var(--color-dark-ink)]/50">No users found.</p>
        )}
      </div>

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
