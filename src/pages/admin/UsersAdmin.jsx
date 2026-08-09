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
    <div>
      {error && <p className="text-sm text-[var(--color-signal)] mb-4">{error}</p>}
      <div className="space-y-2">
        {users.map((u) => {
          // UserResponse DTO: User_ID, Name, Email, Address, Role_ID
          const id     = u.User_ID;
          const roleId = u.Role_ID ?? 3;
          return (
            <div
              key={id}
              className="flex items-center justify-between bg-[var(--color-dark-panel)] border border-[var(--color-dark-line)] rounded px-4 py-3"
            >
              <div>
                <p className="font-medium">{u.Name}</p>
                <p className="font-[var(--font-mono)] text-xs text-[var(--color-dark-ink)]/50">{u.Email}</p>
              </div>
              <select
                value={roleId}
                onChange={(e) => handleRoleChange(id, Number(e.target.value))}
                className="bg-[var(--color-dark-bg)] border border-[var(--color-dark-line)] rounded px-2 py-1.5 text-sm focus:border-[var(--color-circuit)] outline-none"
              >
                {ROLES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
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
