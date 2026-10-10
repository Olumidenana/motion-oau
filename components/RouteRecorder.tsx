'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MapView from './MapView';
import { ROUTES } from '@/lib/routes';
import { formatDistance, haversine, pathLength, roundPoint, type LatLngTuple } from '@/lib/geo';

type Mode = 'walk' | 'draw';

const MAX_ACCURACY_M = 30;
const MIN_STEP_M = 5;

/** Same shape as `path` in lib/routes.ts: an array of [lat, lng] pairs, 5 decimal places. */
export function formatPath(points: LatLngTuple[]): string {
  if (!points.length) return '[]';
  return `[\n${points.map((p) => `  [${roundPoint(p)[0]}, ${roundPoint(p)[1]}]`).join(',\n')}\n]`;
}

export default function RouteRecorder() {
  const [mode, setMode] = useState<Mode>('walk');
  const [points, setPoints] = useState<LatLngTuple[]>([]);
  const [recording, setRecording] = useState(false);
  const [position, setPosition] = useState<LatLngTuple | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [showRoutes, setShowRoutes] = useState(true);
  const [copied, setCopied] = useState(false);
  const watchId = useRef<number | null>(null);
  const wakeLock = useRef<WakeLockSentinel | null>(null);

  const distance = useMemo(() => pathLength(points), [points]);
  const json = useMemo(() => formatPath(points), [points]);

  const stop = useCallback(() => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    wakeLock.current?.release().catch(() => undefined);
    wakeLock.current = null;
    setRecording(false);
  }, []);

  useEffect(() => stop, [stop]);

  function start() {
    if (!('geolocation' in navigator)) {
      setStatus('This browser can’t share your location. Use “Tap to draw” instead.');
      return;
    }
    setStatus('Finding you… stand still outside for a few seconds.');
    setRecording(true);
    navigator.wakeLock
      ?.request('screen')
      .then((l) => (wakeLock.current = l))
      .catch(() => undefined);
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const p: LatLngTuple = [pos.coords.latitude, pos.coords.longitude];
        const acc = pos.coords.accuracy;
        setAccuracy(acc);
        setPosition(p);
        if (acc > MAX_ACCURACY_M) {
          setStatus(`Waiting for a better GPS signal (±${Math.round(acc)} m). Points are only kept within ±${MAX_ACCURACY_M} m.`);
          return;
        }
        setStatus('Recording. Keep this screen open while you walk.');
        setPoints((prev) => {
          const last = prev[prev.length - 1];
          if (last && haversine(last, p) < MIN_STEP_M) return prev;
          return [...prev, p];
        });
      },
      (err) => {
        setStatus(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission was denied. Allow location for this site in your browser settings, or use “Tap to draw”.'
            : err.code === err.TIMEOUT
              ? 'Still waiting for GPS. Move somewhere with open sky.'
              : 'Couldn’t get your location. Check that location is turned on.',
        );
        if (err.code === err.PERMISSION_DENIED) stop();
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20_000 },
    );
  }

  const onMapClick = useCallback(
    (p: LatLngTuple) => {
      if (mode === 'draw') setPoints((prev) => [...prev, p]);
    },
    [mode],
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(json);
    } catch {
      const ta = document.getElementById('export') as HTMLTextAreaElement | null;
      ta?.select();
      document.execCommand('copy');
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  function download() {
    const blob = new Blob([json + '\n'], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `motion-route-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function switchMode(m: Mode) {
    if (m !== 'walk') stop();
    setMode(m);
  }

  return (
    <>
      <div className="tabs-inline" role="group" aria-label="Recording method">
        <button type="button" aria-pressed={mode === 'walk'} onClick={() => switchMode('walk')}>
          Walk &amp; record
        </button>
        <button type="button" aria-pressed={mode === 'draw'} onClick={() => switchMode('draw')}>
          Tap to draw
        </button>
      </div>

      <p className="muted small">
        {mode === 'walk'
          ? `Start at the beginning of the route and walk it. We keep a point every ${MIN_STEP_M} m or more, and skip readings less accurate than ±${MAX_ACCURACY_M} m.`
          : 'Tap along the road, from the start to the finish. Zoom in for accuracy.'}
      </p>

      <MapView
        label="Route recorder map"
        routes={showRoutes ? ROUTES : undefined}
        selectedSlug={showRoutes ? '__none__' : null}
        fit="campus"
        draftPath={points}
        userPosition={mode === 'walk' ? position : null}
        followUser={mode === 'walk' && recording}
        onMapClick={onMapClick}
        height="min(60vh, 480px)"
      />

      <div className="stats" aria-live="polite">
        <div className="stat">
          <span>Distance</span>
          <strong>{formatDistance(distance)}</strong>
        </div>
        <div className="stat">
          <span>Points</span>
          <strong>{points.length}</strong>
        </div>
        <div className="stat">
          <span>GPS accuracy</span>
          <strong>{mode === 'walk' && accuracy !== null ? `±${Math.round(accuracy)} m` : '—'}</strong>
        </div>
      </div>

      {status && mode === 'walk' ? (
        <p className="notice" role="status">
          {status}
        </p>
      ) : null}

      <div className="btn-row">
        {mode === 'walk' ? (
          recording ? (
            <button type="button" className="btn" onClick={stop}>
              Stop recording
            </button>
          ) : (
            <button type="button" className="btn btn-lane" onClick={start}>
              {points.length ? 'Resume recording' : 'Start recording'}
            </button>
          )
        ) : null}
        <button type="button" className="btn btn-ghost" onClick={() => setPoints((p) => p.slice(0, -1))} disabled={!points.length}>
          Undo last point
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            if (points.length < 3 || window.confirm('Clear the whole path?')) setPoints([]);
          }}
          disabled={!points.length}
        >
          Clear
        </button>
      </div>

      <label className="toggle" style={{ marginTop: 16 }}>
        <input type="checkbox" checked={showRoutes} onChange={(e) => setShowRoutes(e.target.checked)} />
        <span>
          <strong>Show draft routes</strong>
          <small>Faint reference lines for the current draft routes.</small>
        </span>
      </label>

      <section className="section card" aria-labelledby="export-heading">
        <h2 id="export-heading">Export</h2>
        <p className="muted small">
          This is the exact format of <code>path</code> in <code>lib/routes.ts</code>. Paste it over the draft path,
          then set <code>verified: true</code>. Distance is worked out from the path automatically.
        </p>
        <label htmlFor="export" className="visually-hidden">
          Path JSON
        </label>
        <textarea id="export" className="code" readOnly value={json} spellCheck={false} />
        <div className="btn-row" style={{ marginTop: 10 }}>
          <button type="button" className="btn" onClick={copy} disabled={points.length < 2}>
            {copied ? 'Copied' : 'Copy JSON'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={download} disabled={points.length < 2}>
            Download .json
          </button>
        </div>
      </section>
    </>
  );
}
