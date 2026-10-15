import { useState, useEffect, useMemo } from "react";
import { usersApi, notificationsApi } from "../../api/client";
import ConfirmDialog from "../../components/ConfirmDialog";

export default function NotificationsAdmin() {
  const [audience, setAudience] = useState("AllUsers");
  const [recipientUserId, setRecipientUserId] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Load users for individual targeting
  useEffect(() => {
    if (audience === "Individual" && users.length === 0) {
      setLoadingUsers(true);
      usersApi
        .list()
        .then((res) => {
          setUsers(Array.isArray(res.data) ? res.data : []);
        })
        .catch(() => {
          setError("Failed to load user list for individual selection.");
        })
        .finally(() => {
          setLoadingUsers(false);
        });
    }
  }, [audience, users.length]);

  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return users;
    const q = userSearch.toLowerCase();
    return users.filter(
      (u) =>
        (u.Name || u.name || "").toLowerCase().includes(q) ||
        (u.Email || u.email || "").toLowerCase().includes(q) ||
        String(u.User_ID || u.user_ID || "").includes(q)
    );
  }, [users, userSearch]);

  const selectedUser = useMemo(() => {
    if (!recipientUserId) return null;
    return users.find((u) => String(u.User_ID || u.user_ID) === String(recipientUserId));
  }, [users, recipientUserId]);

  const audienceLabel =
    audience === "AllUsers"
      ? "all customers (Role: Customer)"
      : audience === "AllStaff"
      ? "all staff members (Role: Staff)"
      : selectedUser
      ? `${selectedUser.Name || selectedUser.name} (${selectedUser.Email || selectedUser.email})`
      : "one individual user";

  function handleSubmitClick(e) {
    e.preventDefault();
    setError(null);
    setResult(null);

    const trimmedTitle = title.trim();
    const trimmedMessage = message.trim();

    if (!trimmedTitle) {
      setError("Please provide a title.");
      return;
    }
    if (!trimmedMessage) {
      setError("Please provide a message.");
      return;
    }
    if (audience === "Individual" && !recipientUserId) {
      setError("Please select an individual recipient.");
      return;
    }

    // Require confirmation before broadcasting
    if (audience === "AllUsers" || audience === "AllStaff") {
      setConfirmOpen(true);
    } else {
      doSend();
    }
  }

  async function doSend() {
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        audience,
        recipientUserId: audience === "Individual" ? Number(recipientUserId) : null,
        title: title.trim(),
        message: message.trim(),
      };
      const res = await notificationsApi.sendAdmin(payload);
      const sentCount = res.data?.sentCount ?? 1;
      setResult(`Announcement successfully sent to ${sentCount} recipient${sentCount === 1 ? "" : "s"}.`);
      setTitle("");
      setMessage("");
      setRecipientUserId("");
      setConfirmOpen(false);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to send notification.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="admin-notifications-page">
      <div className="admin-page-heading">
        <div>
          <h1 className="text-2xl font-bold font-[var(--font-display)] text-white">
            Send Notification
          </h1>
          <p className="text-sm text-[var(--color-dark-ink)] opacity-70 mt-1">
            Broadcast announcements to customers, staff, or individual accounts.
          </p>
        </div>
      </div>

      {result && (
        <div className="mb-6 p-4 rounded-lg bg-[var(--color-circuit-soft)] border border-[var(--color-circuit)] text-[var(--color-circuit)] text-sm">
          ✓ {result}
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-[color-mix(in_srgb,var(--color-signal)_15%,transparent)] border border-[var(--color-signal)] text-[var(--color-signal)] text-sm">
          ✕ {error}
        </div>
      )}

      <form onSubmit={handleSubmitClick} className="admin-notification-composer" noValidate>
        <label>
          Audience
          <select
            value={audience}
            onChange={(e) => {
              setAudience(e.target.value);
              setRecipientUserId("");
            }}
          >
            <option value="AllUsers">All Customers (Role: Customer)</option>
            <option value="AllStaff">All Staff (Role: Staff)</option>
            <option value="Individual">Individual User</option>
          </select>
        </label>

        {audience === "Individual" && (
          <div className="space-y-2">
            <label>
              Search & Select Recipient
              <input
                type="text"
                placeholder="Filter by name, email, or user ID…"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
            </label>

            <select
              value={recipientUserId}
              onChange={(e) => setRecipientUserId(e.target.value)}
              disabled={loadingUsers}
            >
              <option value="">
                {loadingUsers ? "Loading users…" : "-- Select a recipient --"}
              </option>
              {filteredUsers.map((u) => {
                const uid = u.User_ID || u.user_ID;
                const uname = u.Name || u.name;
                const uemail = u.Email || u.email;
                return (
                  <option key={uid} value={uid}>
                    #{uid} — {uname} ({uemail})
                  </option>
                );
              })}
            </select>
          </div>
        )}

        <label>
          Title
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Scheduled Maintenance"
            maxLength={120}
          />
          <small>{title.length}/120</small>
        </label>

        <label>
          Message
          <textarea
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What should the recipients know?"
            maxLength={1000}
          />
          <small>{message.length}/1000</small>
        </label>

        <div className="admin-notification-preview">
          <span>Recipient Preview:</span>
          <strong>Sending to: {audienceLabel}</strong>
          {title.trim() && (
            <div className="mt-2 text-xs">
              <strong>Preview: </strong>
              <span>{title.trim()}</span> — <em>{message.trim() || "(No message entered)"}</em>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="btn-primary py-2.5 mt-2"
        >
          {submitting ? "Sending announcement…" : "Send notification"}
        </button>
      </form>

      <ConfirmDialog
        open={confirmOpen}
        title={`Send announcement to ${audience === "AllUsers" ? "all customers" : "all staff"}?`}
        description={`This will create a notification for every ${audience === "AllUsers" ? "customer" : "staff"} account.`}
        warning="This broadcast will immediately notify all users in this role group. Please ensure the message is accurate."
        confirmLabel="Yes, send broadcast"
        cancelLabel="Review message"
        tone="warning"
        busy={submitting}
        onConfirm={doSend}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
