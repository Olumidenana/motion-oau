'use client';

import { useState, type FormEvent } from 'react';
import { useMotion } from './StoreProvider';
import { errorMessage } from '@/lib/errors';

interface Props {
  /** Where the magic link should bring the person back to. */
  redirectPath: string;
  title?: string;
  intro?: string;
}

export default function SignInForm({ redirectPath, title = 'Sign in', intro }: Props) {
  const { store } = useMotion();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const demo = store?.mode === 'demo';

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!store || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { sentLink } = await store.signIn(email, `${window.location.origin}${redirectPath}`);
      if (sentLink) setSentTo(email.trim());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (sentTo) {
    return (
      <div className="card" role="status">
        <h2>Check your email</h2>
        <p>
          We sent a sign-in link to <strong>{sentTo}</strong>. Open it on this phone to continue. It can take a minute
          to arrive — check your spam folder too.
        </p>
        <button type="button" className="btn btn-ghost btn-small" onClick={() => setSentTo(null)}>
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form className="card form" onSubmit={submit} noValidate>
      <div>
        <h2>{title}</h2>
        <p className="muted" style={{ margin: 0 }}>
          {intro ?? 'No password needed. Enter your email and we’ll send you a link to sign in.'}
        </p>
      </div>
      <div className="field">
        <label htmlFor="signin-email">Email address</label>
        <input
          id="signin-email"
          className="input"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'signin-error' : demo ? 'signin-demo' : undefined}
          placeholder="you@student.oauife.edu.ng"
        />
        {demo ? (
          <p id="signin-demo" className="hint">
            Demo mode: you’ll be signed in on this device straight away. No email is sent.
          </p>
        ) : null}
      </div>
      {error ? (
        <p id="signin-error" className="notice notice-error" role="alert">
          {error}
        </p>
      ) : null}
      <button className="btn" type="submit" disabled={!store || busy || !email.trim()}>
        {busy ? 'Sending…' : demo ? 'Sign in' : 'Email me a sign-in link'}
      </button>
    </form>
  );
}
