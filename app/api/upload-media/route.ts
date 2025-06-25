// app/api/upload-media/route.ts
import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

// دالة بسيطة لفحص الصورة بناءً على الألوان والمحتوى
async function checkImageContent(imageBuffer: Buffer): Promise<{
  isSafe: boolean;
  confidence: number;
  reason: string;
}> {
  try {
    // تحليل الصورة باستخدام Sharp
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    
    // فحص نسبة الألوان الحمراء (مؤشر محتمل للمحتوى الإباحي)
    const { data } = await image
      .resize(100, 100) // تصغير للتحليل السريع
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    let redPixels = 0;
    let totalPixels = 0;
    
    // حساب نسبة البكسل الحمراء
    for (let i = 0; i < data.length; i += 3) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // إذا كان اللون الأحمر هو المهيمن
      if (r > g * 1.5 && r > b * 1.5 && r > 150) {
        redPixels++;
      }
      totalPixels++;
    }
    
    const redRatio = redPixels / totalPixels;
    
    // فحص نسبة السطوع العالي (مؤشر محتمل للمحتوى الإباحي)
    let brightPixels = 0;
    for (let i = 0; i < data.length; i += 3) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      const brightness = (r + g + b) / 3;
      if (brightness > 200) {
        brightPixels++;
      }
    }
    
    const brightRatio = brightPixels / totalPixels;
    
    // قواعد الفلترة
    let isSafe = true;
    let confidence = 0.5;
    let reason = 'صورة عادية';
    
    // فحص نسبة اللون الأحمر العالية
    if (redRatio > 0.3) {
      isSafe = false;
      confidence = 0.7;
      reason = 'نسبة عالية من الألوان الحمراء';
    }
    
    // فحص نسبة السطوع العالية
    if (brightRatio > 0.4) {
      isSafe = false;
      confidence = 0.6;
      reason = 'سطوع عالي غير طبيعي';
    }
    
    // فحص حجم الصورة (الصور الكبيرة جداً قد تكون مشبوهة)
    if (metadata.width && metadata.height) {
      const aspectRatio = metadata.width / metadata.height;
      if (aspectRatio > 3 || aspectRatio < 0.33) {
        confidence = Math.min(confidence, 0.8);
        reason += ' - نسبة أبعاد غير طبيعية';
      }
    }
    
    return {
      isSafe,
      confidence,
      reason
    };
    
  } catch (error) {
    console.error('Image content check failed:', error);
    // في حالة الفشل، نعتبر الصورة آمنة
    return {
      isSafe: true,
      confidence: 0.5,
      reason: 'فشل في فحص الصورة - تم اعتبارها آمنة'
    };
  }
}

// دالة لفحص الفيديو (فحص metadata فقط)
async function checkVideoContent(videoBuffer: Buffer): Promise<{
  isSafe: boolean;
  confidence: number;
  reason: string;
}> {
  try {
    // فحص بسيط لحجم الفيديو ونوعه
    const fileSize = videoBuffer.length;
    const maxSize = 100 * 1024 * 1024; // 100MB
    
    if (fileSize > maxSize) {
      return {
        isSafe: false,
        confidence: 0.8,
        reason: 'حجم الفيديو كبير جداً'
      };
    }
    
    // فحص أول 1KB من الملف للتحقق من نوع الفيديو
    const header = videoBuffer.slice(0, 1024);
    const headerString = header.toString('hex');
    
    // فحص إذا كان الفيديو يحتوي على بيانات مشبوهة
    const suspiciousPatterns = [
      'ffd8ff', // JPEG
      '89504e47', // PNG
      '47494638', // GIF
    ];
    
    let isSafe = true;
    let confidence = 0.6;
    let reason = 'فيديو عادي';
    
    // فحص إذا كان الملف يحتوي على بيانات صور بدلاً من فيديو
    for (const pattern of suspiciousPatterns) {
      if (headerString.includes(pattern)) {
        confidence = Math.min(confidence, 0.7);
        reason = 'الملف قد يحتوي على بيانات صور بدلاً من فيديو';
        break;
      }
    }
    
    return {
      isSafe,
      confidence,
      reason
    };
    
  } catch (error) {
    console.error('Video content check failed:', error);
    return {
      isSafe: true,
      confidence: 0.5,
      reason: 'فشل في فحص الفيديو - تم اعتباره آمناً'
    };
  }
}

// دالة لفحص النص في اسم الملف
function checkFileName(fileName: string): {
  isSafe: boolean;
  confidence: number;
  reason: string;
} {
  const suspiciousWords = [
    'porn', 'sex', 'adult', 'xxx', 'nsfw', 'nude', 'naked',
    'porno', 'sexy', 'hot', 'erotic', 'explicit',
    'إباحي', 'جنس', 'عري', 'مثير', 'خليع'
  ];
  
  const lowerFileName = fileName.toLowerCase();
  
  for (const word of suspiciousWords) {
    if (lowerFileName.includes(word)) {
      return {
        isSafe: false,
        confidence: 0.9,
        reason: `اسم الملف يحتوي على كلمة مشبوهة: ${word}`
      };
    }
  }
  
  return {
    isSafe: true,
    confidence: 0.8,
    reason: 'اسم الملف آمن'
  };
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // فحص اسم الملف أولاً
    const fileNameCheck = checkFileName(file.name);
    if (!fileNameCheck.isSafe) {
      console.log('File name rejected:', {
        filename: file.name,
        reason: fileNameCheck.reason,
        confidence: fileNameCheck.confidence
      });
      
      return NextResponse.json({ 
        error: 'File name violates community guidelines.',
        details: {
          reason: fileNameCheck.reason,
          confidence: fileNameCheck.confidence
        }
      }, { status: 403 });
    }
    
    // فحص المحتوى بناءً على نوع الملف
    let contentCheck = { isSafe: true, confidence: 0.5, reason: 'محتوى عادي' };
    
    if (file.type.startsWith('image/')) {
      console.log('Checking image content...');
      contentCheck = await checkImageContent(buffer);
    } else if (file.type.startsWith('video/')) {
      console.log('Checking video content...');
      contentCheck = await checkVideoContent(buffer);
    }

    // إذا كان المحتوى غير آمن، رفض الرفع
    if (!contentCheck.isSafe) {
      console.log('Content rejected:', {
        filename: file.name,
        reason: contentCheck.reason,
        confidence: contentCheck.confidence
      });
      
      return NextResponse.json({ 
        error: 'Content violates community guidelines.',
        details: {
          reason: contentCheck.reason,
          confidence: contentCheck.confidence
        }
      }, { status: 403 });
    }

    // إذا كان المحتوى آمناً، متابعة الرفع
    const uniqueName = `${Date.now()}-${file.name}`;
    const filePath = path.join(process.cwd(), 'public/uploads', uniqueName);

    await writeFile(filePath, buffer);

    console.log('File uploaded successfully:', {
      filename: file.name,
      reason: contentCheck.reason,
      confidence: contentCheck.confidence
    });

    return NextResponse.json({ 
      message: 'File uploaded successfully', 
      filename: uniqueName, 
      filepath: `/uploads/${uniqueName}`,
      contentCheck: {
        isSafe: contentCheck.isSafe,
        confidence: contentCheck.confidence,
        reason: contentCheck.reason
      }
    }, { status: 200 });
    
  } catch (error: any) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: error.message || 'Failed to upload file.' }, { status: 500 });
  }
}