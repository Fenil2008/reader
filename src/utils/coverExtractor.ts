import * as pdfjsLib from 'pdfjs-dist';

// Utility to generate or extract real cover images from uploaded files
export async function extractPdfCover(file: File): Promise<string | null> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);

    const viewport = page.getViewport({ scale: 1.0 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return null;

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ 
      canvasContext: context, 
      viewport,
      canvas: canvas as any
    } as any).promise;
    return canvas.toDataURL('image/jpeg', 0.85);
  } catch (err) {
    console.warn('Could not extract PDF cover thumbnail:', err);
    return null;
  }
}

// Generate real typographic book cover SVG
export function generateTypographicCover(title: string, author: string): string {
  const safeTitle = (title || 'Untitled Book').slice(0, 45);
  const safeAuthor = (author || 'Unknown Author').slice(0, 30);

  const colors = [
    { bg: '#1e293b', border: '#334155', accent: '#60a5fa' },
    { bg: '#0f172a', border: '#1e293b', accent: '#38bdf8' },
    { bg: '#312e81', border: '#4338ca', accent: '#a5b4fc' },
    { bg: '#1c1917', border: '#292524', accent: '#fbbf24' },
    { bg: '#14532d', border: '#166534', accent: '#4ade80' }
  ];

  const charCode = (safeTitle.charCodeAt(0) || 0) + (safeTitle.charCodeAt(1) || 0);
  const theme = colors[charCode % colors.length];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600">
    <rect width="400" height="600" fill="${theme.bg}"/>
    <rect x="20" y="20" width="360" height="560" fill="none" stroke="${theme.border}" stroke-width="2" rx="8"/>
    <rect x="30" y="30" width="340" height="540" fill="none" stroke="${theme.border}" stroke-width="1" rx="6"/>
    <line x1="60" y1="120" x2="340" y2="120" stroke="${theme.accent}" stroke-width="2" stroke-linecap="round"/>
    <text x="200" y="220" font-family="Georgia, serif" font-size="28" font-weight="bold" fill="#ffffff" text-anchor="middle" width="300">
      ${safeTitle.length > 22 ? safeTitle.slice(0, 20) + '...' : safeTitle}
    </text>
    <line x1="160" y1="300" x2="240" y2="300" stroke="${theme.accent}" stroke-width="2" stroke-linecap="round"/>
    <text x="200" y="380" font-family="sans-serif" font-size="16" letter-spacing="2" font-weight="600" fill="#94a3b8" text-anchor="middle">
      ${safeAuthor.toUpperCase()}
    </text>
    <text x="200" y="520" font-family="sans-serif" font-size="11" letter-spacing="3" font-weight="700" fill="${theme.accent}" text-anchor="middle">
      LUMINA EDITION
    </text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
