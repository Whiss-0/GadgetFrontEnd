import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { contactApi } from "../api/client";

const CONTACT_TOPICS = [
  "Product question",
  "Order issue",
  "Return or refund request",
  "Complaint",
  "Feedback",
  "Other",
];

function PageShell({ eyebrow, title, intro, children }) {
  return (
    <div className="store-info-page max-w-4xl mx-auto px-5 py-10 sm:py-14">
      <header className="mb-7 border-b border-[var(--color-line)] pb-6">
        <p className="font-[var(--font-mono)] text-xs uppercase tracking-[0.16em] text-[var(--color-circuit)]">{eyebrow}</p>
        <h1 className="mt-2 font-[var(--font-display)] text-3xl sm:text-4xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-3 max-w-2xl text-[var(--color-ink-soft)] leading-relaxed">{intro}</p>
      </header>
      <div className="store-info-content space-y-6">{children}</div>
    </div>
  );
}

function InfoSection({ title, children }) {
  return (
    <section className="store-info-section">
      <h2>{title}</h2>
      <div>{children}</div>
    </section>
  );
}

export function AboutPage() {
  return (
    <PageShell
      eyebrow="About Techstead"
      title="Technology for everyday life."
      intro="Techstead is an online shop for gadgets and practical technology. We aim to make it straightforward to browse products, compare details, and get help with an order."
    >
      <InfoSection title="What we do">
        <p>We bring the store catalog, shopping cart, orders, and product reviews together in one place so shoppers can make informed choices about the technology they use every day.</p>
      </InfoSection>
      <InfoSection title="How we can help">
        <p>Questions about a product, an order, or a return? Use the <Link className="store-inline-link" to="/contact">Contact Us form</Link> and choose the topic that best matches your message. Store staff can review submissions in the Support Inbox.</p>
      </InfoSection>
      <div className="store-info-callout" role="note">
        <strong>Our promise:</strong> clear product information, a simple shopping experience, and a way to reach the shop when you need help.
      </div>
    </PageShell>
  );
}

export function ReturnPolicyPage() {
  return (
    <PageShell
      eyebrow="Customer care"
      title="Return Policy"
      intro="Need help with an item you ordered? Start by contacting the shop so the team can review your request and explain the next steps."
    >
      <InfoSection title="How to request help">
        <ol className="store-info-list list-decimal">
          <li>Open the <Link className="store-inline-link" to="/contact?topic=Return%20or%20refund%20request">Contact Us form</Link> and choose “Return or refund request.”</li>
          <li>Include your order number, the item involved, and a brief description of the issue.</li>
          <li>Wait for instructions from the shop before sending an item anywhere.</li>
        </ol>
      </InfoSection>
      <InfoSection title="Eligibility and timing">
        <p>Return windows, eligible items, item-condition requirements, shipping responsibility, and refund timing are store-specific details. They have not been supplied for this implementation, so this page does not promise a particular return period or outcome. Contact the shop to confirm the rules that apply to your order.</p>
      </InfoSection>
      <div className="store-info-callout" role="note">
        <strong>Store owner:</strong> replace this starter guidance with your approved return and refund rules before treating it as the final policy. Any published policy should be consistent with applicable consumer-protection requirements.
      </div>
    </PageShell>
  );
}

export function TermsOfServicePage() {
  return (
    <PageShell
      eyebrow="Store information"
      title="Terms of Service"
      intro="These starter terms describe basic expectations for using the Techstead storefront. They are not a substitute for the store’s final, owner-approved terms."
    >
      <InfoSection title="Using the storefront">
        <p>Use the site lawfully and provide accurate information when placing an order or contacting the shop. Keep your account credentials private and tell the shop if you believe your account has been used without permission.</p>
      </InfoSection>
      <InfoSection title="Products and orders">
        <p>Product descriptions and availability are shown to help shoppers make a choice. An order may require confirmation and remains subject to product availability and the information presented during checkout. If something about an order looks incorrect, contact the shop promptly.</p>
      </InfoSection>
      <InfoSection title="Site content and changes">
        <p>Store content is provided for browsing and shopping. The shop may update the storefront, product listings, or these terms. Changes to these starter terms should be reviewed and communicated before they are relied upon as final terms.</p>
      </InfoSection>
      <div className="store-info-callout" role="note">
        <strong>Before publishing as final:</strong> the store owner should add and review the official rules for pricing, payment, delivery, warranties, returns, privacy, disputes, and governing law. Do not rely on this starter page as legal advice.
      </div>
    </PageShell>
  );
}

