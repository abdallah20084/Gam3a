// app/layout.tsx
import 'bootstrap/dist/css/bootstrap.rtl.min.css'; // دعم RTL
import 'bootstrap-icons/font/bootstrap-icons.css'; // دعم أيقونات Bootstrap

import { Inter } from 'next/font/google';
const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Gam3a5G.com',
  description: 'منصة تواصل اجتماعي جامعي',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{ background: "#f7fafd" }} className={inter.className}>
        {children}
        {/* يمكنك إضافة bootstrap.bundle.min.js هنا كـ <script> إذا احتجت */}
      </body>
    </html>
  );
}