import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import './globals.css';
import { StoreProvider } from '@/components/StoreProvider';
import TabBar from '@/components/TabBar';
import DemoBanner from '@/components/DemoBanner';
import Logo from '@/components/Logo';

export const metadata: Metadata = {
  metadataBase: process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? new URL(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`)
    : undefined,
  title: { default: 'Motion — Never run alone at Great Ife', template: '%s · Motion' },
  description:
    'Find running routes around Obafemi Awolowo University, schedule group runs and join other students. Never run alone at Great Ife.',
  applicationName: 'Motion',
  openGraph: {
    title: 'Motion — Never run alone at Great Ife',
    description: 'Group runs on campus routes at OAU, Ile-Ife.',
    type: 'website',
    locale: 'en_NG',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#23272B' },
    { media: '(prefers-color-scheme: dark)', color: '#15181A' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NG">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..100,400..800&display=swap"
        />
      </head>
      <body>
        <StoreProvider>
          <a className="skip-link" href="#main">
            Skip to content
          </a>
          <header className="site-header">
            <div className="site-header-inner">
              <Link href="/" className="brand" aria-label="Motion home">
                <Logo />
              </Link>
              <TabBar />
            </div>
          </header>
          <DemoBanner />
          <main id="main" className="page">
            {children}
          </main>
          <footer className="site-footer">
            <p>
              Motion is made by students, for students at Obafemi Awolowo University, Ile-Ife. Not an official OAU
              service.
            </p>
            <p>Run with others, stay hydrated, and look out for each other.</p>
          </footer>
        </StoreProvider>
      </body>
    </html>
  );
}
