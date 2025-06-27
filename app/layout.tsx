// app/layout.tsx
import './globals.css';
import './group-chat.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { Inter } from 'next/font/google';
import Navbar from '@/components/Navbar';
import BootstrapClient from './bootstrap-client';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Gam3a5G.com',
  description: 'منصة تواصل اجتماعي جامعي',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{ background: "#f7fafd" }} className={inter.className}>
        <Navbar />
        <BootstrapClient />
        {children}
      </body>
    </html>
  );
}









