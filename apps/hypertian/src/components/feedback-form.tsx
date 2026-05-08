'use client';

import { useState } from 'react';

const CATEGORIES: { value: 'bug' | 'ad-issue' | 'feature' | 'other'; label: string }[] = [
  { value: 'bug', label: 'Bug report' },
  { value: 'ad-issue', label: 'Ad issue' },
  { value: 'feature', label: 'Feature idea' },
  { value: 'other', label: 'Other' },
];

export function FeedbackForm() {
  const [category, setCategory] = useState<'bug' | 'ad-issue' | 'feature' | 'other'>('bug');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [contextUrl, setContextUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/public/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, message, email: email || undefined, contextUrl: contextUrl || undefined }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send feedback.');
      }
      setDone(true);
      setMessage('');
      setEmail('');
      setContextUrl('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send feedback.');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="panel rounded-3xl p-6">
        <div className="status-note" data-tone="success">Thanks — your feedback is in the moderation inbox.</div>
        <button className="primary-button mt-4" onClick={() => setDone(false)} type="button">Send another</button>
      </div>
    );
  }

  return (
    <div className="panel rounded-3xl p-5 md:p-6">
      <div className="grid gap-3">
        <label className="grid gap-1.5 text-[11px] uppercase tracking-[0.2em] text-[var(--color-copy-faint)]">
          Category
          <select className="field" onChange={(e) => setCategory(e.target.value as typeof category)} value={category}>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-[11px] uppercase tracking-[0.2em] text-[var(--color-copy-faint)]">
          Message
          <textarea
            className="field min-h-[140px]"
            maxLength={4000}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What happened? What were you trying to do?"
            value={message}
          />
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1.5 text-[11px] uppercase tracking-[0.2em] text-[var(--color-copy-faint)]">
            Email (optional)
            <input
              className="field"
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              type="email"
              value={email}
            />
          </label>
          <label className="grid gap-1.5 text-[11px] uppercase tracking-[0.2em] text-[var(--color-copy-faint)]">
            Context URL (optional)
            <input
              className="field"
              onChange={(e) => setContextUrl(e.target.value)}
              placeholder="https://..."
              value={contextUrl}
            />
          </label>
        </div>
        {error ? <div className="status-note" data-tone="danger">{error}</div> : null}
        <div className="flex justify-end">
          <button className="primary-button" disabled={submitting || message.length < 5} onClick={() => void submit()} type="button">
            {submitting ? 'Sending…' : 'Send feedback'}
          </button>
        </div>
      </div>
    </div>
  );
}
