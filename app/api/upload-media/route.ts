// app/api/upload-media/route.ts
import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File; // 'file' هو اسم الحقل الذي تتوقعه من الفورم

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    // تعريف المسار الذي تريد حفظ الملف فيه
    // تأكد أن المجلد 'public/uploads' موجود أو قم بإنشائه
    const uniqueName = `${Date.now()}-${file.name}`;
    const filePath = path.join(process.cwd(), 'public/uploads', uniqueName);

    await writeFile(filePath, buffer);

    return NextResponse.json({ message: 'File uploaded successfully', filename: uniqueName, filepath: `/uploads/${uniqueName}` }, { status: 200 });
  } catch (error: any) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: error.message || 'Failed to upload file.' }, { status: 500 });
  }
}