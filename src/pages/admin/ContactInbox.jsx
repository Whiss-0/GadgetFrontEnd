import { useCallback, useEffect, useState } from "react";
import { contactApi } from "../../api/client";

const STATUSES = ["New", "In Review", "Resolved"];

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown date" : date.toLocaleString();
}

export default function ContactInbox() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState(null);

  const loadMessages = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const response = await contactApi.adminList({ limit: 100 });
      setMessages(Array.isArray(response.data) ? response.data : []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Couldn’t load support messages. Check that the contact_messages table has been created and try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  const updateStatus = async (messageId, status) => {
    setSavingId(messageId);
    setError("");
    try {
      await contactApi.updateStatus(messageId, status);
      setMessages((current) => current.map((message) =>
        message.contactMessageId === messageId ? { ...message, status } : message
      ));
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Couldn’t update this message’s status. Please try again.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <section className="contact-inbox-page" aria-labelledby="contact-inbox-heading">
      <div className="contact-inbox-header">
        <div>
          <p className="admin-section-kicker">Customer care</p>
          <h2 id="contact-inbox-heading" className="admin-location-title">Support Inbox</h2>
          <p className="admin-location-subtitle">Messages submitted through the Contact Us form.</p>
        </div>
        <button type="button" className="admin-btn-secondary" onClick={() => loadMessages(true)} disabled={refreshing}>
          {refreshing ? "Refreshing…" : "Refresh messages"}
        </button>
      </div>

      {error && <div className="store-info-error" role="alert">{error}</div>}
      {loading ? (
        <div className="contact-inbox-state" role="status" aria-live="polite">Loading messages…</div>
      ) : messages.length === 0 ? (
        <div className="contact-inbox-state" role="status">No messages have been submitted yet.</div>
      ) : (
        <div className="contact-inbox-list">
          {messages.map((message) => (
            <article className="contact-message-card" key={message.contactMessageId}>
              <div className="contact-message-topline">
                <div>
                  <p className="contact-message-topic">{message.topic}</p>
                  <h3>{message.name}</h3>
                  <a href={`mailto:${message.email}`}>{message.email}</a>
                </div>
                <label className="contact-status-field">
                  <span>Status</span>
                  <select
                    value={message.status}
                    onChange={(event) => updateStatus(message.contactMessageId, event.target.value)}
                    disabled={savingId === message.contactMessageId}
                    aria-label={`Status for message ${message.contactMessageId}`}
                  >
                    {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </label>
              </div>
              <div className="contact-message-meta">
                <span>Reference #{message.contactMessageId}</span>
                {message.orderReference && <span>Order: {message.orderReference}</span>}
                <time dateTime={message.createdAt}>{formatDate(message.createdAt)}</time>
              </div>
              <p className="contact-message-body">{message.message}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
