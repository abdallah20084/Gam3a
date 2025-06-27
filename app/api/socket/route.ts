import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // هذا الملف مطلوب لـ Next.js لمعالجة طلبات Socket.IO
  // Socket.IO يتم التعامل معه في server.ts
  return NextResponse.json({ message: 'Socket.IO endpoint' });
}

export async function POST(request: NextRequest) {
  return NextResponse.json({ message: 'Socket.IO endpoint' });
} 