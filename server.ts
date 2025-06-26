// Agregar definiciones de variables globales al principio del archivo
import dotenv from 'dotenv';
dotenv.config();

import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';
import mongoose from 'mongoose';
import * as jwt from 'jsonwebtoken';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

// Definir variables globales
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set.');
}

// Variables para Socket.IO
let io: SocketIOServer | null = null;

// Variables para el servidor Next.js
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Estructuras de datos para seguimiento de usuarios
const connectedUsers = new Map<string, {
  userId: string;
  socketId: string;
  groups: Set<string>;
  lastActivity: Date;
}>();

const userConnectionCount = new Map<string, number>();

// Setup DOMPurify for server-side sanitization
const window = new JSDOM('').window as unknown as Window;
const domPurify = DOMPurify(window as any);

// Definir tipo para mensajes formateados
interface FormattedMessage {
  id: string;
  groupId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string | null;
  content: string;
  timestamp: string;
  isEdited?: boolean;
  isSystemMessage?: boolean;
  type: string;
  replyTo?: string;
}

// Import your Mongoose models and db connection
import connectDB from './lib/db';
import Message, { IMessage } from './models/Message';
import GroupMember from './models/GroupMember';
import User, { IUser } from './models/User';
import Group, { IGroup } from './models/Group';

// تعريف أنواع مخصصة لتجنب أخطاء TypeScript مع Mongoose 7
type MessageDocument = mongoose.Document & IMessage;
type GroupDocument = mongoose.Document & IGroup;
type UserDocument = mongoose.Document & IUser;

// تعديل تعريف MessageLeanType
type MessageLeanType = {
  _id: mongoose.Types.ObjectId;
  group: mongoose.Types.ObjectId | string;
  sender: mongoose.Types.ObjectId | string;
  content: string;
  type: string;
  timestamp: Date;
};

type GroupLeanType = {
  _id: mongoose.Types.ObjectId;
  admin: mongoose.Types.ObjectId;
  name?: string;
  description?: string;
  coverImageUrl?: string;
};

type UserLeanNameType = Pick<IUser, '_id' | 'name'> & {
  name: string;
};

