import './globals.css';

export const metadata = {
  title: 'Resume Engine — Olumide Olusesi',
  description: 'AI-powered targeted resume and cover letter generator',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
