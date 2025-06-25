// app/group/[groupId]/page.tsx
'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';
import { io, Socket } from 'socket.io-client';
import DOMPurify from 'isomorphic-dompurify';
import { FaPaperclip, FaRegSmile, FaImage, FaVideo, FaFileAlt } from 'react-icons/fa';

const SOCKET_SERVER_URL = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'http://localhost:3000';

interface ServerToClientEvents {
  joinedGroup: (data: { groupId: string; messages: Message[] }) => void;
  receiveMessage: (message: Message) => void;
  authError: (msg: string) => void;
  messageError: (msg: string) => void;
  errorJoiningGroup: (msg: string) => void;
  userTyping: (data: { userId: string; isTyping: boolean; groupId: string }) => void;
  userStatusUpdate: (data: { userId: string; isOnline: boolean }) => void;
  messageDeleted: (data: { messageId: string; systemMessage: Message }) => void;
  messageEdited: (data: { messageId: string; newContent: string; isEdited: boolean }) => void;
}

interface ClientToServerEvents {
  joinGroup: (groupId: string, token: string) => void;
  sendMessage: (data: { groupId: string; content: string; token: string; type?: string }) => void;
  typing: (groupId: string, isTyping: boolean) => void;
  deleteMessage: (data: { messageId: string; groupId: string; token: string }) => void;
  editMessage: (data: { messageId: string; groupId: string; newContent: string; token: string }) => void;
}

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface GroupDetails {
  id: string;
  name: string;
  description: string;
  coverImageUrl: string | null;
  adminId: string;
  memberCount: number;
  createdAt?: string;
  currentUserRole: string;
  isMember: boolean;
  isAdmin: boolean;
  members: {
    id: string;
    name: string;
    avatar: string | null;
    role: string;
    joinedAt: string;
  }[];
}

interface Message {
  id: string; 
  groupId: string; 
  sender: string; 
  content: string; 
  type: string;
  timestamp: string; 
  senderName?: string; 
  senderAvatar?: string | null; 
  isSystemMessage?: boolean; 
  isEdited?: boolean; 
}

