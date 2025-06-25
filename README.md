# 🎓 Gam3a - منصة التواصل التعليمي

## 📋 نظرة عامة

Gam3a هي منصة تعليمية متكاملة تهدف إلى تسهيل التواصل والتعلم بين الطلاب والمعلمين. تم تطويرها باستخدام أحدث التقنيات لتوفير تجربة تعليمية مميزة وآمنة.

## ✨ المميزات الرئيسية

### 🏫 إدارة المجموعات التعليمية
- إنشاء وإدارة المجموعات الدراسية
- مشاركة المحتوى التعليمي
- نظام عضوية متقدم
- إدارة الصلاحيات

### 💬 نظام المحادثات
- محادثات فورية في الوقت الحقيقي
- مشاركة الملفات والوسائط
- إشعارات فورية
- واجهة مستخدم حديثة

### 🛡️ نظام الأمان والفلترة
- **فلترة المحتوى الإباحي**: نظام متقدم لفحص الصور والفيديوهات
- **NSFW.js**: استخدام الذكاء الاصطناعي لتصنيف المحتوى
- **فحص أسماء الملفات**: منع رفع ملفات بأسماء مشبوهة
- **فلترة النص**: فحص النصوص للكلمات المحظورة

### 🎥 معالجة الوسائط
- **معالجة الفيديو**: تحويل وضغط الفيديوهات
- **إنشاء Thumbnails**: صور مصغرة تلقائية
- **فلترة المحتوى**: فحص تلقائي للمحتوى غير المناسب
- **دعم متعدد الصيغ**: MP4, WebM, AVI, MOV, JPG, PNG, GIF

## 🚀 التقنيات المستخدمة

### Frontend
- **Next.js 14** - إطار عمل React متقدم
- **TypeScript** - برمجة آمنة للنوع
- **Bootstrap 5** - تصميم متجاوب
- **TensorFlow.js** - معالجة الذكاء الاصطناعي

### Backend
- **Node.js** - بيئة تشغيل JavaScript
- **Express.js** - إطار عمل الخادم
- **MongoDB** - قاعدة بيانات NoSQL
- **Sharp** - معالجة الصور

### مكتبات الذكاء الاصطناعي
- **NSFW.js** - فلترة المحتوى الإباحي
- **TensorFlow.js** - معالجة الصور والفيديو

## 🛠️ التثبيت والإعداد

### المتطلبات الأساسية
- Node.js 18+
- npm أو yarn
- MongoDB

### خطوات التثبيت

1. **استنساخ المشروع**
```bash
git clone https://github.com/your-username/gam3a.git
cd gam3a
```

2. **تثبيت التبعيات**
```bash
npm install
```

3. **إعداد متغيرات البيئة**
```bash
cp .env.example .env
# تعديل ملف .env بالمعلومات المطلوبة
```

4. **تشغيل التطبيق**
```bash
npm run dev
```

## 📱 استخدام نظام الفلترة

### فلترة الصور
```typescript
import { contentFilter } from '@/lib/contentFilter';

// فحص صورة
const result = await contentFilter.checkImageFromFile(imageFile);
if (result.isSafe) {
  console.log('الصورة آمنة');
} else {
  console.log('الصورة تحتوي على محتوى غير مناسب');
}
```

### فلترة الفيديوهات
```typescript
// فحص فيديو
const videoCheck = await contentFilter.isVideoSafe(videoFile, 5);
if (videoCheck.isSafe) {
  console.log('الفيديو آمن');
}
```

### معالجة الفيديو
```typescript
import { videoProcessor } from '@/lib/videoProcessor';

// ضغط فيديو
const compressedVideo = await videoProcessor.compressVideo(file, 50);

// إنشاء thumbnail
const thumbnail = await videoProcessor.generateThumbnail(file, '00:00:01');
```

## 🔧 API Endpoints

### رفع الملفات مع الفلترة
```http
POST /api/upload-media
Content-Type: multipart/form-data

{
  "file": File,
  "type": "image" | "video"
}
```

**الاستجابة:**
```json
{
  "message": "File uploaded successfully",
  "filename": "unique-filename.jpg",
  "filepath": "/uploads/filename.jpg",
  "contentCheck": {
    "isSafe": true,
    "confidence": 0.95,
    "reason": "محتوى آمن"
  }
}
```

## 🛡️ نظام الأمان

### فلترة المحتوى
- **فحص الصور**: تحليل الألوان والمحتوى
- **فحص الفيديوهات**: استخراج وفحص الإطارات
- **فحص أسماء الملفات**: منع الكلمات المحظورة
- **مستويات الثقة**: تقييم دقيق للمحتوى

### تصنيفات المحتوى
- **Neutral**: محتوى محايد
- **Drawing**: رسوم
- **Hentai**: رسوم إباحية
- **Porn**: محتوى إباحي
- **Sexy**: محتوى مثير

## 📊 إحصائيات الأداء

### معالجة الفيديو
- **الحد الأقصى**: 100MB
- **وقت المعالجة**: 1-5 دقائق
- **ضغط تلقائي**: للملفات > 50MB

### فلترة المحتوى
- **دقة التصنيف**: 95%+
- **وقت الفحص**: 1-3 ثواني
- **عدد الإطارات**: 3-5 إطارات للفيديو

## 🤝 المساهمة

نرحب بمساهماتكم! يرجى اتباع الخطوات التالية:

1. Fork المشروع
2. إنشاء branch جديد (`git checkout -b feature/amazing-feature`)
3. Commit التغييرات (`git commit -m 'Add amazing feature'`)
4. Push إلى Branch (`git push origin feature/amazing-feature`)
5. فتح Pull Request

## 📄 الترخيص

هذا المشروع مرخص تحت رخصة MIT - راجع ملف [LICENSE](LICENSE) للتفاصيل.

## 📞 الدعم

للدعم والاستفسارات:
- 📧 البريد الإلكتروني: support@gam3a.com
- 💬 Discord: [رابط السيرفر]
- 📱 Telegram: [رابط القناة]

## 🙏 الشكر

شكر خاص لجميع المساهمين والمطورين الذين ساعدوا في تطوير هذه المنصة التعليمية.

---

**Gam3a** - منصة التواصل التعليمي المتقدمة 🎓