export function ContactPage() {
  const [searchParams] = useSearchParams();
  const requestedTopic = searchParams.get("topic");
  const [form, setForm] = useState({
    name: "",
    email: "",
    topic: CONTACT_TOPICS.includes(requestedTopic) ? requestedTopic : "Feedback",
    orderReference: "",
    message: "",
    companyWebsite: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [ticketId, setTicketId] = useState(null);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setTicketId(null);

    try {
      const response = await contactApi.submit({
        Name: form.name.trim(),
        Email: form.email.trim(),
        Topic: form.topic,
        OrderReference: form.orderReference.trim(),
        Message: form.message.trim(),
        CompanyWebsite: form.companyWebsite,
      });
      setTicketId(response.data?.ticketId ?? null);
      setForm((current) => ({ ...current, name: "", email: "", orderReference: "", message: "", companyWebsite: "" }));
    } catch (requestError) {
      setError(requestError.response?.status === 429
        ? "Please wait a little before sending another message."
        : requestError.response?.data?.message || "We couldn’t send your message. Please check the form and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell
      eyebrow="We’re listening"
      title="Contact Us"
      intro="Send a question, complaint, return request, or feedback about the shop. Your message is saved for store staff to review in the Support Inbox."
    >
      {ticketId && (
        <div className="store-info-success" role="status" aria-live="polite">
          <strong>Message received.</strong> Your reference number is #{ticketId}. Keep it in case you need to follow up.
        </div>
      )}
      {error && <div className="store-info-error" role="alert">{error}</div>}

      <form className="contact-form spec-ticket" onSubmit={handleSubmit}>
        <div className="contact-form-grid">
          <div>
            <label htmlFor="contact-name">Your name</label>
            <input id="contact-name" name="name" type="text" autoComplete="name" value={form.name} onChange={updateField} maxLength={120} required />
          </div>
          <div>
            <label htmlFor="contact-email">Email for a reply</label>
            <input id="contact-email" name="email" type="email" autoComplete="email" value={form.email} onChange={updateField} maxLength={254} required />
          </div>
          <div>
            <label htmlFor="contact-topic">What is this about?</label>
            <select id="contact-topic" name="topic" value={form.topic} onChange={updateField} required>
              {CONTACT_TOPICS.map((topic) => <option key={topic} value={topic}>{topic}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="contact-order">Order number <span>(optional)</span></label>
            <input id="contact-order" name="orderReference" type="text" autoComplete="off" value={form.orderReference} onChange={updateField} maxLength={50} placeholder="For order-related questions" />
          </div>
          <div className="contact-form-wide">
            <label htmlFor="contact-message">Message</label>
            <textarea id="contact-message" name="message" value={form.message} onChange={updateField} minLength={10} maxLength={5000} rows={7} required placeholder="Tell us what happened or how we can help. Please don’t include passwords or payment-card details." />
            <p className="contact-form-hint">{form.message.length}/5000 characters. Please don’t include passwords or full payment-card details.</p>
          </div>
        </div>

        <div className="contact-honeypot" aria-hidden="true">
          <label htmlFor="contact-company-website">Leave this field empty</label>
          <input id="contact-company-website" name="companyWebsite" type="text" value={form.companyWebsite} onChange={updateField} tabIndex={-1} autoComplete="off" />
        </div>

        <div className="contact-form-footer">
          <p>Submitting this form stores your message and reply email for store staff to review. It does not send an automatic email receipt.</p>
          <button type="submit" className="btn-primary px-5 py-3 rounded-lg text-sm font-semibold" disabled={submitting}>
            {submitting ? "Sending…" : "Send message"}
          </button>
        </div>
      </form>
    </PageShell>
  );
}