export default function GroupChatPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;

  const [group, setGroup] = useState<GroupDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set()); 
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isCurrentUserAdmin, setIsCurrentUserAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'images' | 'videos' | 'pdfs' | 'voices' | 'links' | 'members'>('chat');
  const [showDeleteGroupModal, setShowDeleteGroupModal] = useState(false);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);
  const [deleteGroupError, setDeleteGroupError] = useState<string | null>(null);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [bulkDeleteError, setBulkDeleteError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const socketRef = useRef<AppSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const fetchGroupDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');

      const response = await fetch(`/api/groups/${groupId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok) {
        setGroup(data.group);
        setIsCurrentUserAdmin(data.group.isAdmin);
        setCurrentUserId(localStorage.getItem('userId'));
      } else {
        let errorMessage = data.error || 'فشل في جلب تفاصيل المجموعة.';
        if (response.status === 401) {
          errorMessage = 'الرجاء تسجيل الدخول للانضمام إلى الدردشة.';
          router.push('/auth/login');
          return;
        } else if (response.status === 404) {
          errorMessage = 'المجموعة غير موجودة أو تم حذفها.';
          router.push('/'); 
          return;
        } else if (response.status === 403) {
          errorMessage = 'ليس لديك صلاحية الوصول لهذه المجموعة.';
          router.push('/'); 
          return;
        }
        setError(errorMessage);
      }
    } catch (err: any) {
      console.error('Network or unexpected error fetching group details:', err);
      setError('حدث خطأ في الاتصال بالخادم. الرجاء المحاولة لاحق.');
    } finally {
      setLoading(false);
    }
  }, [groupId, router]);

  const handleSocketError = useCallback((msg: string, context: string) => {
    console.error(`Socket Error in ${context}:`, msg);
    setError(msg);
    if (msg.includes('الرجاء تسجيل الدخول') || msg.includes('صالحة')) {
      router.push('/auth/login');
    } else if (msg.includes('غير مصرح لك بالانضمام')) {
      router.push('/'); 
    }
  }, [router]);

  const handleTyping = useCallback((isTyping: boolean) => {
    if (!socketRef.current || !group || !group.isMember) return;

    socketRef.current.emit('typing', group.id, isTyping);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current?.emit('typing', group.id, false); 
        typingTimeoutRef.current = null;
      }, 3000);
    }
  }, [group]);

  useEffect(() => {
    if (!groupId) return;

    const token = localStorage.getItem('token');
    if (!token) {
      handleSocketError('الرجاء تسجيل الدخول للانضمام إلى الدردشة.', 'initial connection');
      return;
    }

    // تعديل إعدادات Socket.IO
    const socket: AppSocket = io(SOCKET_SERVER_URL, {
      path: '/api/socket',
      auth: { token },
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 20000, // زيادة مهلة الاتصال
      transports: ['polling', 'websocket'], // البدء بـ polling ثم الترقية إلى websocket
      upgrade: true,
      rememberUpgrade: true,
      forceNew: true,
    });

    // إضافة معالج للأخطاء
    socket.on('connect_error', (error) => {
      console.error('Socket connection error details:', error.message);
      setError(`فشل الاتصال بخادم الدردشة: ${error.message}`);
      setIsConnected(false);
    });

    socketRef.current = socket;

    console.log('Attempting to connect to socket server:', SOCKET_SERVER_URL);

    const onConnect = () => {
      console.log('Socket connected successfully with ID:', socket.id);
      setIsConnected(true);
      socket.emit('joinGroup', groupId, token);
    };

    const onConnectError = (error: any) => {
      console.error('Socket connection error:', error);
      setError(`فشل الاتصال بخادم الدردشة: ${error.message}`);
      setIsConnected(false);
    };

    const onDisconnect = () => {
      setIsConnected(false);
      setTypingUsers(new Set()); 
    };

    const onJoinedGroup = (data: { groupId: string; messages: Message[] }) => {
      setMessages(data.messages.map(msg => ({
          ...msg,
          senderName: msg.senderName || 'مستخدم غير معروف',
          senderAvatar: msg.senderAvatar || '/default-avatar.png',
      })));
      setTimeout(scrollToBottom, 100);
    };

    const onReceiveMessage = (message: Message) => {
      setMessages(prev => [...prev, {
          ...message,
          senderName: message.senderName || 'مستخدم غير معروف',
          senderAvatar: message.senderAvatar || '/default-avatar.png',
      }]);
      setTimeout(scrollToBottom, 100);
    };

    const onUserTyping = (data: { userId: string; isTyping: boolean; groupId: string }) => {
        setTypingUsers(prev => {
            const currentUserIdLocal = localStorage.getItem('userId');
            if (data.userId === currentUserIdLocal || data.groupId !== groupId) {
                return prev; 
            }
            const newSet = new Set(prev);
            if (data.isTyping) {
                newSet.add(data.userId);
            } else {
                newSet.delete(data.userId);
            }
            return newSet;
        });
    };

    const onUserStatusUpdate = (data: { userId: string; isOnline: boolean }) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        if (data.isOnline) {
          newSet.add(data.userId);
        } else {
          newSet.delete(data.userId);
        }
        return newSet;
      });
    };

    const onMessageDeleted = (data: { messageId: string; systemMessage: Message }) => {
      setMessages(prev => {
        const filteredMessages = prev.filter(msg => msg.id !== data.messageId);
        return [...filteredMessages, {
          id: data.systemMessage.id,
          groupId: data.systemMessage.groupId,
          sender: data.systemMessage.sender,
          content: DOMPurify.sanitize(data.systemMessage.content),
          timestamp: data.systemMessage.timestamp,
          isSystemMessage: true,
          type: 'system',
        }];
      });
      setTimeout(scrollToBottom, 100);
    };

    const onMessageEdited = (data: { messageId: string; newContent: string; isEdited: boolean }) => {
      setMessages(prev =>
        prev.map(msg =>
          msg.id === data.messageId ? { 
            ...msg, 
            content: DOMPurify.sanitize(data.newContent), 
            isEdited: data.isEdited 
          } : msg
        )
      );
    };

    socket.on('connect', onConnect);
    socket.on('connect_error', onConnectError);
    socket.on('disconnect', onDisconnect);
    socket.on('joinedGroup', onJoinedGroup);
    socket.on('receiveMessage', onReceiveMessage);
    socket.on('userTyping', onUserTyping); 
    socket.on('userStatusUpdate', onUserStatusUpdate);
    socket.on('messageDeleted', onMessageDeleted);
    socket.on('messageEdited', onMessageEdited);
    socket.on('authError', (msg) => handleSocketError(msg, 'authentication'));
    socket.on('messageError', (msg) => handleSocketError(msg, 'message sending'));
    socket.on('errorJoiningGroup', (msg) => handleSocketError(msg, 'group join'));

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      socket.off('connect', onConnect);
      socket.off('connect_error', onConnectError);
      socket.off('disconnect', onDisconnect);
      socket.off('joinedGroup', onJoinedGroup);
      socket.off('receiveMessage', onReceiveMessage);
      socket.off('userTyping', onUserTyping); 
      socket.off('userStatusUpdate', onUserStatusUpdate);
      socket.off('messageDeleted', onMessageDeleted);
      socket.off('messageEdited', onMessageEdited);
      socket.off('authError', (msg) => handleSocketError(msg, 'authentication'));
      socket.off('messageError', (msg) => handleSocketError(msg, 'message sending'));
      socket.off('errorJoiningGroup', (msg) => handleSocketError(msg, 'group join'));
      socket.disconnect();
      socketRef.current = null;
    };
  }, [groupId, router, scrollToBottom, handleSocketError, group]); 

  useEffect(() => {
    if (groupId) {
      fetchGroupDetails();
    }
  }, [groupId, fetchGroupDetails]);

  const handleSendMessage = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === '' || !socketRef.current || !group || !group.isMember) {
        return;
    }
    const token = localStorage.getItem('token');
    if (!token) {
      handleSocketError('الرجاء تسجيل الدخول لإرسال الرسائل.', 'message sending');
      return;
    }
    const sanitizedContent = DOMPurify.sanitize(newMessage.trim());
    socketRef.current.emit('sendMessage', {
      groupId: group.id,
      content: sanitizedContent,
      token: token,
      type: 'text',
    });
    setNewMessage('');
    handleTyping(false); 
  }, [newMessage, group, handleTyping, handleSocketError]);

  const startEditing = useCallback((message: Message) => {
    setEditingMessageId(message.id);
    setEditingContent(DOMPurify.sanitize(message.content));
  }, []);

  const submitEdit = useCallback(() => {
    if (!editingMessageId || !editingContent.trim() || !socketRef.current || !group) return;
    const token = localStorage.getItem('token');
    if (!token) {
      handleSocketError('الرجاء تسجيل الدخول لتعديل الرسائل.', 'message editing');
      return;
    }
    const sanitizedContent = DOMPurify.sanitize(editingContent.trim());
    socketRef.current.emit('editMessage', {
      messageId: editingMessageId,
      groupId: group.id,
      newContent: sanitizedContent,
      token: token,
    });
    setEditingMessageId(null);
    setEditingContent('');
  }, [editingMessageId, editingContent, group, handleSocketError]);

  const cancelEdit = useCallback(() => {
    setEditingMessageId(null);
    setEditingContent('');
  }, []);

  const handleDeleteMessage = useCallback((messageId: string) => {
    const confirmDelete = window.confirm('هل أنت متأكد أنك تريد حذف هذه الرسالة؟');
    if (!confirmDelete) return;
    const token = localStorage.getItem('token');
    if (!token) {
      handleSocketError('الرجاء تسجيل الدخول لحذف الرسائل.', 'message deletion');
      return;
    }
    if (!socketRef.current || !group) return;
    socketRef.current.emit('deleteMessage', {
      messageId: messageId,
      groupId: group.id,
      token: token,
    });
  }, [group, handleSocketError]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    // إرسال حالة الكتابة إذا كان المستخدم يكتب
    if (e.target.value.trim() !== '') {
      handleTyping(true);
    } else {
      handleTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e as unknown as React.FormEvent);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/upload-media', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.filepath) {
      let type: string = 'file';
      if (file.type.startsWith('image')) type = 'image';
      else if (file.type.startsWith('video')) type = 'video';
      socketRef.current?.emit('sendMessage', {
        groupId: group.id,
        content: data.filepath,
        token: localStorage.getItem('token'),
        type,
      });
    }
  };

  const handleDeleteGroup = async () => {
    setIsDeletingGroup(true);
    setDeleteGroupError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/groups/${group.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        router.push('/groups');
      } else {
        setDeleteGroupError(data.error || 'فشل حذف المجموعة');
      }
    } catch (err) {
      setDeleteGroupError('حدث خطأ أثناء حذف المجموعة');
    } finally {
      setIsDeletingGroup(false);
    }
  };

  const toggleSelectMember = (memberId: string) => {
    setSelectedMemberIds(prev => prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]);
  };

  const handleBulkDeleteMembers = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBulkDeleting(true);
    setBulkDeleteError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/groups/${group.id}/members`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: selectedMemberIds })
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedMemberIds([]);
        fetchGroupDetails();
      } else {
        setBulkDeleteError(data.error || 'فشل حذف الأعضاء');
      }
    } catch (err) {
      setBulkDeleteError('حدث خطأ أثناء حذف الأعضاء');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  useEffect(() => {
    if (!previewImage) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewImage(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewImage]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-vh-100 d-flex flex-column">
        <main className="flex-grow-1 py-5 container">
          <ErrorMessage message={error} />
          {error.includes('الرجاء تسجيل الدخول') && (
            <button
              onClick={() => router.push('/auth/login')}
              className="btn btn-primary mt-4"
            >
              تسجيل الدخول
            </button>
          )}
          {error.includes('غير مصرح لك بالانضمام') || error.includes('المجموعة غير موجودة') ? (
            <button
              onClick={() => router.push('/')}
              className="btn btn-primary mt-4"
            >
              العودة إلى استكشاف المجموعات
            </button>
          ) : (
            !error.includes('الرجاء تسجيل الدخول') && (
              <button
                onClick={() => fetchGroupDetails()}
                className="btn btn-success mt-4"
              >
                إعادة المحاولة
              </button>
            )
          )}
        </main>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-vh-100 d-flex flex-column">
        <main className="flex-grow-1 py-5 container">
          <p className="text-center text-danger fs-5">المجموعة غير متوفرة أو حدث خطأ أثناء تحميلها.</p>
        </main>
      </div>
    );
  }

  let filteredMessages = messages;
  if (activeTab === 'images') filteredMessages = messages.filter(
    m => m.type === 'image' || (typeof m.content === 'string' && /\.(jpg|jpeg|png|gif)$/i.test(m.content))
  );
  if (activeTab === 'videos') filteredMessages = messages.filter(m => m.type === 'video');

  return (
    <div className="container-fluid py-4" style={{ background: "#f8f9fb", minHeight: "100vh" }}>
      <div className="row flex-column-reverse flex-lg-row">
        {/* الشات والمحتوى */}
        <div className="col-lg-8 col-md-7 col-12 mb-4 order-2 order-lg-1">
          <div className="bg-white rounded shadow-sm p-4 mb-3">
            <h3 className="fw-bold mb-1 d-flex align-items-center gap-2 position-relative">
              {group.name}
            </h3>
            <span className="text-muted small">{group.memberCount} أعضاء</span>
          </div>
          {/* شريط التبويبات */}
          <ul className="nav nav-tabs mb-3">
            <li className="nav-item">
              <button className={`nav-link ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>الدردشة</button>
            </li>
            <li className="nav-item">
              <button className={`nav-link ${activeTab === 'images' ? 'active' : ''}`} onClick={() => setActiveTab('images')}>الصور</button>
            </li>
            <li className="nav-item">
              <button className={`nav-link ${activeTab === 'videos' ? 'active' : ''}`} onClick={() => setActiveTab('videos')}>الفيديوهات</button>
            </li>
            <li className="nav-item"><a className="nav-link" href="#">PDFs</a></li>
            <li className="nav-item"><a className="nav-link" href="#">تسجيلات صوتية</a></li>
            <li className="nav-item"><a className="nav-link" href="#">روابط</a></li>
          </ul>
          {/* رسائل الدردشة */}
          <div className="chat-messages" style={{ height: 400, overflowY: "auto", background: "#f8f9fa", borderRadius: 8, padding: 16 }}>
            {filteredMessages.length === 0 ? (
              <p className="text-center text-muted">لا توجد رسائل بعد. ابدأ الدردشة!</p>
            ) : (
              activeTab === 'images' ? (
                <div className="d-flex flex-wrap gap-3">
                  {filteredMessages.map((msg, idx) => (
                    <img
                      key={idx}
                      src={msg.content && !msg.content.startsWith('/') ? '/' + msg.content : msg.content}
                      alt="صورة"
                      style={{ maxWidth: 180, maxHeight: 180, borderRadius: 8, objectFit: 'cover', cursor: 'pointer', transition: 'box-shadow 0.2s' }}
                      onClick={() => setPreviewImage(msg.content && !msg.content.startsWith('/') ? '/' + msg.content : msg.content)}
                    />
                  ))}
                </div>
              ) : (
                filteredMessages.map((msg, idx) => (
                  <div key={idx} className={`d-flex mb-3 ${msg.sender === group.adminId ? 'justify-content-end' : ''}`} style={{ alignItems: 'flex-end' }}>
                    <img src={msg.senderAvatar || '/default-avatar.png'} className="rounded-circle me-2" width={40} height={40} alt="avatar" />
                    <div>
                      <div className="fw-bold small d-flex align-items-center gap-2">
                        {msg.type === 'image' && <FaImage className="text-info" />}
                        {msg.type === 'video' && <FaVideo className="text-danger" />}
                        {msg.type === 'file' && <FaFileAlt className="text-secondary" />}
                        {msg.senderName || 'مستخدم غير معروف'}
                      </div>
                      <div className={`p-2 rounded-3 mt-1 ${msg.sender === group.adminId ? 'bg-info text-white' : 'bg-light'}`} style={{ minWidth: 120, maxWidth: 350 }}>
                        {(() => {
                          const isImage = msg.type === 'image' || (typeof msg.content === 'string' && /\.(jpg|jpeg|png|gif)$/i.test(msg.content));
                          const isVideo = msg.type === 'video' || (typeof msg.content === 'string' && /\.(mp4|webm|mov)$/i.test(msg.content));
                          if (isImage) {
                            return (
                              <img
                                src={msg.content && !msg.content.startsWith('/') ? '/' + msg.content : msg.content}
                                alt="صورة"
                                style={{ maxWidth: 200, borderRadius: 8, cursor: 'pointer' }}
                                onClick={() => setPreviewImage(msg.content && !msg.content.startsWith('/') ? '/' + msg.content : msg.content)}
                              />
                            );
                          } else if (isVideo) {
                            return <video src={msg.content && !msg.content.startsWith('/') ? '/' + msg.content : msg.content} controls style={{ maxWidth: 250, borderRadius: 8 }} />;
                          } else if (msg.type === 'file') {
                            return <a href={msg.content && !msg.content.startsWith('/') ? '/' + msg.content : msg.content} target="_blank" rel="noopener noreferrer">ملف مرفق</a>;
                          } else {
                            return <span>{msg.content}</span>;
                          }
                        })()}
                      </div>
                      <div className="text-muted small text-end mt-1">{new Date(msg.timestamp).toLocaleTimeString()}</div>
                    </div>
                  </div>
                ))
              )
            )}
            <div ref={messagesEndRef} />
          </div>
          {/* مربع كتابة الرسالة */}
          <div className="input-group mt-3 align-items-center">
            <input
              type="text"
              className="form-control"
              placeholder="اكتب رسالة..."
              value={newMessage}
              onChange={handleMessageChange}
              onKeyDown={handleKeyDown}
              disabled={!isConnected}
              style={{ borderRadius: '20px' }}
            />
            <label className="btn btn-light mb-0 ms-2" title="إرفاق صورة/فيديو" style={{ borderRadius: '50%' }}>
              <FaPaperclip size={20} />
              <input type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handleFileChange} />
            </label>
            <button className="btn btn-primary ms-2" onClick={handleSendMessage} disabled={!isConnected || !newMessage.trim()} style={{ borderRadius: '50%' }}>
              <FaRegSmile size={20} />
            </button>
          </div>
        </div>
        {/* الشريط الجانبي */}
        <div className="col-lg-4 col-md-5 col-12 order-1 order-lg-2">
          <div className="bg-white rounded shadow-sm p-4 mb-3">
            <div className="d-flex align-items-center mb-3 position-relative">
              <img src={group.coverImageUrl || '/default-group.png'} className="rounded-circle me-3" width={56} height={56} alt="group" />
              <div>
                <div className="fw-bold d-flex align-items-center gap-2">
                  {group.name}
                  {isCurrentUserAdmin && (
                    <div className="dropdown" style={{ direction: 'rtl' }}>
                      <button
                        className="btn btn-sm btn-light border-0 admin-dropdown-toggle"
                        type="button"
                        id="adminActionsDropdown"
                        data-bs-toggle="dropdown"
                        aria-expanded="false"
                        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.07)', transition: 'background 0.2s', color: '#3b3b98' }}
                      >
                        <i className="bi bi-three-dots-vertical fs-4"></i>
                      </button>
                      <ul
                        className="dropdown-menu dropdown-menu-end shadow"
                        aria-labelledby="adminActionsDropdown"
                        style={{ minWidth: 180, textAlign: 'right', borderRadius: 12 }}
                      >
                        <li>
                          <a className="dropdown-item d-flex align-items-center gap-2" href={`/group/${group.id}/edit`}>
                            <i className="bi bi-pencil text-primary"></i>
                            <span>تعديل المجموعة</span>
                          </a>
                        </li>
                        <li><hr className="dropdown-divider" /></li>
                        <li>
                          <button
                            className="dropdown-item d-flex align-items-center gap-2 text-danger"
                            onClick={() => setShowDeleteGroupModal(true)}
                            style={{ fontWeight: 500 }}
                          >
                            <i className="bi bi-trash-fill"></i>
                            <span>حذف المجموعة</span>
                          </button>
                          <div className="small text-danger ps-3 pe-3 pb-1">تحذير: لا يمكن التراجع بعد الحذف!</div>
                        </li>
                      </ul>
                    </div>
                  )}
                </div>
                <div className="text-muted small">{group.memberCount} أعضاء</div>
              </div>
            </div>
            <h6 className="fw-bold mt-4 mb-2">الأعضاء</h6>
            <ul className="list-unstyled">
              {group.members && group.members.length > 0 ? group.members.map((member: any, idx: number) => (
                <li key={idx} className="d-flex align-items-center mb-2 position-relative">
                  <img src={member.avatar || '/default-avatar.png'} className="rounded-circle me-2" width={32} height={32} alt={member.name} />
                  <span
                    className={onlineUsers.has(member.id) ? 'online-indicator' : 'offline-indicator'}
                    style={{
                      position: 'absolute',
                      right: 30,
                      bottom: 2,
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      background: onlineUsers.has(member.id) ? '#28c76f' : '#adb5bd',
                      border: '2px solid #fff',
                      boxShadow: '0 0 4px rgba(0,0,0,0.1)'
                    }}
                  ></span>
                  <span>{member.name}</span>
                </li>
              )) : <li className="text-muted">لا يوجد أعضاء</li>}
            </ul>
          </div>
        </div>
      </div>
      {/* Modal تأكيد حذف المجموعة */}
      {showDeleteGroupModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.3)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title text-danger">تأكيد حذف المجموعة</h5>
                <button type="button" className="btn-close" onClick={() => setShowDeleteGroupModal(false)}></button>
              </div>
              <div className="modal-body">
                {group.memberCount > 1 ? (
                  <div className="alert alert-warning">
                    لا يمكنك حذف المجموعة إلا إذا كنت العضو الوحيد فيها. يرجى حذف جميع الأعضاء أولاً.
                  </div>
                ) : (
                  <>
                    <p>هل أنت متأكد أنك تريد حذف المجموعة؟ لا يمكن التراجع عن هذا الإجراء.</p>
                    {deleteGroupError && <div className="alert alert-danger">{deleteGroupError}</div>}
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowDeleteGroupModal(false)}>إلغاء</button>
                <button className="btn btn-danger" disabled={group.memberCount > 1 || isDeletingGroup} onClick={handleDeleteGroup}>
                  {isDeletingGroup ? 'جاري الحذف...' : 'تأكيد الحذف'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {previewImage && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ background: 'rgba(0,0,0,0.7)', zIndex: 2000 }}
          onClick={() => setPreviewImage(null)}
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '90vw' }} onClick={e => e.stopPropagation()}>
            <div className="modal-content bg-transparent border-0 shadow-none">
              <img
                src={previewImage}
                alt="صورة مكبرة"
                style={{ maxWidth: '80vw', maxHeight: '80vh', borderRadius: 16, boxShadow: '0 4px 32px rgba(0,0,0,0.3)' }}
              />
              <button
                className="btn btn-light position-absolute top-0 end-0 m-3 fs-3"
                style={{ borderRadius: '50%', zIndex: 10 }}
                onClick={() => setPreviewImage(null)}
              >
                &times;
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/*
.admin-dropdown-toggle:hover, .admin-dropdown-toggle:focus {
  background: #e0e7ff !important;
  color: #222 !important;
}
*/











