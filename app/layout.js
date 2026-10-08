import './globals.css';

export const metadata = {
  title: 'Resume Engine',
  description: 'Tailor a resume and cover letter from your own experience and a job description.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
