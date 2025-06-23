// server.ts
import dotenv from 'dotenv';
dotenv.config();

import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';
import mongoose from 'mongoose';
import * as jwt from 'jsonwebtoken'; // <--- FIX: Ensure this line is exactly here
// import { LeanDocument } from 'mongoose'; // This line is not needed and was removed previously

// Import your Mongoose models and db connection
import connectDB from './lib/db';
import Message, { IMessage } from './models/Message';
import GroupMember from './models/GroupMember';
import User, { IUser } from './models/User';
import Group, { IGroup } from './models/Group';

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0'; 
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('SERVER STARTUP ERROR: JWT_SECRET environment variable is NOT SET after dotenv.config(). Please check your .env file location and content.');
  process.exit(1);
}

let io: SocketIOServer | undefined;

const connectedUsers = new Map<string, { userId: string; groups: Set<string>; lastActivity: Date; socketId: string }>();
const userConnectionCount = new Map<string, number>();

interface FormattedMessage {
  id: string;
  groupId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string | null;
  content: string;
  timestamp: string;
  isSystemMessage?: boolean; 
  isEdited?: boolean; 
}

type PopulatedMessageLean = Omit<IMessage, 'sender'> & {
  _id: mongoose.Types.ObjectId;
  sender: Pick<IUser, 'name' | 'avatar'> & { _id: any };
  __v?: number;
};

type MessageLeanType = Pick<IMessage, '_id' | 'group'> & {
  group: mongoose.Types.ObjectId;
};

