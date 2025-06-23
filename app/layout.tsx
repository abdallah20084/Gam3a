// app/layout.tsx
import { Inter } from 'next/font/google';
// app/layout.tsx أو pages/_app.tsx
import 'bootstrap/dist/css/bootstrap.min.css';
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
    // تأكد من عدم وجود أي مسافات أو أسطر جديدة هنا 
    <html lang="ar" dir="rtl">
      {/* لا تضع أي مسافات أو أسطر جديدة قبل <body className={inter.className}> */}
      <body style={{ background: "#f7fafd" }} className={inter.className}>
        {children}
      </body>
    </html>
  );
}