import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="empty" style={{ marginTop: 24 }}>
      <h1>Wrong turn</h1>
      <p>We couldn’t find that page. The road back is this way.</p>
      <Link className="btn" href="/">
        Back to runs
      </Link>
    </div>
  );
}
