// components/GroupChat.tsx
"use client"; // <--- ADD THIS LINE AT THE VERY TOP

import { useEffect, useState } from "react";

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
      newSocket.on("connect_error", (err: { message: any; }) => {
        console.error("Socket connection error:", err.message);
      });

      // دالة التنظيف: قطع الاتصال عند إلغاء تحميل المكون
      return () => {
        console.log("Disconnecting socket...");
        newSocket.disconnect();
      };
    }
    // إذا كان السوكيت موجودًا بالفعل، لا تفعل شيئًا لمنع إعادة التهيئة المزدوجة
    return () => {};
  }, [groupId, socket]); // أضف groupId كـ dependency إذا كان يمكن أن يتغير في عمر المكون

  const handleSendMessage = () => {
    if (socket && messageInput.trim()) { // تأكد أن السوكيت متصل والرسالة ليست فارغة
      const messageData = {
        groupId: groupId,
        senderId: userId, // استخدم userId الممرر كـ prop
        messageContent: messageInput.trim(),
      };
      socket.emit("sendMessage", messageData); // إرسال الرسالة إلى الخادم

      // إضافة رسالتك على الفور إلى الدردشة للعرض المحلي
      setMessages((prev) => [...prev, {
        groupId: groupId,
        senderId: "You", // يمكنك استخدام "أنت" أو اسم المستخدم الفعلي
        messageContent: messageInput.trim(),
        timestamp: new Date().toISOString()
      }]);

      setMessageInput(""); // مسح حقل الإدخال
    } else {
      console.warn("Socket not connected or message is empty.");
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto', border: '1px solid #ddd', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
      <h1 style={{ textAlign: 'center', color: '#333' }}>Group Chat for: {groupId}</h1>
      <div style={{ border: '1px solid #eee', height: '300px', overflowY: 'scroll', padding: '15px', marginBottom: '15px', backgroundColor: '#f9f9f9', borderRadius: '5px' }}>
        {messages.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666' }}>No messages yet. Start chatting!</p>
        ) : (
          messages.map((msg, index) => (
            <div key={index} style={{ marginBottom: '10px', padding: '8px', borderRadius: '5px', backgroundColor: msg.senderId === "You" ? '#e0f7fa' : '#ffffff', border: msg.senderId === "You" ? '1px solid #b2ebf2' : '1px solid #f0f0f0' }}>
              <strong style={{ color: msg.senderId === "You" ? '#00796b' : '#3f51b5' }}>{msg.senderId}:</strong> {msg.messageContent}
              <span style={{ fontSize: '0.8em', color: '#888', marginLeft: '10px' }}>{new Date(msg.timestamp).toLocaleTimeString()}</span>
            </div>
          ))
        )}
      </div>
      <div style={{ display: 'flex' }}>
        <input
          type="text"
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          onKeyPress={(e) => { // إرسال الرسالة عند الضغط على Enter
            if (e.key === 'Enter') {
              handleSendMessage();
            }
          }}
          placeholder="Type your message here..."
          style={{ flexGrow: 1, padding: '10px', borderRadius: '5px', border: '1px solid #ccc', marginRight: '10px' }}
        />
        <button
          onClick={handleSendMessage}
          style={{ padding: '10px 20px', borderRadius: '5px', border: 'none', backgroundColor: '#4CAF50', color: 'white', cursor: 'pointer' }}
        >
          Send
        </button>
      </div>
      {!socket && <p style={{ color: 'red', textAlign: 'center', marginTop: '10px' }}>Connecting to chat server...</p>}
    </div>
  );
};

export default GroupChat;