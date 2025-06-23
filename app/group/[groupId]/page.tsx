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
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 p-6 container mx-auto">
          <ErrorMessage message={error} />
          {error.includes('الرجاء تسجيل الدخول') && (
            <button
              onClick={() => router.push('/auth/login')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              تسجيل الدخول
            </button>
          )}
          {error.includes('غير مصرح لك بالانضمام') || error.includes('المجموعة غير موجودة') ? (
            <button
              onClick={() => router.push('/')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              العودة إلى استكشاف المجموعات
            </button>
          ) : (
            !error.includes('الرجاء تسجيل الدخول') && (
              <button
                onClick={() => fetchGroupDetails()}
                className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 mr-2"
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
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 p-6 container mx-auto">
          <p className="text-center text-red-600 text-lg">المجموعة غير متوفرة أو حدث خطأ أثناء تحميلها.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Navbar />
      <main className="container-fluid py-3">
        <div className="row">
          <div className="col-12 col-lg-9 mb-3">
            {/* منطقة الدردشة */}
            <div className="flex-1 bg-white rounded-lg shadow-md p-6 mr-4 flex flex-col">
              <h1 className="text-3xl font-bold mb-4">{group.name}</h1>
              <p className="text-gray-600 mb-4">{group.memberCount} أعضاء</p>
              <div className="flex border-b border-gray-200 mb-4">
                <button className="py-2 px-4 text-blue-600 border-b-2 border-blue-600 font-semibold">الدردشة</button>
                <button className="py-2 px-4 text-gray-600 hover:text-gray-800">الفيديوهات</button>
                <button className="py-2 px-4 text-gray-600 hover:text-gray-800">الصور</button>
                <button className="py-2 px-4 text-gray-600 hover:text-gray-800">PDFs</button>
                <button className="py-2 px-4 text-gray-600 hover:text-gray-800">تسجيلات صوتية</button>
                <button className="py-2 px-4 text-gray-600 hover:text-gray-800">روابط</button>
              </div>
              <div className="flex-1 overflow-y-auto border rounded-lg p-4 bg-gray-50 mb-4 flex flex-col" style={{ minHeight: '300px' }}>
                {messages.length === 0 && !loading ? (
                  <p className="text-center text-gray-500">لا توجد رسائل بعد. ابدأ الدردشة!</p>
                ) : (
                  messages.map((msg) => {
                    const senderInfo = group?.members.find(member => member.id === msg.sender);
                    const displaySenderName = senderInfo?.name || 'مستخدم غير معروف';
                    const displaySenderAvatar = senderInfo?.avatar || '/default-avatar.png';
                    const isSystemMessage = msg.isSystemMessage || false;
                    return (
                      <div
                        key={msg.id}
                        className={`mb-2 p-3 rounded-lg max-w-[70%] relative group ${
                          msg.sender === currentUserId ? 'bg-blue-200 self-end' : 'bg-gray-200 self-start'
                        } ${isSystemMessage ? 'bg-yellow-100 text-yellow-800 self-center text-center max-w-[90%]' : ''}`}
                      >
                          {!isSystemMessage ? (
                              <>
                                  <div className="flex items-center mb-1">
                                      <img
                                      src={displaySenderAvatar}
                                      alt={displaySenderName}
                                      className="w-8 h-8 rounded-full object-cover mr-2"
                                      />
                                      <p className="font-semibold text-gray-800">{displaySenderName}</p>
                                  </div>
                                  {editingMessageId === msg.id ? (
                                      <div className="flex flex-col">
                                          <input
                                              type="text"
                                              value={editingContent}
                                              onChange={(e) => setEditingContent(e.target.value)}
                                              className="border rounded px-2 py-1 mb-2 w-full text-gray-700"
                                      />
                                      <div className="flex justify-end space-x-2 rtl:space-x-reverse">
                                          <button onClick={submitEdit} className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600">
                                              حفظ
                                          </button>
                                          <button onClick={cancelEdit} className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600">
                                              إلغاء
                                          </button>
                                      </div>
                                  </div>
                                  ) : (
                                      <p className="text-gray-700" dangerouslySetInnerHTML={{ __html: msg.content }}></p>
                                  )}
                                  <p className="text-xs text-gray-500 mt-1 text-right">
                                      {new Date(msg.timestamp).toLocaleTimeString()}
                                      {msg.isEdited && <span className="ml-2 text-blue-500">(مُعدلة)</span>}
                                  </p>
                                  <Popover>
                                      <PopoverTrigger asChild>
                                          <Button
                                              variant="ghost"
                                              size="icon"
                                              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                          >
                                              <MoreHorizontal className="h-4 w-4" />
                                          </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-auto p-1 flex flex-col space-y-1">
                                          {msg.sender === currentUserId && (
                                              <Button
                                                  variant="ghost"
                                                  className="w-full justify-start text-sm"
                                                  onClick={() => startEditing(msg)}
                                              >
                                                  تعديل
                                              </Button>
                                          )}
                                          {(isCurrentUserAdmin || isCurrentUserSuperAdmin) && (
                                              <Button
                                                  variant="ghost"
                                                  className="w-full justify-start text-sm text-red-500 hover:text-red-600"
                                                  onClick={() => handleDeleteMessage(msg.id)}
                                              >
                                                  حذف
                                              </Button>
                                          )}
                                      </PopoverContent>
                                  </Popover>
                              </>
                          ) : (
                              <p className="text-sm italic" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(msg.content) }}></p>
                          )}
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
              {typingUsers.size > 0 && (
                <div className="text-gray-600 text-sm mb-2">
                  {Array.from(typingUsers)
                    .map(userId => group.members.find(m => m.id === userId)?.name || 'مستخدم غير معروف')
                    .filter(Boolean) 
                    .join(', ')}{' '}
                  يكتب...
                </div>
              )}
              <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleTyping(e.target.value.length > 0); 
                  }}
                  placeholder="اكتب رسالة..."
                  className="flex-1 border rounded-full py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!group.isMember || !isConnected}
                />
                <button
                  type="submit"
                  className="bg-blue-600 text-white rounded-full p-3 hover:bg-blue-700 transition-colors"
                  disabled={!group.isMember || !isConnected || newMessage.trim() === ''}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </form>
              {!group.isMember && (
                <p className="text-red-500 text-sm mt-2 text-center">يجب أن تكون عضواً في هذه المجموعة لإرسال الرسائل.</p>
              )}
              {!isConnected && (
                <p className="text-orange-500 text-sm mt-2 text-center">جاري الاتصال بخادم الدردشة...</p>
              )}
            </div>
          </div>
          <div className="col-12 col-lg-3">
            {/* معلومات المجموعة */}
            <div className="w-full bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">معلومات المجموعة</h2>
              {group.coverImageUrl && (
                <img
                  src={group.coverImageUrl}
                  alt={group.name}
                  className="w-full h-32 object-cover rounded-lg mb-4"
                />
              )}
              <p className="text-gray-700 mb-2">{group.description}</p>
              <div className="flex items-center text-sm text-gray-500 mb-4 gap-3">
                <span>عدد الأعضاء: {group.memberCount}</span>
                {group.createdAt && (
                  <span>تأسست: {new Date(group.createdAt).toLocaleDateString()}</span>
                )}
              </div>
              <h3 className="text-lg font-bold mb-3">الأعضاء ({group.members.length})</h3>
              <div className="space-y-3">
                {group.members
                  .sort((a, b) => (a.role === 'admin' ? -1 : 1))
                  .map((member) => (
                    <div key={member.id} className="flex items-center space-x-3">
                      <div className="relative">
                        <img
                          src={member.avatar || '/default-avatar.png'}
                          alt={member.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <span
                          className={`absolute bottom-0 right-0 block h-3 w-3 rounded-full ring-2 ring-white ${
                            onlineUsers.has(member.id) ? 'bg-green-500' : 'bg-gray-400'
                          }`}
                        ></span>
                      </div>
                      <div>
                        <p className="font-semibold flex items-center gap-1">
                          {member.name}
                          {member.role === 'admin' && (
                            <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">مشرف</span>
                          )}
                        </p>
                        <p className="text-sm text-gray-500">{member.role !== 'admin' ? member.role : ''}</p>
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
