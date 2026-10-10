export default function Logo() {
  return (
    <span className="logo">
      <svg className="logo-mark" viewBox="0 0 32 32" width="28" height="28" aria-hidden="true" focusable="false">
        <rect width="32" height="32" rx="8" fill="#F2C230" />
        <path d="M6 24 C 12 24, 12 8, 18 8 S 24 24, 26 24" fill="none" stroke="#23272B" strokeWidth="5" strokeLinecap="round" />
        <path d="M6 24 C 12 24, 12 8, 18 8 S 24 24, 26 24" fill="none" stroke="#F2C230" strokeWidth="1.4" strokeDasharray="2.5 3" />
      </svg>
      <span className="logo-word">Motion</span>
    </span>
  );
}
