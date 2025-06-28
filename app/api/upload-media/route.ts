// app/api/upload-media/route.ts
import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';

// File type validation
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg'];
const ALLOWED_FILE_TYPES = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ 
        error: 'لم يتم رفع أي ملف.',
        arabicError: 'يرجى اختيار ملف للرفع'
      }, { status: 400 });
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: 'File size too large.',
        arabicError: `حجم الملف كبير جداً. الحد الأقصى ${(MAX_FILE_SIZE / (1024 * 1024)).toFixed(1)}MB`
      }, { status: 400 });
    }

    // Check file type
    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);
    const isDocument = ALLOWED_FILE_TYPES.some(ext => file.name.toLowerCase().endsWith(ext));

    if (!isImage && !isVideo && !isDocument) {
      return NextResponse.json({ 
        error: 'File type not supported.',
        arabicError: 'نوع الملف غير مدعوم. الأنواع المدعومة: صور، فيديو، مستندات'
      }, { status: 400 });
    }

    // For images, we could add moderation here
    if (isImage) {
      // TODO: Add image moderation logic here
      // For now, we'll just log that it's an image
      console.log('📸 Image uploaded:', file.name, 'Size:', file.size);
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const uniqueName = `${Date.now()}-${file.name}`;
    const uploadDir = path.join(process.cwd(), 'public/uploads');
    
    // Ensure upload directory exists
    const fs = require('fs');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    await writeFile(path.join(uploadDir, uniqueName), buf);
    
    console.log('✅ File uploaded successfully:', uniqueName);
    
    return NextResponse.json({ 
      message: `تم رفع الملف بنجاح`,
      filename: uniqueName,
      filepath: `/uploads/${uniqueName}`,
      fileType: isImage ? 'image' : isVideo ? 'video' : 'file',
      fileSize: file.size
    });
  } catch (error: any) {
    console.error('❌ Error uploading file:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to upload file.',
      arabicError: 'حدث خطأ أثناء رفع الملف. يرجى المحاولة مرة أخرى'
    }, { status: 500 });
  }
}