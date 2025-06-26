// app/api/groups/[groupId]/messages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Group from '@/models/Group';
import GroupMember from '@/models/GroupMember';
import Message from '@/models/Message';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set.');
}

// Helper to get user ID from token
const getUserIdFromToken = (token: string) => {
  try {
    const decodedToken = jwt.verify(token, JWT_SECRET) as { id?: string; userId?: string; isSuperAdmin?: boolean };
    return new mongoose.Types.ObjectId(String(decodedToken.id || decodedToken.userId));
  } catch (error) {
    console.error('Invalid token:', error);
    return null;
  }
};

// GET method to fetch messages for a group
export async function GET(request: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  await connectDB();

  try {
    const { groupId } = await params;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return NextResponse.json({ success: false, error: 'معرف مجموعة غير صالح.' }, { status: 400 });
    }

    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'غير مصرح لك. الرجاء تسجيل الدخول.', redirectToLogin: true }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const userId = getUserIdFromToken(token);

    if (!userId) {
      return NextResponse.json({ success: false, error: 'غير مصرح لك. الرجاء تسجيل الدخول.', redirectToLogin: true }, { status: 401 });
    }

    // Check if user is a member of the group
    const isMember = await GroupMember.exists({
      group: groupId,
      user: userId
    });

    if (!isMember) {
      return NextResponse.json({ success: false, error: 'أنت لست عضوًا في هذه المجموعة.' }, { status: 403 });
    }

    // Get query parameters
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const skip = parseInt(url.searchParams.get('skip') || '0');

    // Fetch messages for the group
    const messages = await Message.find({ group: groupId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', 'name avatar')
      .populate('replyTo', 'content sender')
      .lean();

    // Format messages for client
    const formattedMessages = messages.map((msg: any) => ({
      id: msg._id.toString(),
      content: msg.content,
      type: msg.type || 'text',
      senderId: msg.sender?._id?.toString() || msg.sender?.toString(),
      senderName: msg.sender?.name || 'مستخدم',
      senderAvatar: msg.sender?.avatar || null,
      timestamp: msg.createdAt,
      replyTo: msg.replyTo ? {
        id: msg.replyTo._id?.toString() || msg.replyTo.toString(),
        content: msg.replyTo.content || '',
        senderId: msg.replyTo.sender?.toString() || ''
      } : null,
      attachments: msg.attachments || []
    }));

    return NextResponse.json({
      success: true,
      messages: formattedMessages,
      pagination: {
        total: await Message.countDocuments({ group: groupId }),
        limit,
        skip
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ success: false, error: error.message || 'خطأ داخلي في الخادم.' }, { status: 500 });
  }
}

// POST method to create a new message
export async function POST(request: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  await connectDB();

  try {
    const { groupId } = await params;
    const body = await request.json();
    const { content, type = 'text', replyTo, attachments } = body;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return NextResponse.json({ success: false, error: 'معرف مجموعة غير صالح.' }, { status: 400 });
    }

    if (!content && !attachments?.length) {
      return NextResponse.json({ success: false, error: 'محتوى الرسالة مطلوب.' }, { status: 400 });
    }

    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'غير مصرح لك. الرجاء تسجيل الدخول.', redirectToLogin: true }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const userId = getUserIdFromToken(token);

    if (!userId) {
      return NextResponse.json({ success: false, error: 'غير مصرح لك. الرجاء تسجيل الدخول.', redirectToLogin: true }, { status: 401 });
    }

    // Check if user is a member of the group
    const isMember = await GroupMember.exists({
      group: groupId,
      user: userId
    });

    if (!isMember) {
      return NextResponse.json({ success: false, error: 'أنت لست عضوًا في هذه المجموعة.' }, { status: 403 });
    }

    // Create new message
    const newMessage = new Message({
      content,
      type,
      sender: userId,
      group: groupId,
      replyTo: replyTo ? new mongoose.Types.ObjectId(replyTo) : undefined,
      attachments
    });

    await newMessage.save();

    // Populate sender info
    await newMessage.populate('sender', 'name avatar');

    // Format message for response
    const formattedMessage = {
      id: newMessage._id.toString(),
      content: newMessage.content,
      type: newMessage.type,
      senderId: (newMessage.sender as any)?._id?.toString() || newMessage.sender.toString(),
      senderName: (newMessage.sender as any)?.name || 'مستخدم',
      senderAvatar: (newMessage.sender as any)?.avatar || null,
      timestamp: newMessage.createdAt,
      replyTo: replyTo ? { id: replyTo } : null,
      attachments: newMessage.attachments || []
    };

    return NextResponse.json({
      success: true,
      message: formattedMessage
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating message:', error);
    return NextResponse.json({ success: false, error: error.message || 'خطأ داخلي في الخادم.' }, { status: 500 });
  }
}
