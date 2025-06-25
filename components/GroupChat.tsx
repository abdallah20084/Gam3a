// components/GroupChat.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import DOMPurify from "dompurify";

// نوع placeholder مؤقت للسوكيت إذا كنت لا تزال تواجه مشاكل في TypeScript.
// إذا تم حل مشاكل أنواع Socket.IO، يمكنك استخدام import { Socket } from 'socket.io-client';
// ثم استخدام Socket بدلاً من ClientSocket.
type ClientSocket = any;

// تعريف نوع الرسالة المستخدم داخلياً
interface Message {
  id: string;
  groupId: string;
  sender: string;
  content: string;
  type?: string;
  timestamp: string;
  senderName?: string;
  senderAvatar?: string | null;
}

interface GroupChatProps {
  groupId: string;
  userId: string;
}

const GroupChat: React.FC<GroupChatProps> = ({ groupId, userId }) => {
  // استخدام useState لإدارة مثيل السوكيت
  const [socket, setSocket] = useState<ClientSocket | null>(null);
  const [messageInput, setMessageInput] = useState<string>('');
  const [messages, setMessages] = useState<any[]>([]); // لتخزين الرسائل المستلمة
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // دالة تمرير الشات للأسفل تلقائياً
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    // تأكد من أن السوكيت لم يتم تهيئته بالفعل
    if (!socket) {
      // عنوان خادم السوكيت. يجب أن يتطابق مع URL الواجهة الأمامية الخاصة بك.
      const SOCKET_SERVER_URL = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'http://localhost:3000';
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

      // إنشاء مثيل سوكيت جديد
      const newSocket: ClientSocket = io(SOCKET_SERVER_URL, {
        path: "/api/socket", // هذا المسار بالغ الأهمية ويجب أن يتطابق مع مسار API Route
        transports: ['websocket'], // يمكن أن يساعد في فرض استخدام WebSockets
      });

      setSocket(newSocket); // تخزين مثيل السوكيت في الحالة

      // الاستماع لحدث الاتصال
      newSocket.on("connect", () => {
        console.log("Socket connected:", newSocket.id);
        // الانضمام إلى المجموعة بمجرد الاتصال
        newSocket.emit("joinGroup", groupId, token);
      });

      // الاستماع للرسائل الواردة من الخادم
      newSocket.on("receiveMessage", (msg: any) => {
        console.log("Received message:", msg);
        setMessages((prev) => [
          ...prev,
          {
            ...msg,
            senderName: msg.senderName || 'مستخدم غير معروف',
            senderAvatar: msg.senderAvatar || null,
          }
        ]);
      });

      // الاستماع لأخطاء الاتصال
      newSocket.on("connect_error", () => {});

      // دالة التنظيف: قطع الاتصال عند إلغاء تحميل المكون
      return () => {
        console.log("Disconnecting socket...");
        newSocket.disconnect();
      };
    }
    // إذا كان السوكيت موجودًا بالفعل، لا تفعل شيئًا لمنع إعادة التهيئة المزدوجة
    return () => {};
  }, [groupId, socket]); // أضف groupId كـ dependency إذا كان يمكن أن يتغير في عمر المكون

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // دالة إرسال رسالة نصية مع النوع
  const handleSendMessage = () => {
    if (socket && messageInput.trim()) {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      socket.emit("sendMessage", {
        groupId,
        content: messageInput.trim(),
        token,
        type: 'text', // أضفنا نوع الرسالة
      });
      setMessageInput("");
    } else {
      console.warn("Socket not connected or message is empty.");
    }
  };

  // دالة رفع صورة أو فيديو
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file || !socket) return;
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/upload-media', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.filepath) {
      let type: string = 'file';
      if (file.type.startsWith('image')) type = 'image';
      else if (file.type.startsWith('video')) type = 'video';
      let content = data.filepath;
      if ((type === 'image' || type === 'video') && !content.startsWith('/')) {
        content = '/' + content;
      }
      socket.emit("sendMessage", {
        groupId,
        content,
        token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
        type,
      });
    }
  };

  const onJoinedGroup = (data: { groupId: string; messages: Message[] }) => {
    setMessages(
      data.messages
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .map(msg => ({
          id: msg.id,
          groupId: msg.groupId,
          sender: msg.sender, 
          content: DOMPurify.sanitize(msg.content), 
          timestamp: msg.timestamp,
          senderName: msg.senderName || 'مستخدم غير معروف',
          senderAvatar: msg.senderAvatar || null,
        }))
    );
    setTimeout(scrollToBottom, 100);
  };

  const onReceiveMessage = (message: Message) => {
    setMessages(prev => [
      ...prev,
      {
        id: message.id,
        groupId: message.groupId,
        sender: message.sender,
        content: DOMPurify.sanitize(message.content), 
        timestamp: message.timestamp,
        senderName: message.senderName || 'مستخدم غير معروف',
        senderAvatar: message.senderAvatar || null,
      }
    ]);
    setTimeout(scrollToBottom, 100);
  };

  return (
    <div className="container my-4">
      <div className="card shadow-sm mx-auto" style={{ maxWidth: 600 }}>
        <div className="card-header text-center bg-primary text-white fw-bold">
          دردشة المجموعة: {groupId}
        </div>
        <div
          className="card-body"
          style={{
            height: 320,
            overflowY: "auto",
            background: "#f8f9fa",
            borderBottom: "1px solid #eee",
          }}
        >
          {messages.length === 0 ? (
            <p className="text-center text-muted">لا توجد رسائل بعد. ابدأ الدردشة!</p>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                className={`mb-2 p-2 rounded-3 ${
                  msg.senderId === userId || msg.sender === userId
                    ? "bg-info text-end text-white ms-5"
                    : "bg-light text-start me-5 border"
                }`}
                style={{ maxWidth: "80%", marginRight: msg.senderId === userId || msg.sender === userId ? "auto" : 0, marginLeft: msg.senderId === userId || msg.sender === userId ? 0 : "auto" }}
              >
                <div className="fw-bold small mb-1">
                  {msg.senderName || 'مستخدم غير معروف'}
                </div>
                <div>
                  {(() => {
                    console.log(msg); // طباعة الرسالة للتشخيص
                    // منطق ذكي لعرض الصور حتى لو type غير مضبوط
                    const isImage = msg.type === 'image' || (typeof msg.content === 'string' && /\.(jpg|jpeg|png|gif)$/i.test(msg.content));
                    if (isImage) {
                      return <img src={msg.content && !msg.content.startsWith('/') ? '/' + msg.content : msg.content} alt="صورة" style={{ maxWidth: 200, borderRadius: 8 }} />;
                    } else if (msg.type === 'video') {
                      return <video src={msg.content && !msg.content.startsWith('/') ? '/' + msg.content : msg.content} controls style={{ maxWidth: 250, borderRadius: 8 }} />;
                    } else if (msg.type === 'file') {
                      return <a href={msg.content && !msg.content.startsWith('/') ? '/' + msg.content : msg.content} target="_blank" rel="noopener noreferrer">ملف مرفق</a>;
                    } else {
                      return <span>{msg.messageContent || msg.content}</span>;
                    }
                  })()}
                </div>
                <div className="text-end text-secondary small mt-1">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="card-footer bg-white">
          <div className="input-group">
            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSendMessage();
              }}
              className="form-control"
              placeholder="اكتب رسالتك هنا..."
              disabled={!socket}
            />
            {/* زر رفع صورة/فيديو */}
            <label className="btn btn-light mb-0 ms-2" title="إرفاق صورة/فيديو" style={{ borderRadius: '50%' }}>
              <input type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handleFileChange} />
              <span role="img" aria-label="attach">📎</span>
            </label>
            <button
              onClick={handleSendMessage}
              className="btn btn-primary"
              type="button"
              disabled={!socket || !messageInput.trim()}
            >
              <i className="bi bi-send"></i> إرسال
            </button>
          </div>
          {!socket && (
            <div className="text-danger text-center mt-2 small">
              جاري الاتصال بسيرفر الدردشة...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupChat;