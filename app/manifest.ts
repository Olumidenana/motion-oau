import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Motion — Never run alone at Great Ife',
    short_name: 'Motion',
    description: 'Group runs on campus routes at Obafemi Awolowo University.',
    start_url: '/',
    display: 'standalone',
    background_color: '#EEF3F1',
    theme_color: '#23272B',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
