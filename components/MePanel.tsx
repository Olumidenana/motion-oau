'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { useMotion } from './StoreProvider';
import { useAsync } from './useAsync';
import SignInForm from './SignInForm';
import RunCard from './RunCard';
import { ListSkeleton, LoadError } from './RunList';
import { errorMessage } from '@/lib/errors';
import { DISPLAY_NAME_MAX } from '@/lib/store/types';

export default function MePanel() {
  const { store, viewer, ready } = useMotion();
  const profile = useAsync(() => (store && viewer ? store.getProfile() : undefined), [store, viewer?.id]);
  const runs = useAsync(() => (store && viewer ? store.myRuns() : undefined), [store, viewer?.id]);

  const [name, setName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile.data) {
      setName(profile.data.display_name);
      setIsPrivate(profile.data.is_private);
    }
  }, [profile.data]);

  if (!ready) return <ListSkeleton rows={2} />;
  if (!store) return <LoadError message="Motion couldn’t start. Check your data connection." onRetry={() => location.reload()} />;
  if (!viewer) {
    return (
      <SignInForm
        redirectPath="/me"
        intro="Sign in to schedule runs, join other people’s runs and keep track of where you’re going."
      />
    );
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!store) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const p = await store.updateProfile({ display_name: name, is_private: isPrivate });
      setName(p.display_name);
      setIsPrivate(p.is_private);
      setSaved(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const dirty = !!profile.data && (name !== profile.data.display_name || isPrivate !== profile.data.is_private);
  const unnamed = profile.data?.display_name === 'Runner';

  return (
    <>
      <p className="muted">
        Signed in as <strong>{viewer.email ?? 'you'}</strong>
      </p>

      {profile.error && !profile.data ? (
        <LoadError message={profile.error} onRetry={profile.reload} />
      ) : !profile.data ? (
        <ListSkeleton rows={1} />
      ) : (
        <form className="card form" onSubmit={save} noValidate>
          <h2 style={{ margin: 0 }}>Your profile</h2>
          {unnamed ? (
            <p className="notice notice-warn" style={{ margin: 0 }}>
              Add your name so runners know who’s coming. A first name is fine.
            </p>
          ) : null}
          <div className="field">
            <label htmlFor="display-name">Display name</label>
            <input
              id="display-name"
              className="input"
              value={name}
              maxLength={DISPLAY_NAME_MAX}
              autoComplete="given-name"
              onChange={(e) => {
                setName(e.target.value);
                setSaved(false);
              }}
              aria-describedby="name-hint"
            />
            <p id="name-hint" className="hint">
              Up to {DISPLAY_NAME_MAX} characters.
            </p>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => {
                setIsPrivate(e.target.checked);
                setSaved(false);
              }}
            />
            <span>
              <strong>Private profile</strong>
              <small>Other people see “A runner” instead of your name on runs you host or join.</small>
            </span>
          </label>
          {error ? (
            <p className="notice notice-error" role="alert" style={{ margin: 0 }}>
              {error}
            </p>
          ) : null}
          <div className="btn-row" style={{ alignItems: 'center' }}>
            <button className="btn" type="submit" disabled={saving || !dirty}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            {saved ? (
              <span role="status" className="muted">
                Saved.
              </span>
            ) : null}
          </div>
        </form>
      )}

      <section className="section" aria-labelledby="my-runs-heading">
        <div className="section-head">
          <h2 id="my-runs-heading">My upcoming runs</h2>
          <Link href="/runs/new">Schedule one</Link>
        </div>
        {runs.error && !runs.data ? (
          <LoadError message={runs.error} onRetry={runs.reload} />
        ) : !runs.data ? (
          <ListSkeleton rows={2} />
        ) : runs.data.length ? (
          <ul className="run-list">
            {runs.data.map((r) => (
              <li key={r.id}>
                <RunCard run={r} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty">
            <p>You’re not going to any runs yet. Join one, or schedule your own.</p>
            <div className="btn-row" style={{ justifyContent: 'center' }}>
              <Link className="btn btn-lane" href="/#next-runs">
                Find a run
              </Link>
              <Link className="btn btn-ghost" href="/runs/new">
                Schedule a run
              </Link>
            </div>
          </div>
        )}
      </section>

      <section className="section">
        <button type="button" className="btn btn-ghost" onClick={() => store.signOut().catch(() => undefined)}>
          Sign out
        </button>
      </section>
    </>
  );
}
