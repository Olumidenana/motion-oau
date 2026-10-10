import { IS_DEMO } from '@/lib/config';

export default function DemoBanner() {
  if (!IS_DEMO) return null;
  return (
    <div className="demo-banner" role="note">
      <strong>Demo mode</strong> — data stays on this device.
    </div>
  );
}
