import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ClipTrack - Admin Clip Management System',
  description: 'Production-ready personal clip tracking system for single administrator',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-foreground min-h-screen antialiased selection:bg-accent-purple/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
