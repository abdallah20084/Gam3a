// components/GroupChat.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

// نوع placeholder مؤقت للسوكيت إذا كنت لا تزال تواجه مشاكل في TypeScript.
// إذا تم حل مشاكل أنواع Socket.IO، يمكنك استخدام import { Socket } from 'socket.io-client';
// ثم استخدام Socket بدلاً من ClientSocket.
type ClientSocket = any;

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

  useEffect(() => {
    // تأكد من أن السوكيت لم يتم تهيئته بالفعل
    if (!socket) {
      // عنوان خادم السوكيت. يجب أن يتطابق مع URL الواجهة الأمامية الخاصة بك.
      const SOCKET_SERVER_URL = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'http://localhost:3000';

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
        newSocket.emit("joinGroup", groupId);
      });

      // الاستماع للرسائل الواردة من الخادم
      newSocket.on("receiveMessage", (msg: { groupId: string; senderId: string; messageContent: string; timestamp: string }) => {
        console.log("Received message:", msg);
        setMessages((prev) => [...prev, msg]);
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

  const handleSendMessage = () => {
    if (socket && messageInput.trim()) { // تأكد أن السوكيت متصل والرسالة ليست فارغة
      const messageData = {
        groupId: groupId,
        senderId: userId, // استخدم userId الممرر كـ prop
        messageContent: messageInput.trim(),
      };
      socket.emit("sendMessage", messageData); // إرسال الرسالة إلى الخادم

      // إضافة رسالتك على الفور إلى الدردشة للعرض المحلي
      setMessages((prev) => [
        ...prev,
        {
          groupId: groupId,
          senderId: "You", // يمكنك استخدام "أنت" أو اسم المستخدم الفعلي
          messageContent: messageInput.trim(),
          timestamp: new Date().toISOString(),
        },
      ]);

      setMessageInput(""); // مسح حقل الإدخال
    } else {
      console.warn("Socket not connected or message is empty.");
    }
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
                  msg.senderId === "You"
                    ? "bg-info text-end text-white ms-5"
                    : "bg-light text-start me-5 border"
                }`}
                style={{ maxWidth: "80%", marginRight: msg.senderId === "You" ? "auto" : 0, marginLeft: msg.senderId === "You" ? 0 : "auto" }}
              >
                <div className="fw-bold small mb-1">
                  {msg.senderId === "You" ? "أنت" : msg.senderId}
                </div>
                <div>{msg.messageContent}</div>
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