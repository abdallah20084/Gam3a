// app/layout.tsx
import './globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Gam3a5G - نظام تواصل اجتماعي جامعي',
  description: 'منصة تواصل اجتماعي مخصصة للجامعات',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // تأكد من عدم وجود أي مسافات أو أسطر جديدة هنا 
    <html lang="ar" dir="rtl">
      {/* لا تضع أي مسافات أو أسطر جديدة قبل <body className={inter.className}> */}
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}