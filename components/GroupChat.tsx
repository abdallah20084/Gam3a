// components/GroupChat.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import DOMPurify from "dompurify";
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import { motion, AnimatePresence } from 'framer-motion';

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
  reactions?: { emoji: string; users: string[] }[];
  replyTo?: string;
  replyToContent?: string;
  replyToSenderName?: string;
}

interface GroupChatProps {
  groupId: string;
  userId: string;
  members?: Array<{
    id: string;
    name: string;
    avatar?: string | null;
  }>;
}

const GroupChat: React.FC<GroupChatProps> = ({ groupId, userId, members = [] }) => {
  // استخدام useState لإدارة مثيل السوكيت
  const [socket, setSocket] = useState<ClientSocket | null>(null);
  const [messageInput, setMessageInput] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]); // لتخزين الرسائل المستلمة
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [showEmoji, setShowEmoji] = useState(false);
  const [replyToMsg, setReplyToMsg] = useState<Message | null>(null);
  const [activeReactionMsgId, setActiveReactionMsgId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // دالة تمرير الشات للأسفل تلقائياً
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // إغلاق emoji picker عند النقر خارجه
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmoji(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

      // الاستماع لتحديثات حالة المستخدمين
      newSocket.on("userStatusUpdate", (data: { userId: string; isOnline: boolean }) => {
        setOnlineUsers(prev => {
          const newSet = new Set(prev);
          if (data.isOnline) {
            newSet.add(data.userId);
          } else {
            newSet.delete(data.userId);
          }
          return newSet;
        });
      });

      // الاستماع لإضافة التفاعلات
      newSocket.on("reactionAdded", (data: { messageId: string; emoji: string; userId: string; reactions: { emoji: string; users: string[] }[] }) => {
        setMessages(prev => prev.map(msg => 
          msg.id === data.messageId 
            ? { ...msg, reactions: data.reactions }
            : msg
        ));
      });

      // الاستماع لإزالة التفاعلات
      newSocket.on("reactionRemoved", (data: { messageId: string; emoji: string; userId: string; reactions: { emoji: string; users: string[] }[] }) => {
        setMessages(prev => prev.map(msg => 
          msg.id === data.messageId 
            ? { ...msg, reactions: data.reactions }
            : msg
        ));
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
        type: 'text',
        replyTo: replyToMsg?.id || null,
      });
      setMessageInput("");
      setReplyToMsg(null);
    } else {
      console.warn("Socket not connected or message is empty.");
    }
  };

  // دالة إضافة إيموجي
  const handleEmojiSelect = (emoji: any) => {
    setMessageInput(prev => prev + emoji.native);
    setShowEmoji(false);
  };

  // دالة التفاعل مع الرسالة
  const handleReact = (messageId: string, emoji: string) => {
    if (!socket) return;
    
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    socket.emit("addReaction", {
      messageId,
      groupId,
      emoji,
      token,
    });
    setActiveReactionMsgId(null);
  };

  // دالة إزالة التفاعل
  const handleUnreact = (messageId: string, emoji: string) => {
    if (!socket) return;
    
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    socket.emit("removeReaction", {
      messageId,
      groupId,
      emoji,
      token,
    });
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
        replyTo: replyToMsg?.id || null,
      });
      setReplyToMsg(null);
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
          reactions: msg.reactions || [],
          replyTo: msg.replyTo,
          replyToContent: msg.replyToContent,
          replyToSenderName: msg.replyToSenderName,
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
        reactions: message.reactions || [],
        replyTo: message.replyTo,
        replyToContent: message.replyToContent,
        replyToSenderName: message.replyToSenderName,
      }
    ]);
    setTimeout(scrollToBottom, 100);
  };

  // التحقق من تفاعل المستخدم مع رسالة
  const hasUserReacted = (messageId: string, emoji: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message?.reactions) return false;
    const reaction = message.reactions.find(r => r.emoji === emoji);
    return reaction?.users.includes(userId) || false;
  };

  return (
    <div className="container my-4">
      <div className="card shadow-sm mx-auto" style={{ maxWidth: 800 }}>
        <div className="card-header text-center bg-primary text-white fw-bold d-flex justify-content-between align-items-center">
          <span>دردشة المجموعة: {groupId}</span>
          <div className="d-flex align-items-center">
            <span className="me-2">الأعضاء:</span>
            <div className="d-flex">
              {members.slice(0, 5).map((member) => (
                <div key={member.id} className="position-relative me-1">
                  <div 
                    className="rounded-circle bg-secondary d-flex align-items-center justify-content-center"
                    style={{ 
                      width: '30px', 
                      height: '30px', 
                      fontSize: '12px',
                      color: 'white'
                    }}
                  >
                    {member.avatar ? (
                      <img 
                        src={member.avatar} 
                        alt={member.name}
                        className="rounded-circle"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      member.name.charAt(0)
                    )}
                  </div>
                  <div 
                    className="position-absolute top-0 end-0 rounded-circle border border-white"
                    style={{
                      width: '10px',
                      height: '10px',
                      backgroundColor: onlineUsers.has(member.id) ? '#28a745' : '#6c757d'
                    }}
                  />
                </div>
              ))}
              {members.length > 5 && (
                <div className="ms-1">
                  <span className="badge bg-secondary">+{members.length - 5}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="row g-0">
          {/* قائمة الأعضاء */}
          <div className="col-md-3 border-end" style={{ height: '400px', overflowY: 'auto' }}>
            <div className="p-3">
              <h6 className="mb-3">أعضاء المجموعة</h6>
              {members.map((member) => (
                <div key={member.id} className="d-flex align-items-center mb-2">
                  <div className="position-relative me-2">
                    <div 
                      className="rounded-circle bg-secondary d-flex align-items-center justify-content-center"
                      style={{ 
                        width: '35px', 
                        height: '35px', 
                        fontSize: '14px',
                        color: 'white'
                      }}
                    >
                      {member.avatar ? (
                        <img 
                          src={member.avatar} 
                          alt={member.name}
                          className="rounded-circle"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        member.name.charAt(0)
                      )}
                    </div>
                    <div 
                      className="position-absolute top-0 end-0 rounded-circle border border-white"
                      style={{
                        width: '12px',
                        height: '12px',
                        backgroundColor: onlineUsers.has(member.id) ? '#28a745' : '#6c757d'
                      }}
                    />
                  </div>
                  <div>
                    <div className="fw-bold small">{member.name}</div>
                    <div className="text-muted small">
                      {onlineUsers.has(member.id) ? '🟢 متصل' : '⚫ غير متصل'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* منطقة الدردشة */}
          <div className="col-md-9">
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
                <AnimatePresence>
                  {messages.map((msg, index) => (
                    <motion.div
                      key={msg.id || index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                      className={`mb-3 ${msg.senderId === userId || msg.sender === userId ? "text-end" : "text-start"}`}
                    >
                      <div
                        className={`d-inline-block p-3 rounded-3 position-relative ${
                          msg.senderId === userId || msg.sender === userId
                            ? "bg-primary text-white"
                            : "bg-white border"
                        }`}
                        style={{ 
                          maxWidth: "70%", 
                          borderRadius: "18px",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.1)"
                        }}
                      >
                        {/* عرض الرد */}
                        {msg.replyTo && (
                          <div className={`mb-2 p-2 rounded ${msg.senderId === userId || msg.sender === userId ? 'bg-primary bg-opacity-25' : 'bg-light'}`}>
                            <div className="small fw-bold">
                              رد على {msg.replyToSenderName || 'مستخدم'}
                            </div>
                            <div className="small">
                              {msg.replyToContent || 'رسالة محذوفة'}
                            </div>
                          </div>
                        )}

                        <div className="fw-bold small mb-1">
                          {msg.senderName || 'مستخدم غير معروف'}
                        </div>
                        
                        <div className="mb-2">
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

                        {/* عرض التفاعلات */}
                        {msg.reactions && msg.reactions.length > 0 && (
                          <div className="d-flex flex-wrap gap-1 mb-2">
                            {msg.reactions.map((reaction, idx) => (
                              <button
                                key={idx}
                                className={`btn btn-sm ${hasUserReacted(msg.id, reaction.emoji) ? 'btn-primary' : 'btn-outline-secondary'}`}
                                onClick={() => hasUserReacted(msg.id, reaction.emoji) 
                                  ? handleUnreact(msg.id, reaction.emoji)
                                  : handleReact(msg.id, reaction.emoji)
                                }
                                style={{ fontSize: '12px' }}
                              >
                                {reaction.emoji} {reaction.users.length}
                              </button>
                            ))}
                          </div>
                        )}

                        <div className="d-flex justify-content-between align-items-center">
                          <div className="text-secondary small">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </div>
                          
                          {/* أزرار التفاعل */}
                          <div className="d-flex gap-1">
                            <button
                              className="btn btn-sm btn-outline-secondary"
                              onClick={() => setReplyToMsg(msg)}
                              title="رد"
                            >
                              💬
                            </button>
                            <div className="position-relative">
                              <button
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() => setActiveReactionMsgId(activeReactionMsgId === msg.id ? null : msg.id)}
                                title="تفاعل"
                              >
                                😊
                              </button>
                              {activeReactionMsgId === msg.id && (
                                <div className="position-absolute bottom-100 start-0 mb-1 p-2 bg-white border rounded shadow">
                                  <div className="d-flex gap-1">
                                    {['👍', '❤️', '😂', '😮', '😢', '😡'].map(emoji => (
                                      <button
                                        key={emoji}
                                        className="btn btn-sm"
                                        onClick={() => handleReact(msg.id, emoji)}
                                      >
                                        {emoji}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* منطقة الإدخال */}
            <div className="card-footer bg-white">
              {/* عرض الرد المحدد */}
              {replyToMsg && (
                <div className="mb-2 p-2 bg-light rounded">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <small className="text-muted">رد على {replyToMsg.senderName}</small>
                      <div className="small">{replyToMsg.content}</div>
                    </div>
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => setReplyToMsg(null)}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}

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
                
                {/* زر الإيموجي */}
                <div className="position-relative" ref={emojiPickerRef}>
                  <button
                    className="btn btn-light"
                    onClick={() => setShowEmoji(!showEmoji)}
                    type="button"
                  >
                    😊
                  </button>
                  {showEmoji && (
                    <div className="position-absolute bottom-100 end-0 mb-1">
                      <Picker
                        data={data}
                        onEmojiSelect={handleEmojiSelect}
                        theme="light"
                        set="native"
                        previewPosition="none"
                        skinTonePosition="none"
                      />
                    </div>
                  )}
                </div>

                {/* زر رفع صورة/فيديو */}
                <label className="btn btn-light" title="إرفاق صورة/فيديو">
                  <input type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handleFileChange} />
                  📎
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
      </div>
    </div>
  );
};

export default GroupChat;