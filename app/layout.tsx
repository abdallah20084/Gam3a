// app/layout.tsx
import './styles/globals.css';
import './styles/group-chat.css';
import 'bootstrap/dist/css/bootstrap.rtl.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { Inter } from 'next/font/google';
import Navbar from '@/components/Navbar';
import Script from 'next/script';

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
        <Navbar />
        {children}
        
        {/* Bootstrap JS - تحميل من CDN للتأكد من عمل القوائم المنسدلة */}
        <Script 
          src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.7/dist/js/bootstrap.bundle.min.js" 
          integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" 
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        
        {/* إضافة كود لتهيئة Bootstrap */}
        <Script id="bootstrap-init" strategy="afterInteractive">
          {`
            document.addEventListener('DOMContentLoaded', function() {
              // تهيئة جميع القوائم المنسدلة
              var dropdownElementList = [].slice.call(document.querySelectorAll('[data-bs-toggle="dropdown"]'));
              dropdownElementList.map(function(element) {
                return new bootstrap.Dropdown(element);
              });
            });
          `}
        </Script>
      </body>
    </html>
  );
}






