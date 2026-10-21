import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Therynox Commerce OS',
  description: 'The foundation of the Therynox multi-vendor commerce platform.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
