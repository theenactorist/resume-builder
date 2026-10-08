import './globals.css';

const siteUrl = 'https://ooc-resume-builder.up.railway.app/';
const shareTitle = 'Automate your resume tailoring. | Resume Engine';
const shareDescription = 'A targeted resume, cover letter, and outreach — from your experience.';
const shareImageUrl = 'https://ooc-resume-builder.up.railway.app/resume-engine-og.png';
const shareImageAlt = 'Resume Engine: Automate your resume tailoring. Your experience and a role description become an application draft.';

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Resume Engine',
  description: shareDescription,
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    type: 'website',
    url: siteUrl,
    siteName: 'Resume Engine',
    title: shareTitle,
    description: shareDescription,
    images: [{
      url: shareImageUrl,
      width: 1200,
      height: 630,
      type: 'image/png',
      alt: shareImageAlt,
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: shareTitle,
    description: shareDescription,
    images: [{ url: shareImageUrl, alt: shareImageAlt }],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