type GroupLeanType = Pick<IGroup, '_id' | 'admin'> & {
  admin: mongoose.Types.ObjectId;
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
      origin: [
        "http://localhost:3000",
        "http://30.30.30.20:3000",
        "http://gam3a5g.com:3000",
      ],
      methods: ["GET", "POST"],
      credentials: true,
    },
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

      socket.on('joinGroup', async (groupId: string, token: string) => {
        try {
          await connectDB();

          if (!mongoose.Types.ObjectId.isValid(groupId)) {
            socket.emit('errorJoiningGroup', 'معرف مجموعة غير صالح.');
            return;
          }

          let userId: mongoose.Types.ObjectId;
          let isSuperAdmin = false;
          try {
            console.log(`Attempting to verify token for socket ${socket.id}. Token (first 20 chars): ${token.substring(0, 20)}...`);
            const decodedToken = jwt.verify(token, JWT_SECRET!) as { id?: string; userId?: string; isSuperAdmin?: boolean };
            userId = new mongoose.Types.ObjectId(String(decodedToken.id || decodedToken.userId));
            isSuperAdmin = decodedToken.isSuperAdmin || false;
          } catch (jwtError: any) {
            console.error(`Socket ${socket.id}: JWT Verification FAILED! Error details:`, jwtError);
            console.warn(`Socket ${socket.id}: Invalid token for joinGroup. Token Error: ${jwtError.message}`);
            socket.emit('authError', 'جلسة غير صالحة أو منتهية الصلاحية. الرجاء إعادة تسجيل الدخول.');
            return;
          }

          const isMember = await GroupMember.exists({ group: groupId, user: userId });
          if (!isMember && !isSuperAdmin) {
            console.warn(`Socket ${socket.id}: User ${userId} is not a member of group ${groupId} and not super admin. Access denied.`);
            socket.emit('errorJoiningGroup', 'غير مصرح لك بالانضمام إلى هذه المجموعة.');
            return;
          }

          socket.join(groupId);
          console.log(`Socket ${socket.id} (User ${userId}) joined group ${groupId}`);

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
          if (userConnectionCount.get(userId.toString()) === 1) {
              io!.emit('userStatusUpdate', { userId: userId.toString(), isOnline: true });
              console.log(`User ${userId} is now ONLINE.`);
          }

          const oldMessages = await Message.find({ group: groupId })
            .sort({ timestamp: -1 })
            .limit(50)
            .populate<{ sender: Pick<IUser, 'name' | 'avatar'> & { _id: mongoose.Types.ObjectId } }>({
              path: 'sender',
              select: 'name avatar',
              model: User,
            })
            .lean() as PopulatedMessageLean[];


          const formattedOldMessages: FormattedMessage[] = oldMessages.map((msg) => ({
            id: msg._id.toString(),
            groupId: msg.group.toString(),
            senderId: msg.sender._id.toString(),
            senderName: msg.sender.name,
            senderAvatar: msg.sender.avatar || null,
            content: msg.content,
            timestamp: msg.timestamp.toISOString(),
            isEdited: false,
          }));

          socket.emit('joinedGroup', {
            groupId,
            messages: formattedOldMessages,
          });

        } catch (error: any) {
          console.error(`Socket ${socket.id}: Server error joining group ${groupId}:`, error);
          socket.emit('errorJoiningGroup', 'حدث خطأ غير متوقع أثناء الانضمام إلى المجموعة. الرجاء المحاولة لاحقاً.');
        }
      });

      socket.on('sendMessage', async (data: { groupId: string; content: string; token: string }) => {
        try {
          await connectDB();

          const { groupId, content, token } = data;

          if (!mongoose.Types.ObjectId.isValid(groupId)) {
            socket.emit('messageError', 'معرف مجموعة غير صالح لإرسال الرسالة.');
            return;
          }

          const trimmedContent = content.trim();
          if (!trimmedContent) {
            socket.emit('messageError', 'محتوى الرسالة لا يمكن أن يكون فارغاً.');
            return;
          }

          if (trimmedContent.length > 1000) {
            socket.emit('messageError', 'الرسالة طويلة جداً (الحد الأقصى 1000 حرف).');
            return;
          }

          let userId: mongoose.Types.ObjectId;
          let isSuperAdmin = false;
          try {
            const decodedToken = jwt.verify(token, JWT_SECRET!) as { id?: string; userId?: string; isSuperAdmin?: boolean };
            userId = new mongoose.Types.ObjectId(String(decodedToken.id || decodedToken.userId));
            isSuperAdmin = decodedToken.isSuperAdmin || false;
          } catch (jwtError: any) {
            console.warn(`Socket ${socket.id}: Invalid token for sendMessage. Token Error: ${jwtError.message}`);
            socket.emit('authError', 'جلسة غير صالحة أو منتهية الصلاحية لإرسال الرسالة.');
            return;
          }

          const isMember = await GroupMember.exists({ group: groupId, user: userId });
          if (!isMember && !isSuperAdmin) {
            console.warn(`Socket ${socket.id}: User ${userId} is not a member of group ${groupId} and not super admin. Cannot send message.`);
            socket.emit('messageError', 'غير مصرح لك بإرسال رسالة في هذه المجموعة.');
            return;
          }

          const newMessage = new Message({
            group: groupId,
            sender: userId,
            content: trimmedContent,
          });
          await newMessage.save();

          const senderUser = await User.findById(userId)
            .select('name avatar')
            .lean() as (Pick<IUser, 'name' | 'avatar'> & { _id: mongoose.Types.ObjectId }) | null;

          if (!senderUser) {
            console.error(`Socket ${socket.id}: Sender user not found for message: ${userId}`);
            socket.emit('messageError', 'خطأ في معلومات المرسل. الرجاء إعادة تسجيل الدخول.');
            return;
          }

          const messageToSend: FormattedMessage = {
            id: newMessage._id.toString(),
            groupId: groupId,
            senderId: senderUser._id.toString(),
            senderName: senderUser.name,
            senderAvatar: senderUser.avatar || null,
            content: newMessage.content,
            timestamp: newMessage.timestamp.toISOString(),
            isEdited: false,
          };

          io!.to(groupId).emit('receiveMessage', messageToSend);
          console.log(`Socket ${socket.id}: Message sent to group ${groupId} by user ${userId}`);

        } catch (error: any) {
          console.error(`Socket ${socket.id}: Server error sending message:`, error);
          socket.emit('messageError', 'حدث خطأ غير متوقع أثناء إرسال الرسالة. الرجاء المحاولة لاحقاً.');
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
          let isSuperAdmin = false;
          try {
            const decodedToken = jwt.verify(token, JWT_SECRET!) as { id?: string; userId?: string; isSuperAdmin?: boolean };
            userId = new mongoose.Types.ObjectId(String(decodedToken.id || decodedToken.userId));
            isSuperAdmin = decodedToken.isSuperAdmin || false;
          } catch (jwtError: any) {
            console.warn(`Socket ${socket.id}: Invalid token for deleteMessage. Token Error: ${jwtError.message}`);
            socket.emit('authError', 'جلسة غير صالحة أو منتهية الصلاحية لحذف الرسالة.');
            return;
          }

          const messageToDelete = await Message.findById(messageId).lean() as (MessageLeanType | null);
          if (!messageToDelete || messageToDelete.group.toString() !== groupId) {
            socket.emit('messageError', 'الرسالة غير موجودة أو لا تنتمي لهذه المجموعة.');
            return;
          }

          const groupDoc = await Group.findById(groupId).lean() as (GroupLeanType | null);
          const isGroupAdmin = groupDoc?.admin && groupDoc.admin.equals(userId);

          if (!isGroupAdmin && !isSuperAdmin) {
            socket.emit('messageError', 'غير مصرح لك بحذف هذه الرسالة. فقط المدير أو السوبر أدمن يمكنه الحذف.');
            return;
          }

          await Message.deleteOne({ _id: messageId });
          console.log(`Socket ${socket.id}: Message ${messageId} deleted by user ${userId} in group ${groupId}.`);

          const deleterUser = await User.findById(userId).select('name').lean() as (UserLeanNameType | null);
          const deleterName = deleterUser?.name || 'مستخدم غير معروف';

          const systemMessage: FormattedMessage = {
            id: new mongoose.Types.ObjectId().toString(),
            groupId: groupId,
            senderId: userId.toString(),
            senderName: deleterName,
            senderAvatar: null,
            content: `قام ${deleterName} بحذف رسالة.`,
            timestamp: new Date().toISOString(),
            isSystemMessage: true,
          };

          io!.to(groupId).emit('messageDeleted', { messageId, systemMessage });

        } catch (error: any) {
          console.error(`Socket ${socket.id}: Server error deleting message:`, error);
          socket.emit('messageError', 'حدث خطأ غير متوقع أثناء حذف الرسالة. الرجاء المحاولة لاحقاً.');
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
            socket.emit('messageError', 'الرسالة طويلة جداً (الحد الأقصى 1000 حرف).');
            return;
          }

          let userId: mongoose.Types.ObjectId;
          try {
            const decodedToken = jwt.verify(token, JWT_SECRET!) as { id?: string; userId?: string };
            userId = new mongoose.Types.ObjectId(String(decodedToken.id || decodedToken.userId));
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
            messageId: messageToEdit._id.toString(),
            newContent: messageToEdit.content,
            isEdited: true,
          });

        } catch (error: any) {
          console.error(`Socket ${socket.id}: Server error editing message:`, error);
          socket.emit('messageError', 'حدث خطأ غير متوقع أثناء تعديل الرسالة. الرجاء المحاولة لاحقاً.');
        }
      });

      socket.on('typing', (groupId: string, isTyping: boolean) => {
        const userData = connectedUsers.get(socket.id);
        if (userData && userData.groups.has(groupId)) {
          io!.to(groupId).emit('userTyping', {
            userId: userData.userId,
            isTyping,
            groupId
          });
        }
      });

      socket.on('disconnect', () => {
        console.log(`Socket.IO: Client disconnected - ID: ${socket.id}`);
        const userData = connectedUsers.get(socket.id);
        if (userData) {
          connectedUsers.delete(userData.socketId);
          userConnectionCount.set(userData.userId, (userConnectionCount.get(userData.userId) || 1) - 1);
          if (userConnectionCount.get(userData.userId) === 0) {
            io!.emit('userStatusUpdate', { userId: userData.userId, isOnline: false });
            console.log(`User ${userData.userId} is now OFFLINE.`);
          }
        }
      });
    });
  }

  httpServer.listen(port, hostname, () => {
    console.log(`Next.js app running on http://${hostname}:${port} (Access via ${hostname === '0.0.0.0' ? 'your_ip_address' : hostname}:${port})`);
    console.log('*** Server is fully listening and should be ready to accept connections. ***');
  });
}).catch((err) => {
  console.error('Failed to prepare Next.js app or start server:', err);
  process.exit(1);
});
