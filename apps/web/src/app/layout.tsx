import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SmartShift AI',
  description: 'Intelligent workforce scheduling platform',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
