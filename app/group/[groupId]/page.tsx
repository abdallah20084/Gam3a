// app/group/[groupId]/page.tsx
'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';
import { io, Socket } from 'socket.io-client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { MoreHorizontal } from 'lucide-react';
import DOMPurify from 'dompurify';

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
  sendMessage: (data: { groupId: string; content: string; token: string }) => void;
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
  const [isCurrentUserSuperAdmin, setIsCurrentUserSuperAdmin] = useState(false);

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
      const superAdminStatus = localStorage.getItem('isSuperAdmin') === 'true';
      setIsCurrentUserSuperAdmin(superAdminStatus);

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
      setError('حدث خطأ في الاتصال بالخادم. الرجاء المحاولة لاحقاً.');
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

    const socket: AppSocket = io(SOCKET_SERVER_URL, {
      path: '/api/socket',
      auth: { token },
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket'],
    });

    socketRef.current = socket;

    const onConnect = () => {
      setIsConnected(true);
      socket.emit('joinGroup', groupId, token);
    };

    const onConnectError = (error: any) => {
      setError('فشل الاتصال بخادم الدردشة. الرجاء التأكد من تشغيل الخادم بشكل صحيح.');
      setIsConnected(false);
    };

    const onDisconnect = () => {
      setIsConnected(false);
      setTypingUsers(new Set()); 
    };

    const onJoinedGroup = (data: { groupId: string; messages: Message[] }) => {
      setMessages(data.messages.map(msg => ({
          id: msg.id,
          groupId: msg.groupId,
          sender: msg.sender, 
          content: DOMPurify.sanitize(msg.content), 
          timestamp: msg.timestamp,
          senderName: group?.members.find(m => m.id === msg.sender)?.name || 'مستخدم غير معروف',
          senderAvatar: group?.members.find(m => m.id === msg.sender)?.avatar || null,
      })));
      setTimeout(scrollToBottom, 100);
    };

    const onReceiveMessage = (message: Message) => {
      setMessages(prev => [...prev, {
          id: message.id,
          groupId: message.groupId,
          sender: message.sender,
          content: DOMPurify.sanitize(message.content), 
          timestamp: message.timestamp,
          senderName: group?.members.find(m => m.id === message.sender)?.name || 'مستخدم غير معروف',
          senderAvatar: group?.members.find(m => m.id === message.sender)?.avatar || null,
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
        <Navbar />
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
        <Navbar />
        <main className="flex-grow-1 py-5 container">
          <p className="text-center text-danger fs-5">المجموعة غير متوفرة أو حدث خطأ أثناء تحميلها.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-vh-100 bg-light d-flex flex-column">
      <Navbar />
      <main className="container-fluid py-3">
        <div className="row">
          <div className="col-12 col-lg-9 mb-3">
            {/* منطقة الدردشة */}
            <div className="bg-white rounded-3 shadow-sm p-4 h-100 d-flex flex-column">
              <h1 className="fs-2 fw-bold mb-2">{group.name}</h1>
              <p className="text-secondary mb-3">{group.memberCount} أعضاء</p>
              <div className="border-bottom mb-3 d-flex gap-2">
                <button className="btn btn-link border-0 border-bottom border-2 border-primary text-primary fw-bold rounded-0">الدردشة</button>
                <button className="btn btn-link border-0 text-secondary">الفيديوهات</button>
                <button className="btn btn-link border-0 text-secondary">الصور</button>
                <button className="btn btn-link border-0 text-secondary">PDFs</button>
                <button className="btn btn-link border-0 text-secondary">تسجيلات صوتية</button>
                <button className="btn btn-link border-0 text-secondary">روابط</button>
              </div>
              <div className="flex-grow-1 overflow-auto border rounded-3 p-3 bg-light mb-3 d-flex flex-column" style={{ minHeight: 300 }}>
                {messages.length === 0 && !loading ? (
                  <p className="text-center text-muted">لا توجد رسائل بعد. ابدأ الدردشة!</p>
                ) : (
                  messages.map((msg) => {
                    const senderInfo = group?.members.find(member => member.id === msg.sender);
                    const displaySenderName = senderInfo?.name || 'مستخدم غير معروف';
                    const displaySenderAvatar = senderInfo?.avatar || '/default-avatar.png';
                    const isSystemMessage = msg.isSystemMessage || false;
                    return (
                      <div
                        key={msg.id}
                        className={`mb-2 p-3 rounded-3 position-relative ${isSystemMessage
                          ? 'bg-warning-subtle text-warning-emphasis text-center mx-auto'
                          : msg.sender === currentUserId
                            ? 'bg-primary-subtle ms-auto'
                            : 'bg-secondary-subtle me-auto'
                        }`}
                        style={{ maxWidth: isSystemMessage ? '90%' : '70%' }}
                      >
                        {!isSystemMessage ? (
                          <>
                            <div className="d-flex align-items-center mb-1">
                              <img
                                src={displaySenderAvatar}
                                alt={displaySenderName}
                                className="rounded-circle object-cover me-2"
                                style={{ width: 32, height: 32 }}
                              />
                              <span className="fw-semibold text-dark">{displaySenderName}</span>
                            </div>
                            {editingMessageId === msg.id ? (
                              <div>
                                <input
                                  type="text"
                                  value={editingContent}
                                  onChange={(e) => setEditingContent(e.target.value)}
                                  className="form-control mb-2"
                                />
                                <div className="d-flex justify-content-end gap-2">
                                  <button onClick={submitEdit} className="btn btn-success btn-sm">
                                    حفظ
                                  </button>
                                  <button onClick={cancelEdit} className="btn btn-secondary btn-sm">
                                    إلغاء
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="text-dark" dangerouslySetInnerHTML={{ __html: msg.content }}></div>
                            )}
                            <div className="text-end text-muted small mt-1">
                              {new Date(msg.timestamp).toLocaleTimeString()}
                              {msg.isEdited && <span className="ms-2 text-primary">(مُعدلة)</span>}
                            </div>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="position-absolute top-0 end-0 opacity-0 group-hover:opacity-100"
                                  style={{ transition: 'opacity 0.2s' }}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-1 d-flex flex-column gap-1">
                                {msg.sender === currentUserId && (
                                  <Button
                                    variant="ghost"
                                    className="w-100 text-end"
                                    onClick={() => startEditing(msg)}
                                  >
                                    تعديل
                                  </Button>
                                )}
                                {(isCurrentUserAdmin || isCurrentUserSuperAdmin) && (
                                  <Button
                                    variant="ghost"
                                    className="w-100 text-end text-danger"
                                    onClick={() => handleDeleteMessage(msg.id)}
                                  >
                                    حذف
                                  </Button>
                                )}
                              </PopoverContent>
                            </Popover>
                          </>
                        ) : (
                          <div className="fst-italic small" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(msg.content) }}></div>
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
              {typingUsers.size > 0 && (
                <div className="text-secondary small mb-2">
                  {Array.from(typingUsers)
                    .map(userId => group.members.find(m => m.id === userId)?.name || 'مستخدم غير معروف')
                    .filter(Boolean)
                    .join(', ')}{' '}
                  يكتب...
                </div>
              )}
              <form onSubmit={handleSendMessage} className="d-flex align-items-center gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleTyping(e.target.value.length > 0);
                  }}
                  placeholder="اكتب رسالة..."
                  className="form-control rounded-pill"
                  disabled={!group.isMember || !isConnected}
                />
                <button
                  type="submit"
                  className="btn btn-primary rounded-circle d-flex align-items-center justify-content-center"
                  disabled={!group.isMember || !isConnected || newMessage.trim() === ''}
                  style={{ width: 44, height: 44 }}
                >
                  <i className="bi bi-send fs-5"></i>
                </button>
              </form>
              {!group.isMember && (
                <p className="text-danger small mt-2 text-center">يجب أن تكون عضواً في هذه المجموعة لإرسال الرسائل.</p>
              )}
              {!isConnected && (
                <p className="text-warning small mt-2 text-center">جاري الاتصال بخادم الدردشة...</p>
              )}
            </div>
          </div>
          <div className="col-12 col-lg-3">
            {/* معلومات المجموعة */}
            <div className="bg-white rounded-3 shadow-sm p-4 mb-3">
              <h2 className="fs-5 fw-bold mb-3">معلومات المجموعة</h2>
              {group.coverImageUrl && (
                <img
                  src={group.coverImageUrl}
                  alt={group.name}
                  className="w-100 rounded-3 mb-3"
                  style={{ height: 130, objectFit: 'cover' }}
                />
              )}
              <p className="text-dark mb-2">{group.description}</p>
              <div className="d-flex align-items-center text-secondary small mb-3 gap-3">
                <span>عدد الأعضاء: {group.memberCount}</span>
                {group.createdAt && (
                  <span>تأسست: {new Date(group.createdAt).toLocaleDateString()}</span>
                )}
              </div>
              <h3 className="fs-6 fw-bold mb-2">الأعضاء ({group.members.length})</h3>
              <div className="vstack gap-2">
                {group.members
                  .sort((a, b) => (a.role === 'admin' ? -1 : 1))
                  .map((member) => (
                    <div key={member.id} className="d-flex align-items-center gap-2">
                      <div className="position-relative">
                        <img
                          src={member.avatar || '/default-avatar.png'}
                          alt={member.name}
                          className="rounded-circle object-cover"
                          style={{ width: 40, height: 40 }}
                        />
                        <span
                          className={`position-absolute bottom-0 end-0 rounded-circle border border-white`}
                          style={{
                            width: 12,
                            height: 12,
                            background: onlineUsers.has(member.id) ? '#28a745' : '#adb5bd'
                          }}
                        ></span>
                      </div>
                      <div>
                        <span className="fw-semibold d-flex align-items-center gap-1">
                          {member.name}
                          {member.role === 'admin' && (
                            <span className="badge bg-primary ms-1">مشرف</span>
                          )}
                        </span>
                        <span className="text-secondary small">{member.role !== 'admin' ? member.role : ''}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
