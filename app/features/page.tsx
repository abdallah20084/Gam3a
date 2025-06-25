"use client";
import { FaShareAlt, FaImage, FaVideo, FaBell, FaMoon, FaSearch, FaLock, FaHashtag, FaShieldAlt, FaMicrophone, FaExternalLinkAlt, FaFilePdf, FaUserCheck, FaThLarge } from 'react-icons/fa';
import Link from "next/link";

const features = [
  {
    icon: <FaShareAlt size={32} className="text-primary" />, title: "مشاركة الوسائط بسهولة", desc: "شارك الصور والفيديوهات مع أصدقائك بضغطة زر وادعم المشاركة على الشبكات الاجتماعية." },
  { icon: <FaImage size={32} className="text-success" />, title: "عرض احترافي للصور", desc: "استعرض الصور بحجمها الكامل مع إمكانية التكبير عند الضغط عليها." },
  { icon: <FaVideo size={32} className="text-danger" />, title: "معاينة الفيديوهات والروابط تلقائياً", desc: "شاهد معاينة مباشرة لأي فيديو أو رابط يوتيوب أو انستجرام داخل الدردشة." },
  { icon: <FaBell size={32} className="text-warning" />, title: "نظام إشعارات فوري", desc: "استقبل تنبيهات عند وصول رسائل جديدة أو انضمام أعضاء جدد للمجموعة." },
  { icon: <FaMoon size={32} className="text-dark" />, title: "وضع ليلي عصري", desc: "استمتع بواجهة مريحة للعين مع دعم الوضع الليلي الكامل." },
  { icon: <FaSearch size={32} className="text-info" />, title: "بحث سريع", desc: "ابحث عن أي مستخدم أو رسالة أو وسائط في ثوانٍ." },
  { icon: <FaLock size={32} className="text-secondary" />, title: "أمان متقدم", desc: "تسجيل دخول آمن مع دعم التحقق بخطوتين وحماية بياناتك." },
  { icon: <FaHashtag size={32} className="text-primary" />, title: "دعم الوسوم والمنشن", desc: "استخدم الوسوم (#) والمنشن (@) لربط الرسائل والمستخدمين بسهولة." },
  { icon: <FaShieldAlt size={32} className="text-success" />, title: "تصفية وتحليل المحتوى", desc: "فلترة تلقائية للصور والكلمات غير اللائقة لحماية المجتمع." },
  { icon: <FaMicrophone size={32} className="text-danger" />, title: "رسائل صوتية", desc: "سجّل وأرسل رسائل صوتية بسهولة كما في تيليجرام وواتساب." },
  { icon: <FaExternalLinkAlt size={32} className="text-info" />, title: "مشاركة الرسائل خارج التطبيق", desc: "شارك أي رسالة أو وسائط على فيسبوك، تويتر، وغيرها بضغطة زر." },
  { icon: <FaFilePdf size={32} className="text-danger" />, title: "دعم ملفات PDF وملفات أخرى", desc: "ارفع وشارك ملفات PDF وملفات متنوعة مع الأعضاء." },
  { icon: <FaUserCheck size={32} className="text-success" />, title: "حالة الاتصال الفوري", desc: "شاهد من متصل الآن في المجموعة مع لمبة الحالة بجانب كل عضو." },
  { icon: <FaThLarge size={32} className="text-primary" />, title: "تبويبات ذكية للوسائط", desc: "تنقل بسهولة بين تبويبات الصور، الفيديو، الملفات، وغيرها داخل كل مجموعة." },
];

export default function FeaturesPage() {
  return (
    <div className="container py-5" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)', minHeight: '100vh' }}>
      <h1 className="text-center mb-4 fw-bold" style={{ color: '#3b3b98', letterSpacing: 1 }}>مميزات التطبيق</h1>
      <div className="row g-4 justify-content-center">
        {features.map((f, i) => (
          <div className="col-12 col-md-6 col-lg-4" key={i}>
            <div className="card shadow-sm h-100 border-0" style={{ borderRadius: 18, background: '#fff' }}>
              <div className="card-body d-flex flex-column align-items-center text-center">
                <div className="mb-3">{f.icon}</div>
                <h5 className="fw-bold mb-2" style={{ color: '#222f3e' }}>{f.title}</h5>
                <p className="text-muted mb-0" style={{ fontSize: 15 }}>{f.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="text-center mt-5">
        <Link href="/" className="btn btn-lg btn-primary px-5 shadow" style={{ borderRadius: 24, fontWeight: 600 }}>العودة للرئيسية</Link>
      </div>
    </div>
  );
} 