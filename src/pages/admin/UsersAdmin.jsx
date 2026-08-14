import { useEffect, useState } from "react";
import { usersApi } from "../../api/client";

const ROLES = [
  { id: 1, label: "Admin" },
  { id: 2, label: "Moderator" },
  { id: 3, label: "User" },
];

export default function UsersAdmin() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");

  function load() {
    usersApi
      .list()
      .then((res) => setUsers(res.data || []))
      .catch(() => setError("Couldn't load users."));
  }

  useEffect(load, []);

  async function handleRoleChange(id, roleId) {
    try {
      // PUT /api/user/{id} with body { Role_ID } — matches UpdateUserDto
      await usersApi.updateRole(id, roleId);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't update role.");
    }
  }

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
                  onChange={(e) => handleRoleChange(id, Number(e.target.value))}
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
    </div>
  );
}
