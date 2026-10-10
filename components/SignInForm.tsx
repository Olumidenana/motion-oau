'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useMotion } from './StoreProvider';
import { errorMessage } from '@/lib/errors';

interface Props {
  /** Where a magic link should bring the person back to (Supabase only). */
  redirectPath: string;
  title?: string;
  intro?: string;
}

type PasswordMode = 'sign-in' | 'sign-up' | 'reset';

/** Google won't sign people in from inside some apps' built-in browsers. */
function inAppBrowser(): boolean {
  return /FBAN|FBAV|Instagram|Line\/|Snapchat|TikTok|; wv\)/i.test(navigator.userAgent);
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true" focusable="false">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export default function SignInForm({ redirectPath, title = 'Sign in', intro }: Props) {
  const { store } = useMotion();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pwMode, setPwMode] = useState<PasswordMode>('sign-in');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [webview, setWebview] = useState(false);

  useEffect(() => setWebview(inAppBrowser()), []);

  const methods = store?.authMethods ?? [];
  const usesLink = methods.includes('instant') || methods.includes('magic-link');
  const demo = methods.includes('instant');

  async function run(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await fn();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function submitLink(e: FormEvent) {
    e.preventDefault();
    run(async () => {
      const res = await store!.signIn!(email, `${window.location.origin}${redirectPath}`);
      if (res.sentLink) setSentTo(email.trim());
    });
  }

  function submitPassword(e: FormEvent) {
    e.preventDefault();
    run(async () => {
      if (pwMode === 'reset') {
        await store!.sendPasswordReset!(email);
        setNotice('If there’s an account with that email, we’ve sent a link to reset your password. Check your spam folder too.');
        setPwMode('sign-in');
      } else {
        await store!.signInWithPassword!(email, password, pwMode);
      }
    });
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

  const errorBox = error ? (
    <p id="signin-error" className="notice notice-error" role="alert" style={{ margin: 0 }}>
      {error}
    </p>
  ) : null;

  const emailField = (
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
  );

  if (usesLink) {
    return (
      <form className="card form" onSubmit={submitLink} noValidate>
        <div>
          <h2>{title}</h2>
          <p className="muted" style={{ margin: 0 }}>
            {intro ?? 'No password needed. Enter your email and we’ll send you a link to sign in.'}
          </p>
        </div>
        {emailField}
        {errorBox}
        <button className="btn" type="submit" disabled={!store || busy || !email.trim()}>
          {busy ? 'Sending…' : demo ? 'Sign in' : 'Email me a sign-in link'}
        </button>
      </form>
    );
  }

  // Firebase: Google first, email + password as the fallback.
  return (
    <div className="card form">
      <div>
        <h2>{title}</h2>
        <p className="muted" style={{ margin: 0 }}>
          {intro ?? 'Sign in with Google in one tap, or use your email and a password.'}
        </p>
      </div>

      {methods.includes('google') ? (
        <>
          {webview ? (
            <p className="notice notice-warn" style={{ margin: 0 }}>
              Google sign-in doesn’t work inside this app’s browser. Open this page in Chrome, or use email and password
              below.
            </p>
          ) : null}
          <button type="button" className="btn btn-ghost btn-block" disabled={!store || busy} onClick={() => run(() => store!.signInWithGoogle!())}>
            <GoogleIcon /> Continue with Google
          </button>
        </>
      ) : null}

      {methods.includes('password') ? (
        <>
          <p className="divider" aria-hidden="true">
            <span>or with email</span>
          </p>
          <form className="form" onSubmit={submitPassword} noValidate>
            {emailField}
            {pwMode !== 'reset' ? (
              <div className="field">
                <label htmlFor="signin-password">{pwMode === 'sign-up' ? 'Choose a password' : 'Password'}</label>
                <div className="password-row">
                  <input
                    id="signin-password"
                    className="input"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={pwMode === 'sign-up' ? 'new-password' : 'current-password'}
                    required
                    minLength={pwMode === 'sign-up' ? 8 : undefined}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-describedby={pwMode === 'sign-up' ? 'pw-hint' : undefined}
                  />
                  <button type="button" className="btn btn-ghost btn-small" onClick={() => setShowPassword((s) => !s)} aria-pressed={showPassword}>
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                {pwMode === 'sign-up' ? (
                  <p id="pw-hint" className="hint">
                    At least 8 characters.
                  </p>
                ) : null}
              </div>
            ) : null}
            {errorBox}
            {notice ? (
              <p className="notice" role="status" style={{ margin: 0 }}>
                {notice}
              </p>
            ) : null}
            <button className="btn" type="submit" disabled={!store || busy || !email.trim() || (pwMode !== 'reset' && !password)}>
              {busy
                ? 'Please wait…'
                : pwMode === 'sign-up'
                  ? 'Create account'
                  : pwMode === 'reset'
                    ? 'Send reset link'
                    : 'Sign in'}
            </button>
          </form>
          <div className="btn-row small">
            {pwMode === 'sign-in' ? (
              <>
                <button type="button" className="link-button" onClick={() => setPwMode('sign-up')}>
                  New here? Create an account
                </button>
                <button type="button" className="link-button" onClick={() => setPwMode('reset')}>
                  Forgot password?
                </button>
              </>
            ) : (
              <button type="button" className="link-button" onClick={() => setPwMode('sign-in')}>
                Have an account? Sign in
              </button>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
