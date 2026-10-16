import { useCallback, useEffect, useMemo, useState } from "react";
import { usersApi, notificationsApi } from "../../api/client";
import ConfirmDialog from "../../components/ConfirmDialog";

const AUDIENCES = [
  { value: "AllUsers", title: "All customers", description: "Send to every customer account.", icon: "◎" },
  { value: "AllStaff", title: "All staff", description: "Send to staff and moderators.", icon: "◇" },
  { value: "Individual", title: "One person", description: "Choose a specific account.", icon: "○" },
];

export default function NotificationsAdmin() {
  const [audience, setAudience] = useState("AllUsers");
  const [recipientUserId, setRecipientUserId] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    setUsersError("");
    try {
      const response = await usersApi.list();
      setUsers(Array.isArray(response.data) ? response.data : []);
    } catch (requestError) {
      setUsersError(requestError?.response?.data?.message || "We couldn’t load accounts. Try again.");
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    if (audience === "Individual" && users.length === 0 && !usersError && !loadingUsers) void loadUsers();
  }, [audience, users.length, usersError, loadingUsers, loadUsers]);

  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLocaleLowerCase();
    if (!query) return users;
    return users.filter((user) => {
      const name = user.Name ?? user.name ?? "";
      const email = user.Email ?? user.email ?? "";
      const id = user.User_ID ?? user.user_ID ?? "";
      return `${name} ${email} ${id}`.toLocaleLowerCase().includes(query);
    });
  }, [users, userSearch]);

  const selectedUser = useMemo(() => {
    if (!recipientUserId) return null;
    return users.find((user) => String(user.User_ID ?? user.user_ID) === String(recipientUserId)) ?? null;
  }, [users, recipientUserId]);

  const audienceLabel = audience === "AllUsers"
    ? "all customers"
    : audience === "AllStaff"
      ? "all staff members"
      : selectedUser
        ? `${selectedUser.Name ?? selectedUser.name} (${selectedUser.Email ?? selectedUser.email})`
        : "one selected person";

  function handleSubmitClick(event) {
    event.preventDefault();
    setError("");
    setResult("");
    if (!title.trim()) return setError("Add a short title so recipients know what this update is about.");
    if (!message.trim()) return setError("Write a message before sending.");
    if (audience === "Individual" && !recipientUserId) return setError("Choose the person who should receive this notification.");
    if (audience === "AllUsers" || audience === "AllStaff") setConfirmOpen(true);
    else void doSend();
  }

  async function doSend() {
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        audience,
        recipientUserId: audience === "Individual" ? Number(recipientUserId) : null,
        title: title.trim(),
        message: message.trim(),
      };
      const response = await notificationsApi.sendAdmin(payload);
      const sentCount = response.data?.sentCount ?? 1;
      setResult(`Sent to ${sentCount} ${sentCount === 1 ? "recipient" : "recipients"}.`);
      setTitle("");
      setMessage("");
      setRecipientUserId("");
      setConfirmOpen(false);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "The notification couldn’t be sent. Your draft is still here—please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="admin-notifications-page">
      <header className="admin-notification-intro">
        <div className="admin-notification-intro-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></svg>
        </div>
        <div>
          <p className="notifications-page-eyebrow">Admin tools <span aria-hidden="true">/</span> Communication</p>
          <h1 className="text-2xl font-bold font-[var(--font-display)] text-white">Send an update</h1>
          <p className="text-sm text-[var(--color-dark-ink)] opacity-70 mt-1">Share an announcement with the right people.</p>
        </div>
      </header>

      {result && <div className="admin-notification-feedback is-success" role="status" aria-live="polite"><span aria-hidden="true">✓</span><div><strong>Notification sent</strong><span>{result}</span></div></div>}
      {error && <div className="admin-notification-feedback is-error" role="alert"><span aria-hidden="true">!</span><div><strong>Check your message</strong><span>{error}</span></div></div>}

      <form onSubmit={handleSubmitClick} className="admin-notification-composer" noValidate>
        <section className="admin-notification-section" aria-labelledby="notification-audience-heading">
          <div className="admin-notification-section-heading">
            <span className="admin-notification-step" aria-hidden="true">01</span>
            <div><h2 id="notification-audience-heading">Choose an audience</h2><p>Decide who should see this message.</p></div>
          </div>
          <div className="admin-notification-audiences" role="group" aria-labelledby="notification-audience-heading">
            {AUDIENCES.map((option) => (
              <button
                type="button"
                key={option.value}
                className={`admin-notification-audience ${audience === option.value ? "is-selected" : ""}`}
                aria-pressed={audience === option.value}
                onClick={() => { setAudience(option.value); setRecipientUserId(""); setError(""); setResult(""); }}
              >
                <span className="admin-notification-audience-icon" aria-hidden="true">{option.icon}</span>
                <span className="admin-notification-audience-copy"><strong>{option.title}</strong><small>{option.description}</small></span>
                <span className="admin-notification-selection-mark" aria-hidden="true">{audience === option.value ? "✓" : ""}</span>
              </button>
            ))}
          </div>
        </section>

        {audience === "Individual" && (
          <section className="admin-notification-section admin-notification-recipient" aria-labelledby="notification-recipient-heading">
            <div className="admin-notification-section-heading">
              <span className="admin-notification-step" aria-hidden="true">02</span>
              <div><h2 id="notification-recipient-heading">Select a person</h2><p>Search by name, email, or account number.</p></div>
            </div>
            {usersError ? (
              <div className="admin-notification-recipient-error" role="alert"><span>{usersError}</span><button type="button" onClick={() => void loadUsers()} disabled={loadingUsers}>{loadingUsers ? "Loading…" : "Try again"}</button></div>
            ) : (
              <>
                <label className="admin-notification-field" htmlFor="notification-user-search"><span>Find account</span>
                  <input id="notification-user-search" type="search" placeholder="e.g. Alex, name@example.com, or 1042" value={userSearch} onChange={(event) => setUserSearch(event.target.value)} autoComplete="off" />
                </label>
                <label className="admin-notification-field" htmlFor="notification-recipient"><span>Recipient</span>
                  <select id="notification-recipient" value={recipientUserId} onChange={(event) => setRecipientUserId(event.target.value)} disabled={loadingUsers} required>
                    <option value="">{loadingUsers ? "Loading accounts…" : "Choose an account"}</option>
                    {filteredUsers.map((user) => {
                      const id = user.User_ID ?? user.user_ID;
                      const name = user.Name ?? user.name ?? "Unnamed account";
                      const email = user.Email ?? user.email ?? "No email";
                      return <option key={id} value={id}>#{id} · {name} · {email}</option>;
                    })}
                  </select>
                </label>
                {!loadingUsers && filteredUsers.length === 0 && <p className="admin-notification-helper" role="status">No accounts match this search. Try another name or email.</p>}
                {selectedUser && <p className="admin-notification-selected">This message will go only to <strong>{selectedUser.Name ?? selectedUser.name}</strong>.</p>}
              </>
            )}
          </section>
        )}

        <section className="admin-notification-section" aria-labelledby="notification-content-heading">
          <div className="admin-notification-section-heading">
            <span className="admin-notification-step" aria-hidden="true">{audience === "Individual" ? "03" : "02"}</span>
            <div><h2 id="notification-content-heading">Write your message</h2><p>Keep it clear, useful, and easy to scan.</p></div>
          </div>
          <label className="admin-notification-field" htmlFor="notification-title"><span>Title <em>Required</em></span>
            <input id="notification-title" type="text" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Your order is on its way" maxLength={120} autoComplete="off" aria-describedby="notification-title-count" required />
            <small id="notification-title-count" className="admin-notification-count">{title.length} / 120</small>
          </label>
          <label className="admin-notification-field" htmlFor="notification-message"><span>Message <em>Required</em></span>
            <textarea id="notification-message" rows={5} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Add the details recipients need to know…" maxLength={1000} aria-describedby="notification-message-count" required />
            <small id="notification-message-count" className="admin-notification-count">{message.length} / 1000</small>
          </label>
        </section>

        <aside className="admin-notification-preview" aria-label="Notification preview">
          <div className="admin-notification-preview-top"><span className="admin-notification-preview-icon" aria-hidden="true">✳</span><span><strong>Recipient preview</strong><small>Only the selected audience will receive this.</small></span></div>
          <div className="admin-notification-preview-card">
            <span className="admin-notification-preview-audience">{audienceLabel}</span>
            <strong>{title.trim() || "Your notification title"}</strong>
            <p>{message.trim() || "Your message preview will appear here as you write."}</p>
          </div>
        </aside>

        <footer className="admin-notification-compose-footer">
          <p>Large announcements ask you to confirm before they’re sent.</p>
          <button type="submit" disabled={submitting || loadingUsers || (audience === "Individual" && (!recipientUserId || Boolean(usersError)))} className="admin-notification-send">
            {submitting ? <><span className="notification-loader" aria-hidden="true" />Sending…</> : <>Send notification <span aria-hidden="true">→</span></>}
          </button>
        </footer>
      </form>

      <ConfirmDialog
        open={confirmOpen}
        title={`Send this update to ${audience === "AllUsers" ? "all customers" : "all staff"}?`}
        description={`You’re about to send “${title.trim()}” to ${audienceLabel}. This will create a notification for every account in this group.`}
        warning="Please review the audience, title, and message before sending this broadcast."
        confirmLabel="Confirm and send"
        cancelLabel="Review message"
        tone="warning"
        busy={submitting}
        onConfirm={doSend}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
