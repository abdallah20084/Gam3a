"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// server.ts
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const http_1 = require("http");
const url_1 = require("url");
const next_1 = __importDefault(require("next"));
const socket_io_1 = require("socket.io");
const mongoose_1 = __importDefault(require("mongoose"));
const jwt = __importStar(require("jsonwebtoken"));
const dompurify_1 = __importDefault(require("dompurify"));
const jsdom_1 = require("jsdom");
// Setup DOMPurify for server-side sanitization
const window = new jsdom_1.JSDOM('').window;
const domPurify = (0, dompurify_1.default)(window);
// Import your Mongoose models and db connection
const db_1 = __importDefault(require("./lib/db"));
const Message_1 = __importDefault(require("./models/Message"));
const GroupMember_1 = __importDefault(require("./models/GroupMember"));
const User_1 = __importDefault(require("./models/User"));
const Group_1 = __importDefault(require("./models/Group"));
// استخدام process.env.NODE_ENV إذا كان موجودًا، وإلا استخدام 'development'
const isDev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);
const app = (0, next_1.default)({ dev: isDev, hostname, port });
const handle = app.getRequestHandler();
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('SERVER STARTUP ERROR: JWT_SECRET environment variable is NOT SET after dotenv.config(). Please check your .env file location and content.');
    process.exit(1);
}
let io;
const connectedUsers = new Map();
const userConnectionCount = new Map();
app.prepare().then(() => {
    console.log('Next.js app prepared. Creating HTTP server...');
    const httpServer = (0, http_1.createServer)((req, res) => {
        const parsedUrl = (0, url_1.parse)(req.url, true);
        console.log(`[HTTP Request] Method: ${req.method}, URL: ${req.url}`);
        handle(req, res, parsedUrl);
    });
    io = new socket_io_1.Server(httpServer, {
        path: '/api/socket',
        addTrailingSlash: false,
        pingTimeout: 60000,
        pingInterval: 25000,
        cors: {
            origin: process.env.NODE_ENV === 'production'
                ? ["https://yourdomain.com"]
                : ["http://localhost:3000", "http://127.0.0.1:3000"],
            methods: ["GET", "POST"],
            credentials: true,
            allowedHeaders: ["authorization", "content-type"]
        },
        transports: ['polling', 'websocket'], // البدء بـ polling ثم الترقية إلى websocket
        allowEIO3: true,
        connectTimeout: 45000, // زيادة مهلة الاتصال
    });
    console.log('Socket.IO: Server initialized successfully via custom server.');
    console.log(`Server using JWT_SECRET for verification (first 10 chars): ${JWT_SECRET.substring(0, 10)}...`);
    if (io) {
        setInterval(() => {
            const now = new Date();
            connectedUsers.forEach((user, socketId) => {
                var _a;
                if (now.getTime() - user.lastActivity.getTime() > 120000) {
                    console.log(`Socket.IO: Disconnecting inactive socket ${socketId} (User: ${user.userId})`);
                    (_a = io.sockets.sockets.get(socketId)) === null || _a === void 0 ? void 0 : _a.disconnect();
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
            let currentUserName = null;
            let currentUserId = null;
            socket.on('joinGroup', async (groupId, token) => {
                try {
                    await (0, db_1.default)();
                    if (!mongoose_1.default.Types.ObjectId.isValid(groupId)) {
                        socket.emit('errorJoiningGroup', 'معرف مجموعة غير صالح.');
                        socket.disconnect();
                        return;
                    }
                    let userId;
                    let isSuperAdmin = false;
                    try {
                        const decodedToken = jwt.verify(token, JWT_SECRET);
                        userId = new mongoose_1.default.Types.ObjectId(String(decodedToken.id || decodedToken.userId));
                        isSuperAdmin = decodedToken.isSuperAdmin || false;
                        currentUserId = userId.toString();
                    }
                    catch (jwtError) {
                        socket.emit('authError', 'جلسة غير صالحة أو منتهية الصلاحية. الرجاء إعادة تسجيل الدخول.');
                        socket.disconnect();
                        return;
                    }
                    const userDoc = await User_1.default.findById(userId, { name: 1 }).lean();
                    currentUserName = (userDoc === null || userDoc === void 0 ? void 0 : userDoc.name) || 'مستخدم';
                    if (!userDoc) {
                        socket.emit('errorJoiningGroup', 'المستخدم غير موجود.');
                        socket.disconnect();
                        return;
                    }
                    const isMember = await GroupMember_1.default.exists({ group: groupId, user: userId });
                    if (!isMember && !isSuperAdmin) {
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
                    if (userConnectionCount.get(userId.toString()) === 1) {
                        io.emit('userStatusUpdate', { userId: userId.toString(), isOnline: true });
                    }
                    // بث رسالة انضمام عضو جديد
                    io.to(groupId).emit('receiveMessage', {
                        id: new mongoose_1.default.Types.ObjectId().toString(),
                        groupId,
                        senderId: userId.toString(),
                        senderName: currentUserName,
                        senderAvatar: null,
                        content: `🟢 ${currentUserName} انضم إلى المجموعة.`,
                        timestamp: new Date().toISOString(),
                        isSystemMessage: true,
                    });
                    // جلب الرسائل القديمة
                    const oldMessages = await Message_1.default.find({ group: groupId })
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
                        if (!msg.sender ||
                            typeof msg.sender !== 'object' ||
                            !('name' in msg.sender)) {
                            socket.emit('errorJoiningGroup', 'حدث خطأ أثناء جلب بيانات المرسل.');
                            socket.disconnect();
                            return;
                        }
                    }
                    const formattedOldMessages = oldMessages.map((msg) => {
                        // تأكد أن sender هو object وفيه name وavatar
                        const sender = (typeof msg.sender === 'object' && msg.sender && 'name' in msg.sender)
                            ? msg.sender
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
                        };
                    });
                    socket.emit('joinedGroup', {
                        groupId,
                        messages: formattedOldMessages,
                    });
                }
                catch (error) {
                    socket.emit('errorJoiningGroup', 'حدث خطأ غير متوقع أثناء الانضمام إلى المجموعة. الرجاء المحاولة لاحق.');
                    socket.disconnect();
                }
            });
            socket.on('sendMessage', async (data) => {
                try {
                    await (0, db_1.default)();
                    const { groupId, content, token } = data;
                    if (!mongoose_1.default.Types.ObjectId.isValid(groupId)) {
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
                    let userId;
                    let isSuperAdmin = false;
                    try {
                        const decodedToken = jwt.verify(token, JWT_SECRET);
                        userId = new mongoose_1.default.Types.ObjectId(String(decodedToken.id || decodedToken.userId));
                        isSuperAdmin = decodedToken.isSuperAdmin || false;
                    }
                    catch (jwtError) {
                        console.warn(`Socket ${socket.id}: Invalid token for sendMessage. Token Error: ${jwtError.message}`);
                        socket.emit('authError', 'جلسة غير صالحة أو منتهية الصلاحية لإرسال الرسالة.');
                        return;
                    }
                    const isMember = await GroupMember_1.default.exists({ group: groupId, user: userId });
                    if (!isMember && !isSuperAdmin) {
                        console.warn(`Socket ${socket.id}: User ${userId} is not a member of group ${groupId} and not super admin. Cannot send message.`);
                        socket.emit('messageError', 'غير مصرح لك بإرسال رسالة في هذه المجموعة.');
                        return;
                    }
                    const newMessage = new Message_1.default({
                        group: groupId,
                        sender: userId,
                        content: sanitizedContent,
                    });
                    await newMessage.save();
                    const senderUser = await User_1.default.findById(userId, { name: 1, avatar: 1 }).lean();
                    if (!senderUser) {
                        console.error(`Socket ${socket.id}: Sender user not found for message: ${userId}`);
                        socket.emit('messageError', 'خطأ في معلومات المرسل. الرجاء إعادة تسجيل الدخول.');
                        return;
                    }
                    const messageToSend = {
                        id: String(newMessage._id),
                        groupId: groupId,
                        senderId: senderUser._id.toString(),
                        senderName: senderUser.name,
                        senderAvatar: senderUser.avatar || null,
                        content: newMessage.content,
                        timestamp: newMessage.timestamp.toISOString(),
                        isEdited: false,
                    };
                    io.to(groupId).emit('receiveMessage', messageToSend);
                    console.log(`Socket ${socket.id}: Message sent to group ${groupId} by user ${userId}`);
                }
                catch (error) {
                    console.error(`Socket ${socket.id}: Server error sending message:`, error);
                    socket.emit('messageError', 'حدث خطأ غير متوقع أثناء إرسال الرسالة. الرجاء المحاولة لاحق.');
                }
            });
            // New Socket.IO Event: Delete Message
            socket.on('deleteMessage', async (data) => {
                try {
                    await (0, db_1.default)();
                    const { messageId, groupId, token } = data;
                    if (!mongoose_1.default.Types.ObjectId.isValid(messageId) || !mongoose_1.default.Types.ObjectId.isValid(groupId)) {
                        socket.emit('messageError', 'معرف رسالة أو مجموعة غير صالح للحذف.');
                        return;
                    }
                    let userId;
                    let isSuperAdmin = false;
                    try {
                        const decodedToken = jwt.verify(token, JWT_SECRET);
                        userId = new mongoose_1.default.Types.ObjectId(String(decodedToken.id || decodedToken.userId));
                        isSuperAdmin = decodedToken.isSuperAdmin || false;
                    }
                    catch (jwtError) {
                        console.warn(`Socket ${socket.id}: Invalid token for deleteMessage. Token Error: ${jwtError.message}`);
                        socket.emit('authError', 'جلسة غير صالحة أو منتهية الصلاحية لحذف الرسالة.');
                        return;
                    }
                    const messageToDelete = await Message_1.default.findById(messageId).lean();
                    if (!messageToDelete || messageToDelete.group.toString() !== groupId) {
                        socket.emit('messageError', 'الرسالة غير موجودة أو لا تنتمي لهذه المجموعة.');
                        return;
                    }
                    // حل مؤقت باستخدام any
                    // @ts-ignore
                    const groupDoc = await Group_1.default.findOne({ _id: groupId });
                    const isGroupAdmin = (groupDoc === null || groupDoc === void 0 ? void 0 : groupDoc.admin) && groupDoc.admin.equals(userId);
                    if (!isGroupAdmin && !isSuperAdmin) {
                        socket.emit('messageError', 'غير مصرح لك بحذف هذه الرسالة. فقط المدير أو السوبر أدمن يمكنه الحذف.');
                        return;
                    }
                    await Message_1.default.deleteOne({ _id: messageId });
                    console.log(`Socket ${socket.id}: Message ${messageId} deleted by user ${userId} in group ${groupId}.`);
                    const deleterUser = await User_1.default.findById(userId, { name: 1 }).lean();
                    const deleterName = (deleterUser === null || deleterUser === void 0 ? void 0 : deleterUser.name) || 'مستخدم غير معروف';
                    const systemMessage = {
                        id: new mongoose_1.default.Types.ObjectId().toString(),
                        groupId: groupId,
                        senderId: userId.toString(),
                        senderName: deleterName,
                        senderAvatar: null,
                        content: `قام ${deleterName} بحذف رسالة.`,
                        timestamp: new Date().toISOString(),
                        isSystemMessage: true,
                    };
                    io.to(groupId).emit('messageDeleted', { messageId, systemMessage });
                }
                catch (error) {
                    console.error(`Socket ${socket.id}: Server error deleting message:`, error);
                    socket.emit('messageError', 'حدث خطأ غير متوقع أثناء حذف الرسالة. الرجاء المحاولة لاحق.');
                }
            });
            // New Socket.IO Event: Edit Message
            socket.on('editMessage', async (data) => {
                try {
                    await (0, db_1.default)();
                    const { messageId, groupId, newContent, token } = data;
                    if (!mongoose_1.default.Types.ObjectId.isValid(messageId) || !mongoose_1.default.Types.ObjectId.isValid(groupId)) {
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
                    let userId;
                    try {
                        const decodedToken = jwt.verify(token, JWT_SECRET);
                        userId = new mongoose_1.default.Types.ObjectId(String(decodedToken.id || decodedToken.userId));
                    }
                    catch (jwtError) {
                        console.warn(`Socket ${socket.id}: Invalid token for editMessage. Token Error: ${jwtError.message}`);
                        socket.emit('authError', 'جلسة غير صالحة أو منتهية الصلاحية لتعديل الرسالة.');
                        return;
                    }
                    const messageToEdit = await Message_1.default.findById(messageId);
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
                    io.to(groupId).emit('messageEdited', {
                        messageId: String(messageToEdit._id),
                        newContent: messageToEdit.content,
                        isEdited: true,
                    });
                }
                catch (error) {
                    console.error(`Socket ${socket.id}: Server error editing message:`, error);
                    socket.emit('messageError', 'حدث خطأ غير متوقع أثناء تعديل الرسالة. الرجاء المحاولة لاحق.');
                }
            });
            socket.on('typing', (groupId, isTyping) => {
                const userData = connectedUsers.get(socket.id);
                if (userData && userData.groups.has(groupId)) {
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
                    if (userConnectionCount.get(userData.userId) === 0) {
                        io.emit('userStatusUpdate', { userId: userData.userId, isOnline: false });
                    }
                    connectedUsers.delete(socket.id);
                    console.log(`Socket.IO: Client disconnected - ID: ${socket.id}`);
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
