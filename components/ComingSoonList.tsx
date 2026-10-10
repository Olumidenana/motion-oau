'use client';

import { useEffect, useState } from 'react';
import { useMotion } from './StoreProvider';
import { COMING_SOON } from '@/lib/features';
import { errorMessage } from '@/lib/errors';

const NOTIFIED_KEY = 'motion:notified';

function readNotified(): string[] {
  try {
    return JSON.parse(localStorage.getItem(NOTIFIED_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}

export default function ComingSoonList() {
  const { store, viewer, ready } = useMotion();
  const [notified, setNotified] = useState<string[]>([]);
  const [contact, setContact] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<{ slug: string; message: string } | null>(null);

  useEffect(() => setNotified(readNotified()), []);

  async function notify(slug: string) {
    if (!store) return;
    setBusy(slug);
    setError(null);
    try {
      // Signed-in people are linked by user_id, so there's no need to store their email again.
      await store.joinWaitlist(slug, viewer ? undefined : contact);
      const next = Array.from(new Set([...notified, slug]));
      setNotified(next);
      try {
        localStorage.setItem(NOTIFIED_KEY, JSON.stringify(next));
      } catch {
        // Not critical.
      }
    } catch (err) {
      setError({ slug, message: errorMessage(err) });
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      {ready && !viewer ? (
        <div className="card field" style={{ marginBottom: 16 }}>
          <label htmlFor="contact">How should we reach you? (optional)</label>
          <input
            id="contact"
            className="input"
            value={contact}
            maxLength={120}
            onChange={(e) => setContact(e.target.value)}
            placeholder="Email or WhatsApp number"
            autoComplete="email"
          />
          <p className="hint">Leave it blank and we’ll just count your vote.</p>
        </div>
      ) : null}
      <ul className="feature-list">
        {COMING_SOON.map((f) => {
          const done = notified.includes(f.slug);
          return (
            <li key={f.slug}>
              <article className="feature">
                <div className="feature-head">
                  <span className="feature-icon" aria-hidden="true">
                    {f.icon}
                  </span>
                  <div>
                    <h3>{f.name}</h3>
                    <span className="badge badge-draft">Coming soon</span>
                  </div>
                </div>
                <p>{f.description}</p>
                {done ? (
                  <span className="on-list" role="status">
                    ✓ You’re on the list
                  </span>
                ) : (
                  <button
                    type="button"
                    className="btn btn-small btn-ghost"
                    disabled={!store || busy === f.slug}
                    onClick={() => notify(f.slug)}
                    aria-label={`Notify me when ${f.name} launches`}
                  >
                    {busy === f.slug ? 'Adding…' : 'Notify me'}
                  </button>
                )}
                {error?.slug === f.slug ? (
                  <p className="notice notice-error" role="alert" style={{ margin: 0 }}>
                    {error.message}
                  </p>
                ) : null}
              </article>
            </li>
          );
        })}
      </ul>
    </>
  );
}