app.prepare().then(() => {
  console.log('Next.js app prepared. Creating HTTP server...');
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    console.log(`[HTTP Request] Method: ${req.method}, URL: ${req.url}`);
    handle(req, res, parsedUrl);
  });

  io = new SocketIOServer(httpServer, {
    path: '/api/socket',
    addTrailingSlash: false,
    pingTimeout: 60000,
    pingInterval: 25000,
    cors: {
      origin: process.env.NODE_ENV === 'production'
         ["http://localhost:3001", "http://127.0.0.1:3001"],
      methods: ["GET", "POST"],
      credentials: true,
      allowedHeaders: ["authorization", "content-type"]    },
    transports: ['polling', 'websocket'], // البدء بـ polling ثم الترقية إلى websocket
    allowEIO3: true,
    connectTimeout: 45000, // زيادة مهلة الاتصال
  });

  console.log('Socket.IO: Server initialized successfully via custom server.');
  console.log(`Server using JWT_SECRET for verification (first 10 chars): ${JWT_SECRET!.substring(0, 10)}...`);

  if (io) {
    setInterval(() => {
      const now = new Date();
      connectedUsers.forEach((user, socketId) => {
        if (now.getTime() - user.lastActivity.getTime() > 120000) {
          console.log(`Socket.IO: Disconnecting inactive socket ${socketId} (User: ${user.userId})`);
          io!.sockets.sockets.get(socketId)?.disconnect();
        }
      });
    }, 60000);

    io.on('connection', (socket) => {
      console.log(`Socket.IO: Client connected - ID: ${socket.id}`);

      const updateActivity = () => {
        const user = connectedUsers.get(socket.id);
        if (user) {
          user.lastActivity = new Date();
        }
      };
      socket.onAny(updateActivity);

      // متغير لتخزين اسم المستخدم الحالي
      let currentUserName: string | null = null;
      let currentUserId: string | null = null;

      socket.on('joinGroup', async (groupId: string, token: string) => {
        try {
          await connectDB();

          if (!mongoose.Types.ObjectId.isValid(groupId)) {
            socket.emit('errorJoiningGroup', 'معرف مجموعة غير صالح.');
            socket.disconnect();
            return;
          }

          let userId: mongoose.Types.ObjectId;
          try {
            const decodedToken = jwt.verify(token, JWT_SECRET) as { id?: string; userId?: string };
            userId = new mongoose.Types.ObjectId(String(decodedToken.id || decodedToken.userId));
            currentUserId = userId.toString();
          } catch (jwtError: any) {
            socket.emit('authError', 'جلسة غير صالحة أو منتهية الصلاحية. الرجاء إعادة تسجيل الدخول.');
            socket.disconnect();
            return;
          }

          const userDoc = await User.findById(userId, { name: 1 }).lean() as unknown as { name: string } | null;
          currentUserName = userDoc?.name || 'مستخدم';
          if (!userDoc) {
            socket.emit('errorJoiningGroup', 'المستخدم غير موجود.');
            socket.disconnect();
            return;
          }
          const isMember = await GroupMember.exists({ group: groupId, user: userId });
          if (!isMember) {
            socket.emit('errorJoiningGroup', 'غير مصرح لك بالانضمام إلى هذه المجموعة.');
            socket.disconnect();
            return;
          }

          socket.join(groupId);

          let userData = connectedUsers.get(socket.id);
          if (!userData) {
            userData = {
              userId: userId.toString(),
              socketId: socket.id,
              groups: new Set(),
              lastActivity: new Date()
            };
            connectedUsers.set(socket.id, userData);
          }
          userData.groups.add(groupId);

          userConnectionCount.set(userId.toString(), (userConnectionCount.get(userId.toString()) || 0) + 1);
          if (userConnectionCount.get(userId.toString()) === 1 && io) {
            io.emit('userStatusUpdate', { userId: userId.toString(), isOnline: true });
          }

          // بث رسالة انضمام عضو جديد
          if (io) {
            io.to(groupId).emit('receiveMessage', {
              id: new mongoose.Types.ObjectId().toString(),
              groupId,
              senderId: userId.toString(),
              senderName: currentUserName,
              senderAvatar: null,
              content: `🟢 ${currentUserName} انضم إلى المجموعة.`,
              timestamp: new Date().toISOString(),
              isSystemMessage: true,
            });
          }

          // جلب الرسائل القديمة
          const oldMessages = await Message.find({ group: groupId })
            .sort({ timestamp: -1 })
            .limit(50)
            .populate('sender', 'name avatar')
            .lean();

          if (!Array.isArray(oldMessages)) {
            socket.emit('errorJoiningGroup', 'حدث خطأ أثناء جلب الرسائل القديمة.');
            socket.disconnect();
            return;
          }
          for (const msg of oldMessages) {
            // إذا كان sender عبارة عن ObjectId أو لا يوجد name
            if (
              !msg.sender ||
              typeof msg.sender !== 'object' ||
              !('name' in msg.sender)
            ) {
              socket.emit('errorJoiningGroup', 'حدث خطأ أثناء جلب بيانات المرسل.');
              socket.disconnect();
              return;
            }
          }
          const formattedOldMessages: FormattedMessage[] = oldMessages.map((msg) => {
            // تأكد أن sender هو object وفيه name وavatar
            const sender = (typeof msg.sender === 'object' && msg.sender && 'name' in msg.sender)
              ? msg.sender as { _id: any; name: string; avatar?: string }
              : { _id: '', name: 'مستخدم', avatar: null };

            return {
              id: msg._id.toString(),
              groupId: msg.group.toString(),
              senderId: sender._id.toString(),
              senderName: sender.name,
              senderAvatar: sender.avatar || null,
              content: msg.content,
              timestamp: msg.timestamp.toISOString(),
              isEdited: false,
              type: msg.type || 'text',
              replyTo: msg.replyTo?.toString(),
            };
          });

          socket.emit('joinedGroup', {
            groupId,
            messages: formattedOldMessages,
          });

        } catch (error: any) {
          socket.emit('errorJoiningGroup', 'حدث خطأ غير متوقع أثناء الانضمام إلى المجموعة. الرجاء المحاولة لاحق.');
          socket.disconnect();
        }
      });

      socket.on('sendMessage', async (data: { groupId: string; content: string; token: string; type?: string; replyTo?: string }) => {
        try {
          await connectDB();
          const { groupId, content, token, type, replyTo } = data;

          if (!mongoose.Types.ObjectId.isValid(groupId)) {
            socket.emit('messageError', 'معرف مجموعة غير صالح لإرسال الرسالة.');
            return;
          }

          // تنظيف المحتوى من أي أكواد ضارة
          const sanitizedContent = domPurify.sanitize(content.trim());
          if (!sanitizedContent) {
            socket.emit('messageError', 'محتوى الرسالة لا يمكن أن يكون فارغاً.');
            return;
          }

          if (sanitizedContent.length > 1000) {
            socket.emit('messageError', 'الرسالة طويلة (الحد الأقصى 1000 حرف).');
            return;
          }

          let userId: mongoose.Types.ObjectId;
          try {
            const decodedToken = jwt.verify(token, JWT_SECRET) as { id?: string; userId?: string };
            userId = new mongoose.Types.ObjectId(String(decodedToken.id || decodedToken.userId));
            currentUserId = userId.toString();
          } catch (jwtError: any) {
            console.warn(`Socket ${socket.id}: Invalid token for sendMessage. Token Error: ${jwtError.message}`);
            socket.emit('authError', 'جلسة غير صالحة أو منتهية الصلاحية لإرسال الرسالة.');
            return;
          }

          const isMember = await GroupMember.exists({ group: groupId, user: userId });
          if (!isMember) {
            console.warn(`Socket ${socket.id}: User ${userId} is not a member of group ${groupId}. Cannot send message.`);
            socket.emit('messageError', 'غير مصرح لك بإرسال رسالة في هذه المجموعة.');
            return;
          }

          const newMessage = new Message({
            group: groupId,
            sender: userId,
            content: sanitizedContent,
            type: type || 'text',
            replyTo: replyTo || null,
          });
          await newMessage.save();

          const senderUser = await User.findById(userId, { name: 1, avatar: 1 }).lean();

          if (!senderUser) {
            console.error(`Socket ${socket.id}: Sender user not found for message: ${userId}`);
            socket.emit('messageError', 'خطأ في معلومات المرسل. الرجاء إعادة تسجيل الدخول.');
            return;
          }

          const messageToSend: FormattedMessage = {
            id: String(newMessage._id),
            groupId: groupId,
            senderId: senderUser._id.toString(),
            senderName: senderUser.name,
            senderAvatar: senderUser.avatar || null,
            content: newMessage.content,
            timestamp: newMessage.timestamp.toISOString(),
            isEdited: false,
            type: newMessage.type,
            replyTo: newMessage.replyTo ? newMessage.replyTo.toString() : undefined,
          };

          if (io) {
            io.to(groupId).emit('receiveMessage', messageToSend);
          }
          console.log(`Socket ${socket.id}: Message sent to group ${groupId} by user ${userId}`);

        } catch (error: any) {
          console.error(`Socket ${socket.id}: Server error sending message:`, error);
          socket.emit('messageError', 'حدث خطأ غير متوقع أثناء إرسال الرسالة. الرجاء المحاولة لاحق.');
        }
      });

      // New Socket.IO Event: Delete Message
      socket.on('deleteMessage', async (data: { messageId: string; groupId: string; token: string }) => {
        try {
          await connectDB();
          const { messageId, groupId, token } = data;

          if (!mongoose.Types.ObjectId.isValid(messageId) || !mongoose.Types.ObjectId.isValid(groupId)) {
            socket.emit('messageError', 'معرف رسالة أو مجموعة غير صالح للحذف.');
            return;
          }

          let userId: mongoose.Types.ObjectId;
          try {
            const decodedToken = jwt.verify(token, JWT_SECRET) as { id?: string; userId?: string };
            userId = new mongoose.Types.ObjectId(String(decodedToken.id || decodedToken.userId));
            currentUserId = userId.toString();
          } catch (jwtError: any) {
            console.warn(`Socket ${socket.id}: Invalid token for deleteMessage. Token Error: ${jwtError.message}`);
            socket.emit('authError', 'جلسة غير صالحة أو منتهية الصلاحية لحذف الرسالة.');
            return;
          }

          // استخدام findOne بدلاً من findById().lean()
          const messageToDelete = await Message.findOne({ _id: new mongoose.Types.ObjectId(messageId) }).lean();

          if (!messageToDelete) {
            // إذا كانت الرسالة غير موجودة، أرسل حدث الحذف للعميل لإزالتها من الواجهة
            const deleterUser = await User.findById(userId, { name: 1 }).lean();
            const deleterName = deleterUser?.name || 'مستخدم غير معروف';

            if (io) {
              io.to(groupId).emit('messageDeleted', {
                messageId,
                deletedBy: deleterName,
                isAdmin: false
              });
            }
            return;
          }

          if (messageToDelete.group.toString() !== groupId) {
            socket.emit('messageError', 'الرسالة لا تنتمي لهذه المجموعة.');
            return;
          }

          // التحقق من صلاحية الحذف - صاحب الرسالة أو المدير
          const groupDoc = await (Group as any).findOne({ _id: new mongoose.Types.ObjectId(groupId) });
          const isGroupAdmin = groupDoc?.admin && groupDoc.admin.equals(userId);
          const isMessageOwner = messageToDelete.sender.toString() === userId.toString();

          if (!isGroupAdmin && !isMessageOwner) {
            socket.emit('messageError', 'غير مصرح لك بحذف هذه الرسالة. فقط صاحب الرسالة أو المدير يمكنه الحذف.');
            return;
          }

          // استخدام Model.deleteOne مع تحديد النوع
          await Message.deleteOne({ _id: new mongoose.Types.ObjectId(messageId) });
          
          console.log(`Socket ${socket.id}: Message ${messageId} deleted by user ${userId} in group ${groupId}.`);

          const deleterUser = await User.findById(userId, { name: 1 }).lean();
          const deleterName = deleterUser?.name || 'مستخدم غير معروف';

          if (io) {
            io.to(groupId).emit('messageDeleted', {
              messageId,
              deletedBy: deleterName,
              isAdmin: isGroupAdmin
            });
          }

        } catch (error: any) {
          console.error(`Socket ${socket.id}: Server error deleting message:`, error);
          socket.emit('messageError', 'حدث خطأ غير متوقع أثناء حذف الرسالة. الرجاء المحاولة لاحق.');
        }
      });

      // New Socket.IO Event: Edit Message
      socket.on('editMessage', async (data: { messageId: string; groupId: string; newContent: string; token: string }) => {
        try {
          await connectDB();
          const { messageId, groupId, newContent, token } = data;

          if (!mongoose.Types.ObjectId.isValid(messageId) || !mongoose.Types.ObjectId.isValid(groupId)) {
            socket.emit('messageError', 'معرف رسالة أو مجموعة غير صالح للتعديل.');
            return;
          }

          const trimmedContent = newContent.trim();
          if (!trimmedContent) {
            socket.emit('messageError', 'محتوى الرسالة لا يمكن أن يكون فارغاً.');
            return;
          }
          if (trimmedContent.length > 1000) {
            socket.emit('messageError', 'الرسالة طويلة (الحد الأقصى 1000 حرف).');
            return;
          }

          let userId: mongoose.Types.ObjectId;
          try {
            const decodedToken = jwt.verify(token, JWT_SECRET!) as { id?: string; userId?: string };
            userId = new mongoose.Types.ObjectId(String(decodedToken.id || decodedToken.userId));
            currentUserId = userId.toString();
          } catch (jwtError: any) {
            console.warn(`Socket ${socket.id}: Invalid token for editMessage. Token Error: ${jwtError.message}`);
            socket.emit('authError', 'جلسة غير صالحة أو منتهية الصلاحية لتعديل الرسالة.');
            return;
          }

          const messageToEdit = await Message.findById(messageId);
          if (!messageToEdit || messageToEdit.group.toString() !== groupId) {
            socket.emit('messageError', 'الرسالة غير موجودة أو لا تنتمي لهذه المجموعة.');
            return;
          }

          if (!messageToEdit.sender.equals(userId)) {
            socket.emit('messageError', 'غير مصرح لك بتعديل هذه الرسالة. فقط مرسل الرسالة يمكنه التعديل.');
            return;
          }

          messageToEdit.content = trimmedContent;
          await messageToEdit.save();

          console.log(`Socket ${socket.id}: Message ${messageId} edited by user ${userId} in group ${groupId}.`);

          io!.to(groupId).emit('messageEdited', {
            messageId: String(messageToEdit._id),
            newContent: messageToEdit.content,
            isEdited: true,
          });

        } catch (error: any) {
          console.error(`Socket ${socket.id}: Server error editing message:`, error);
          socket.emit('messageError', 'حدث خطأ غير متوقع أثناء تعديل الرسالة. الرجاء المحاولة لاحق.');
        }
      });

      socket.on('typing', (groupId: string, isTyping: boolean) => {
        const userData = connectedUsers.get(socket.id);
        if (userData && userData.groups.has(groupId) && io) {
          io.to(groupId).emit('userTyping', {
            userId: userData.userId,
            isTyping,
            groupId
          });
        }
      });

      socket.on('disconnect', () => {
        const userData = connectedUsers.get(socket.id);
        if (userData) {
          userConnectionCount.set(userData.userId, (userConnectionCount.get(userData.userId) || 0) - 1);
          if (userConnectionCount.get(userData.userId) === 0 && io) {
            io.emit('userStatusUpdate', { userId: userData.userId, isOnline: false });
          }
          connectedUsers.delete(socket.id);
          console.log(`Socket.IO: Client disconnected - ID: ${socket.id}`);
        }
      });

      // إضافة حدث تفاعل مع الرسالة
      socket.on('addReaction', async (data: { messageId: string; groupId: string; emoji: string; token: string }) => {
        try {
          await connectDB();
          const { messageId, groupId, emoji, token } = data;
          if (!mongoose.Types.ObjectId.isValid(messageId) || !mongoose.Types.ObjectId.isValid(groupId)) {
            socket.emit('messageError', 'معرف رسالة أو مجموعة غير صالح للتفاعل.');
            return;
          }
          let userId: mongoose.Types.ObjectId;
          try {
            const decodedToken = jwt.verify(token, JWT_SECRET) as { id?: string; userId?: string };
            userId = new mongoose.Types.ObjectId(String(decodedToken.id || decodedToken.userId));
            currentUserId = userId.toString();
          } catch (jwtError: any) {
            socket.emit('authError', 'جلسة غير صالحة أو منتهية الصلاحية للتفاعل.');
            return;
          }
          const isMember = await GroupMember.exists({ group: groupId, user: userId });
          if (!isMember) {
            socket.emit('messageError', 'غير مصرح لك بالتفاعل في هذه المجموعة.');
            return;
          }
          
          // Usar findById en lugar de findOne cuando sea posible
          const message = await Message.findById(messageId);
          if (!message || message.group.toString() !== groupId) {
            socket.emit('messageError', 'الرسالة غير موجودة أو لا تنتمي لهذه المجموعة.');
            return;
          }
          
          // Resto del código...
          // تحديث reactions: إذا كان هناك reaction بنفس الإيموجي أضف userId إذا لم يكن موجودًا
          let updated = false;
          if (!message.reactions) message.reactions = [];
          const idx = message.reactions.findIndex(r => r.emoji === emoji);
          if (idx > -1) {
            if (!message.reactions[idx].users.some(u => u.equals(userId))) {
              message.reactions[idx].users.push(userId);
              updated = true;
            }
          } else {
            message.reactions.push({ emoji, users: [userId] });
            updated = true;
          }
          if (updated) {
            await message.save();
            if (io) {
              io.to(groupId).emit('reactionAdded', {
                messageId,
                emoji,
                userId: userId.toString(),
                reactions: message.reactions.map(r => ({ emoji: r.emoji, users: r.users.map(u => u.toString()) }))
              });
            }
          }
        } catch (error: any) {
          console.error('Error in addReaction:', error);
          socket.emit('messageError', 'حدث خطأ أثناء إضافة التفاعل.');
        }
      });

      // إضافة حدث إزالة التفاعل مع الرسالة
      socket.on('removeReaction', async (data: { messageId: string; groupId: string; emoji: string; token: string }) => {
        try {
          await connectDB();
          const { messageId, groupId, emoji, token } = data;
          if (!mongoose.Types.ObjectId.isValid(messageId) || !mongoose.Types.ObjectId.isValid(groupId)) {
            socket.emit('messageError', 'معرف رسالة أو مجموعة غير صالح لإزالة التفاعل.');
            return;
          }
          let userId: mongoose.Types.ObjectId;
          try {
            const decodedToken = jwt.verify(token, JWT_SECRET) as { id?: string; userId?: string };
            userId = new mongoose.Types.ObjectId(String(decodedToken.id || decodedToken.userId));
            currentUserId = userId.toString();
          } catch (jwtError: any) {
            socket.emit('authError', 'جلسة غير صالحة أو منتهية الصلاحية لإزالة التفاعل.');
            return;
          }
          const isMember = await GroupMember.exists({ group: groupId, user: userId });
          if (!isMember) {
            socket.emit('messageError', 'غير مصرح لك بإزالة التفاعل في هذه المجموعة.');
            return;
          }
          const message = await Message.findById(messageId);
          if (!message || message.group.toString() !== groupId) {
            socket.emit('messageError', 'الرسالة غير موجودة أو لا تنتمي لهذه المجموعة.');
            return;
          }
          if (!message.reactions) message.reactions = [];
          const idx = message.reactions.findIndex(r => r.emoji === emoji);
          let updated = false;
          if (idx > -1) {
            const userIdx = message.reactions[idx].users.findIndex(u => u.equals(userId));
            if (userIdx > -1) {
              message.reactions[idx].users.splice(userIdx, 1);
              if (message.reactions[idx].users.length === 0) {
                message.reactions.splice(idx, 1);
              }
              updated = true;
            }
          }
          if (updated) {
            await message.save();
            if (io) {
              io.to(groupId).emit('reactionRemoved', {
                messageId,
                emoji,
                userId: userId.toString(),
                reactions: message.reactions.map(r => ({ emoji: r.emoji, users: r.users.map(u => u.toString()) }))
              });
            }
          }
        } catch (error: any) {
          console.error('Error in removeReaction:', error);
          socket.emit('messageError', 'حدث خطأ أثناء إزالة التفاعل.');
        }
      });
    });
  }

  // إضافة معالجة الأخطاء غير المتوقعة
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // لا تنهي العملية هنا، فقط سجل الخطأ
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // لا تنهي العملية هنا، فقط سجل الخطأ
  });

  // تعديل إعدادات الخادم
  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    console.log(`Socket.IO server is running at http://localhost:${PORT}/api/socket`);
  });

  // إضافة معالجة إغلاق الخادم بشكل آمن
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    httpServer.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
});












