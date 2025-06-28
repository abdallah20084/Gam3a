// Modern Responsive Chat Design with Advanced Features
import React, { useState, useEffect, useRef } from 'react';
import { 
  FaSearch, FaEllipsisV, FaImage, FaVideo, FaFileAlt, FaMicrophone, 
  FaRegSmile, FaPaperPlane, FaTimes, FaEdit, FaTrash, FaPhone, 
  FaVideo as FaVideoCall, FaUsers, FaCog, FaHeart, FaThumbsUp, 
  FaComment, FaUser, FaEnvelope, FaReply, FaShare, FaBookmark,
  FaEye, FaEyeSlash, FaVolumeUp, FaVolumeMute, FaBell, FaBellSlash,
  FaCrown, FaShieldAlt, FaUserPlus, FaUserMinus, FaBan, FaGavel
} from 'react-icons/fa';
import dynamic from 'next/dynamic';
import DOMPurify from 'dompurify';
import io from 'socket.io-client';
import Image from 'next/image';

// Dynamic import for emoji picker to avoid SSR issues
const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

interface GroupChatProps {
  groupId: string;
  userId: string;
  members: any[];
  initialMessages?: any[];
  groupName?: string;
  isAdmin?: boolean;
}

interface Reaction {
  emoji: string;
  users: string[];
  count: number;
}

interface Comment {
  id: string;
  messageId: string;
  content: string;
  senderId: string;
  senderName: string;
  timestamp: Date;
}

interface Message {
  id: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'file' | 'system';
  senderId: string;
  senderName: string;
  timestamp: Date;
  reactions?: Reaction[];
  comments?: Comment[];
  replyTo?: any;
  isEdited?: boolean;
  isDeleted?: boolean;
  isPinned?: boolean;
  isPrivate?: boolean;
}

// Modern MembersList with enhanced features
const MembersList: React.FC<{
  members: any[];
  onlineUsers: Set<string>;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onUserClick: (user: any) => void;
  currentUserId: string;
  isAdmin: boolean;
}> = ({ members, onlineUsers, searchQuery, setSearchQuery, onUserClick, currentUserId, isAdmin }) => (
  <div className="card border-0 h-100 bg-gradient-light">
    <div className="card-header bg-white border-bottom d-flex align-items-center justify-content-between">
      <span className="fw-bold text-primary">
        <FaUsers className="me-2" />
        أعضاء المجموعة
      </span>
      <span className="badge bg-primary bg-opacity-10 text-primary rounded-pill">
        {members.length} عضو
      </span>
    </div>
    <div className="card-body p-0">
      <div className="p-3 border-bottom">
        <div className="input-group">
          <span className="input-group-text bg-light border-0">
            <FaSearch className="text-muted" />
          </span>
          <input
            type="text"
            className="form-control border-0 bg-light"
            placeholder="البحث في الأعضاء..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      <div className="overflow-auto" style={{maxHeight: 'calc(100vh - 200px)'}}>
        {members.length === 0 ? (
          <div className="text-center text-muted py-5">
            <FaUsers size={48} className="mb-3 opacity-50" />
            <p>لا يوجد أعضاء في المجموعة</p>
          </div>
        ) : (
          <div className="list-group list-group-flush">
            {members
              .filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()))
              .sort((a, b) => {
                // Sort by role (admin first), then online status, then name
                if (a.role === 'admin' && b.role !== 'admin') return -1;
                if (a.role !== 'admin' && b.role === 'admin') return 1;
                const aOnline = onlineUsers.has(a.id);
                const bOnline = onlineUsers.has(b.id);
                if (aOnline && !bOnline) return -1;
                if (!aOnline && bOnline) return 1;
                return a.name.localeCompare(b.name);
              })
              .map(member => (
                <div 
                  key={member.id} 
                  className="list-group-item list-group-item-action border-0 px-3 py-2 d-flex align-items-center"
                  onClick={() => onUserClick(member)}
                  style={{cursor: 'pointer'}}
                >
                  <div className="position-relative me-3">
                    {member.avatar ? (
                      <img 
                        src={member.avatar} 
                        alt={member.name} 
                        className="rounded-circle border-2" 
                        width={45} 
                        height={45} 
                        style={{
                          objectFit: 'cover',
                          borderColor: onlineUsers.has(member.id) ? '#28a745' : '#dee2e6'
                        }}
                      />
                    ) : (
                      <div 
                        className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white border-2"
                        style={{
                          width: 45,
                          height: 45,
                          background: member.role === 'admin' 
                            ? 'linear-gradient(135deg, #ff6b6b, #ee5a24)' 
                            : 'linear-gradient(135deg, #667eea, #764ba2)',
                          borderColor: onlineUsers.has(member.id) ? '#28a745' : '#dee2e6'
                        }}
                      >
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span 
                      className={`position-absolute bottom-0 start-0 translate-middle p-1 border border-white rounded-circle ${
                        onlineUsers.has(member.id) ? 'bg-success' : 'bg-secondary'
                      }`} 
                      style={{width: 12, height: 12}}
                    />
                  </div>
                  <div className="flex-grow-1">
                    <div className="d-flex align-items-center">
                      <span className="fw-semibold text-dark me-2">{member.name}</span>
                      {member.role === 'admin' && (
                        <FaCrown className="text-warning" size={12} title="مدير المجموعة" />
                      )}
                      {member.id === currentUserId && (
                        <span className="badge bg-primary bg-opacity-10 text-primary rounded-pill ms-1">أنت</span>
                      )}
                    </div>
                    <div className="d-flex align-items-center">
                      <small className={`me-2 ${onlineUsers.has(member.id) ? 'text-success' : 'text-muted'}`}>
                        {onlineUsers.has(member.id) ? '🟢 متصل' : '⚫ غير متصل'}
                      </small>
                      {member.role && (
                        <small className="text-muted">
                          {member.role === 'admin' ? 'مدير' : 'عضو'}
                        </small>
                      )}
                    </div>
                  </div>
                  <div className="dropdown">
                    <button 
                      className="btn btn-sm btn-light rounded-circle p-1"
                      data-bs-toggle="dropdown"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <FaEllipsisV size={10} />
                    </button>
                    <ul className="dropdown-menu dropdown-menu-end">
                      <li>
                        <button className="dropdown-item" onClick={() => onUserClick(member)}>
                          <FaUser className="me-2" />عرض الملف الشخصي
                        </button>
                      </li>
                      <li>
                        <button className="dropdown-item">
                          <FaEnvelope className="me-2" />رسالة خاصة
                        </button>
                      </li>
                      {isAdmin && member.id !== currentUserId && (
                        <>
                          <li><hr className="dropdown-divider" /></li>
                          <li>
                            <button className="dropdown-item text-warning">
                              <FaCrown className="me-2" />ترقية لمدير
                            </button>
                          </li>
                          <li>
                            <button className="dropdown-item text-danger">
                              <FaBan className="me-2" />طرد من المجموعة
                            </button>
                          </li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  </div>
);

// Modern Message Bubble Component
const MessageBubble: React.FC<{
  message: Message;
  isOwnMessage: boolean;
  onReaction: (messageId: string, emoji: string) => void;
  onComment: (messageId: string) => void;
  onReply: (message: Message) => void;
  onPin: (messageId: string) => void;
  onShare: (message: Message) => void;
  onBookmark: (messageId: string) => void;
  onEdit: (messageId: string, content: string) => void;
  onDelete: (messageId: string) => void;
  showReactionPicker: string | null;
  setShowReactionPicker: (messageId: string | null) => void;
  showComments: string | null;
  setShowComments: (messageId: string | null) => void;
  commentInput: string;
  setCommentInput: (input: string) => void;
  onCommentSubmit: (messageId: string) => void;
  isAdmin: boolean;
  setPreviewImage: (url: string | null) => void;
  messageSearchQuery: string;
}> = ({
  message,
  isOwnMessage,
  onReaction,
  onComment,
  onReply,
  onPin,
  onShare,
  onBookmark,
  onEdit,
  onDelete,
  showReactionPicker,
  setShowReactionPicker,
  showComments,
  setShowComments,
  commentInput,
  setCommentInput,
  onCommentSubmit,
  isAdmin,
  setPreviewImage,
  messageSearchQuery
}) => (
  <div className={`message-bubble-container ${isOwnMessage ? 'own-message' : 'other-message'}`} data-message-id={message.id}>
    <div className={`message-bubble ${isOwnMessage ? 'sent' : 'received'} position-relative`}>
      {/* Message Header */}
      <div className="message-header d-flex align-items-center justify-content-between mb-2">
        <div className="d-flex align-items-center">
          {!isOwnMessage && (
            <span className="fw-semibold text-primary me-2">{message.senderName}</span>
          )}
          {message.isPinned && (
            <FaBookmark className="text-warning me-1" size={12} title="رسالة مثبتة" />
          )}
          {message.isEdited && (
            <small className="text-muted">(تم التعديل)</small>
          )}
        </div>
        <div className="message-actions d-flex gap-1">
          <button 
            className="btn btn-sm btn-light rounded-circle p-1"
            onClick={() => setShowReactionPicker(showReactionPicker === message.id ? null : message.id)}
            title="إضافة رد فعل"
          >
            <FaHeart size={12} />
          </button>
          <button 
            className="btn btn-sm btn-light rounded-circle p-1"
            onClick={() => onReply(message)}
            title="رد"
          >
            <FaReply size={12} />
          </button>
          <div className="dropdown">
            <button 
              className="btn btn-sm btn-light rounded-circle p-1"
              data-bs-toggle="dropdown"
              title="المزيد"
            >
              <FaEllipsisV size={12} />
            </button>
            <ul className="dropdown-menu dropdown-menu-end">
              <li>
                <button className="dropdown-item" onClick={() => onComment(message.id)}>
                  <FaComment className="me-2" />تعليق
                </button>
              </li>
              <li>
                <button className="dropdown-item" onClick={() => onShare(message)}>
                  <FaShare className="me-2" />مشاركة
                </button>
              </li>
              <li>
                <button className="dropdown-item" onClick={() => onBookmark(message.id)}>
                  <FaBookmark className="me-2" />حفظ
                </button>
              </li>
              {isAdmin && (
                <li>
                  <button className="dropdown-item" onClick={() => onPin(message.id)}>
                    <FaBookmark className="me-2" />تثبيت
                  </button>
                </li>
              )}
              {isOwnMessage && (
                <>
                  <li><hr className="dropdown-divider" /></li>
                  <li>
                    <button className="dropdown-item" onClick={() => onEdit(message.id, message.content)}>
                      <FaEdit className="me-2" />تعديل
                    </button>
                  </li>
                  <li>
                    <button className="dropdown-item text-danger" onClick={() => onDelete(message.id)}>
                      <FaTrash className="me-2" />حذف
                    </button>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Message Content */}
      <div className="message-content">
        {message.type === 'text' && (
          <div 
            dangerouslySetInnerHTML={{ 
              __html: messageSearchQuery 
                ? DOMPurify.sanitize(
                    message.content.replace(
                      new RegExp(`(${messageSearchQuery})`, 'gi'),
                      '<mark class="bg-warning">$1</mark>'
                    )
                  )
                : DOMPurify.sanitize(message.content) 
            }} 
          />
        )}
        {message.type === 'image' && (
          <img 
            src={message.content} 
            alt="صورة" 
            className="img-fluid rounded my-2" 
            style={{maxHeight: 200, cursor: 'pointer'}} 
            onClick={() => setPreviewImage(message.content)} 
          />
        )}
        {message.type === 'video' && (
          <video 
            src={message.content} 
            controls 
            className="img-fluid rounded my-2" 
            style={{maxHeight: 200}} 
          />
        )}
        {message.type === 'file' && (
          <a 
            href={message.content} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="btn btn-outline-primary btn-sm mt-2"
          >
            <FaFileAlt className="me-1" />تحميل الملف
          </a>
        )}
      </div>

      {/* Reactions */}
      {message.reactions && message.reactions.length > 0 && (
        <div className="message-reactions mt-2">
          {message.reactions.map((reaction, index) => (
            <button
              key={index}
              className="btn btn-sm btn-light rounded-pill me-1"
              onClick={() => onReaction(message.id, reaction.emoji)}
              title={`${reaction.count} ${reaction.emoji}`}
            >
              <span className="me-1">{reaction.emoji}</span>
              <span className="badge bg-secondary rounded-pill">{reaction.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Reaction Picker */}
      {showReactionPicker === message.id && (
        <div className="reaction-picker position-absolute bottom-100 start-0 mb-2 bg-white border rounded shadow-lg p-2">
          <div className="d-flex gap-1">
            {['👍', '❤️', '😂', '😮', '😢', '😡'].map(emoji => (
              <button
                key={emoji}
                className="btn btn-sm btn-light rounded-circle"
                onClick={() => onReaction(message.id, emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Comments */}
      {showComments === message.id && (
        <div className="message-comments mt-3 border-top pt-3">
          <div className="comments-list mb-2">
            {message.comments && message.comments.map(comment => (
              <div key={comment.id} className="comment-item d-flex align-items-start mb-2">
                <div className="comment-avatar me-2">
                  <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center" style={{width: 24, height: 24}}>
                    {comment.senderName.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div className="comment-content flex-grow-1">
                  <div className="fw-semibold small">{comment.senderName}</div>
                  <div className="small">{comment.content}</div>
                  <small className="text-muted">
                    {new Date(comment.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                  </small>
                </div>
              </div>
            ))}
          </div>
          <div className="comment-input d-flex gap-2">
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="اكتب تعليق..."
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && onCommentSubmit(message.id)}
            />
            <button 
              className="btn btn-primary btn-sm"
              onClick={() => onCommentSubmit(message.id)}
              disabled={!commentInput.trim()}
            >
              إرسال
            </button>
          </div>
        </div>
      )}

      {/* Message Footer */}
      <div className="message-footer d-flex justify-content-between align-items-center mt-2">
        <small className="text-muted">
          {new Date(message.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
        </small>
        {isOwnMessage && (
          <small className="text-muted">✓</small>
        )}
      </div>
    </div>
  </div>
);

const GroupChat: React.FC<GroupChatProps> = ({
  groupId,
  userId,
  members = [],
  initialMessages = [],
  groupName = "المجموعة",
  isAdmin = false
}) => {
  // Debug logging
  console.log('🔍 GroupChat Props:', {
    groupId,
    userId,
    membersCount: members?.length || 0,
    members: members,
    groupName,
    isAdmin
  });

  // State variables
  const [messages, setMessages] = useState(initialMessages || []);
  const [messageInput, setMessageInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<any>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [isTyping, setIsTyping] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [replyToMsg, setReplyToMsg] = useState<any>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [messageDropdowns, setMessageDropdowns] = useState<{[key: string]: boolean}>({});
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  // New state variables for modern features
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [showReactions, setShowReactions] = useState<string | null>(null);
  const [showComments, setShowComments] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [mutedUsers, setMutedUsers] = useState<Set<string>>(new Set());
  const [blockedUsers, setBlockedUsers] = useState<Set<string>>(new Set());
  const [showPinnedMessages, setShowPinnedMessages] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [selectedReaction, setSelectedReaction] = useState<string>('');
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const offcanvasRef = useRef<HTMLDivElement>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const messageSearchRef = useRef<HTMLInputElement>(null);

  // Normalize members data to handle different structures
  const normalizedMembers = React.useMemo(() => {
    if (!members || !Array.isArray(members)) {
      console.warn('⚠️ Members prop is not an array:', members);
      return [];
    }
    
    return members.map(member => ({
      id: member.id || member._id || member.userId,
      name: member.name || member.userName || 'مستخدم غير معروف',
      avatar: member.avatar || member.profileImage || null,
      role: member.role || 'member',
      joinedAt: member.joinedAt || member.createdAt || new Date(),
    })).filter(member => member.id && member.name);
  }, [members]);

  console.log('✅ Normalized members:', normalizedMembers);

  // Enhanced filtered messages with modern features
  const filteredMessages = React.useMemo(() => {
    let filtered = (messages || []).filter(msg => {
      // Filter out messages from blocked users
      if (blockedUsers.has(msg.senderId)) return false;
      
      // Filter by search query if active
      if (messageSearchQuery && !msg.content.toLowerCase().includes(messageSearchQuery.toLowerCase())) {
        return false;
      }
      
      return true;
    });

    // Sort by timestamp (newest first)
    return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [messages, blockedUsers, messageSearchQuery]);

  // Debug logging for members changes
  useEffect(() => {
    console.log('🔄 Members prop changed:', {
      membersCount: members?.length || 0,
      members: members,
      normalizedCount: normalizedMembers.length,
      normalized: normalizedMembers
    });
  }, [members, normalizedMembers]);

  // Socket connection and event handlers
  useEffect(() => {
    const socketInitializer = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('No token found for socket connection');
          return;
        }

        if (socket && socket.connected) {
          console.log('🔗 Socket already connected, skipping initialization');
          return;
        }

        console.log('🔌 Initializing socket connection...');

        const socketInstance = io({
          transports: ['websocket'],
          timeout: 45000,
          forceNew: false,
          reconnection: true,
          reconnectionAttempts: 3,
          reconnectionDelay: 2000,
          reconnectionDelayMax: 10000,
          query: { token, groupId }
        });

        socketInstance.on('connect', () => {
          console.log('🔗 Connected to socket server');
          setIsConnected(true);
          socketInstance.emit('joinGroup', groupId, token);
        });

        socketInstance.on('connect_error', (error) => {
          console.error('🔴 Socket connection error:', error);
          setIsConnected(false);
        });

        socketInstance.on('disconnect', (reason) => {
          console.log('🔌 Disconnected from socket server:', reason);
          setIsConnected(false);
        });

        socketInstance.on('joinedGroup', (data) => {
          console.log('✅ Successfully joined group:', data.groupId);
          if (data.messages && data.messages.length > 0) {
            setMessages(data.messages);
          }
        });

        socketInstance.on('errorJoiningGroup', (error) => {
          console.error('❌ Error joining group via socket:', error);
          setIsConnected(false);
        });

        socketInstance.on('receiveMessage', (message) => {
          console.log('📨 Received new message:', message.id);
          setMessages(prev => {
            const prevMessages = prev || [];
            const messageExists = prevMessages.some(msg => msg.id === message.id);
            if (messageExists) {
              return prevMessages;
            }
            return [...prevMessages, message];
          });
        });

        socketInstance.on('userStatusUpdate', ({ userId, isOnline }) => {
          console.log('👤 User status update:', userId, isOnline);
          setOnlineUsers(prev => {
            const newSet = new Set(prev);
            if (isOnline) {
              newSet.add(userId);
            } else {
              newSet.delete(userId);
            }
            return newSet;
          });
        });

        socketInstance.on('messageError', (error) => {
          console.error('❌ Message error:', error);
        });

        socketInstance.on('authError', (error) => {
          console.error('🔑 Auth error:', error);
          setIsConnected(false);
        });

        socketInstance.on('userTyping', ({ userId, isTyping, groupId: typingGroupId }) => {
          if (typingGroupId === groupId) {
            setTypingUsers(prev => {
              const newSet = new Set(prev);
              if (isTyping) {
                newSet.add(userId);
              } else {
                newSet.delete(userId);
              }
              return newSet;
            });
          }
        });

        socketInstance.on('messageEdited', ({ messageId, newContent, isEdited }) => {
          setMessages(prev => prev.map(msg =>
            msg.id === messageId
              ? { ...msg, content: newContent, isEdited: true }
              : msg
          ));
        });

        socketInstance.on('messageDeleted', ({ messageId, deletedBy }) => {
          setMessages(prev => prev.map(msg =>
            msg.id === messageId
              ? { ...msg, content: `تم حذف هذه الرسالة بواسطة ${deletedBy}`, isDeleted: true, type: 'text' }
              : msg
          ));
        });

        // New socket event handlers for modern features
        socketInstance.on('reactionAdded', ({ messageId, reaction, userId }) => {
          setMessages(prev => prev.map(msg =>
            msg.id === messageId
              ? {
                  ...msg,
                  reactions: [
                    ...(msg.reactions || []),
                    { emoji: reaction, users: [userId], count: 1 }
                  ]
                }
              : msg
          ));
        });

        socketInstance.on('commentAdded', ({ messageId, comment }) => {
          setMessages(prev => prev.map(msg =>
            msg.id === messageId
              ? {
                  ...msg,
                  comments: [...(msg.comments || []), comment]
                }
              : msg
          ));
        });

        socketInstance.on('messagePinned', ({ messageId, pinnedBy }) => {
          setMessages(prev => prev.map(msg =>
            msg.id === messageId
              ? { ...msg, isPinned: true }
              : msg
          ));
          setPinnedMessages(prev => {
            const message = messages.find(m => m.id === messageId);
            if (message && !prev.find(p => p.id === messageId)) {
              return [...prev, { ...message, isPinned: true }];
            }
            return prev;
          });
        });

        socketInstance.on('messageUnpinned', ({ messageId }) => {
          setMessages(prev => prev.map(msg =>
            msg.id === messageId
              ? { ...msg, isPinned: false }
              : msg
          ));
          setPinnedMessages(prev => prev.filter(p => p.id !== messageId));
        });

        setSocket(socketInstance);

        return () => {
          if (socketInstance && socketInstance.connected) {
            socketInstance.disconnect();
          }
        };
      } catch (error) {
        console.error('❌ Socket initialization error:', error);
      }
    };

    if (groupId && userId) {
      socketInitializer();
    }

    return () => {
      if (socket && socket.connected) {
        socket.disconnect();
      }
    };
  }, [groupId, userId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle sending message
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const trimmedMessage = messageInput.trim();
    if (!trimmedMessage) return;

    if (!socket || !isConnected) {
      alert('غير متصل بالسيرفر');
      return;
    }

    try {
      socket.emit("sendMessage", {
        groupId,
        content: trimmedMessage,
        token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
        type: 'text',
        replyTo: replyToMsg?.id || null,
      });

      setMessageInput('');
      setReplyToMsg(null);
      if (isTyping) handleTyping(false);
    } catch (error) {
      console.error('❌ Error sending message:', error);
      alert('حدث خطأ أثناء إرسال الرسالة');
    }
  };

  // Handle typing indicator
  const handleTyping = (typing: boolean) => {
    if (!socket || !isConnected) return;
    setIsTyping(typing);
    socket.emit("typing", { groupId, typing });
  };

  // Handle emoji selection
  const handleEmojiSelect = (emojiData: any) => {
    setMessageInput(prev => prev + emojiData.emoji);
    setShowEmoji(false);
  };

  // Handle message edit
  const handleEditMessage = (messageId: string, currentContent: string) => {
    setEditingMessage(messageId);
    setEditContent(currentContent);
    setMessageDropdowns({});
  };

  // Handle save edit
  const handleSaveEdit = () => {
    if (!socket || !editingMessage || !editContent.trim()) return;

    socket.emit('editMessage', {
      messageId: editingMessage,
      groupId,
      newContent: editContent.trim(),
      token: typeof window !== 'undefined' ? localStorage.getItem('token') : null
    });

    setEditingMessage(null);
    setEditContent('');
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingMessage(null);
    setEditContent('');
  };

  // Handle delete message
  const handleDeleteMessage = (messageId: string) => {
    if (!socket || !isConnected) {
      alert('غير متصل بالسيرفر');
      return;
    }

    if (confirm('هل أنت متأكد من حذف هذه الرسالة؟')) {
      socket.emit('deleteMessage', {
        messageId,
        groupId,
        token: typeof window !== 'undefined' ? localStorage.getItem('token') : null
      });
    }
    setMessageDropdowns({});
  };

  // Toggle message dropdown
  const toggleMessageDropdown = (messageId: string) => {
    setMessageDropdowns(prev => ({
      ...prev,
      [messageId]: !prev[messageId]
    }));
  };

  // New handlers for modern features
  const handleUserClick = (user: any) => {
    setSelectedUser(user);
    setShowUserProfile(true);
    setShowSidebar(false); // Close sidebar on mobile
  };

  const handleReaction = (messageId: string, emoji: string) => {
    if (!socket || !isConnected) return;
    
    socket.emit('addReaction', {
      messageId,
      emoji,
      groupId,
      token: typeof window !== 'undefined' ? localStorage.getItem('token') : null
    });
    setShowReactionPicker(null);
  };

  const handleComment = (messageId: string) => {
    if (!commentInput.trim() || !socket || !isConnected) return;
    
    socket.emit('addComment', {
      messageId,
      content: commentInput.trim(),
      groupId,
      token: typeof window !== 'undefined' ? localStorage.getItem('token') : null
    });
    setCommentInput('');
    setShowComments(null);
  };

  const handlePinMessage = (messageId: string) => {
    if (!socket || !isConnected) return;
    
    socket.emit('pinMessage', {
      messageId,
      groupId,
      token: typeof window !== 'undefined' ? localStorage.getItem('token') : null
    });
    setMessageDropdowns({});
  };

  const handlePrivateMessage = (userId: string) => {
    // TODO: Implement private messaging
    console.log('Private message to:', userId);
    setShowUserProfile(false);
  };

  const handleMuteUser = (userId: string) => {
    setMutedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleBlockUser = (userId: string) => {
    setBlockedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleShareMessage = (message: Message) => {
    // TODO: Implement message sharing
    console.log('Share message:', message);
  };

  const handleBookmarkMessage = (messageId: string) => {
    // TODO: Implement message bookmarking
    console.log('Bookmark message:', messageId);
  };

  const handleMessageSearch = (query: string) => {
    setMessageSearchQuery(query);
    // TODO: Implement message search functionality
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !socket) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const isPdf = file.type.endsWith('/pdf');
    
    let type: string = 'file';
    if (isImage) type = 'image';
    else if (isVideo) type = 'video';
    else if (isPdf) type = 'pdf';

    try {
      // Show loading message
      const loadingMessage = `جاري رفع ${isImage ? 'الصورة' : isVideo ? 'الفيديو' : 'الملف'}...`;
      console.log(loadingMessage);

      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch('/api/upload-media', { 
        method: 'POST', 
        body: formData 
      });
      
      const data = await res.json();
      
      if (data.filepath) {
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
        console.log('✅ تم رفع الملف بنجاح');
      } else if (data.error) {
        // Handle specific error messages
        const errorMessage = data.arabicError || data.error;
        
        if (errorMessage.includes('inappropriate') || errorMessage.includes('غير لائقة')) {
          alert('⚠️ هذه الصورة غير لائقة، يرجى اختيار صورة أخرى');
        } else if (errorMessage.includes('حجم الملف')) {
          alert(`❌ ${errorMessage}`);
        } else if (errorMessage.includes('نوع الملف')) {
          alert(`❌ ${errorMessage}`);
        } else {
          alert(`❌ خطأ في رفع الملف: ${errorMessage}`);
        }
        console.error('Upload error:', data.error);
      }
    } catch (error) {
      console.error('Error processing file:', error);
      alert('حدث خطأ أثناء معالجة الملف');
    }
  };

  // Toggle mobile sidebar manually if Bootstrap JS is not available
  const toggleMobileSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  // Close mobile sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showSidebar && offcanvasRef.current && !offcanvasRef.current.contains(event.target as Node)) {
        setShowSidebar(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSidebar]);

  // Handle window resize for mobile emoji picker
  useEffect(() => {
    const handleResize = () => {
      if (showEmoji && window.innerWidth < 768) {
        // Force re-render of emoji picker on mobile
        setShowEmoji(false);
        setTimeout(() => setShowEmoji(true), 100);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [showEmoji]);

  // Close mobile sidebar when screen size changes
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setShowSidebar(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ChatBubble (fixed, simple version)
  const ChatBubble = ({ msg, isOwn }: { msg: any, isOwn: boolean }) => (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
      <div className={`max-w-[70%] px-4 py-2 rounded-2xl shadow ${isOwn ? 'bg-blue-600 text-white rounded-br-md' : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-md'}`}>
        <div className="flex items-center gap-2 mb-1">
          {!isOwn && <span className="font-bold text-xs text-blue-600 dark:text-blue-300">{msg.senderName}</span>}
          {msg.isEdited && <span className="text-xs text-gray-400">(تم التعديل)</span>}
        </div>
        <div className="break-words text-sm" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(msg.content) }} />
        <div className="flex justify-end mt-1">
          <span className="text-xs text-gray-400">{msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : 'الآن'}</span>
        </div>
      </div>
    </div>
  );

  // ProfileDrawer (fixed, simple version)
  const ProfileDrawer = () => selectedUser && (
    <div className="fixed inset-0 z-40 flex justify-end bg-black bg-opacity-40" onClick={() => setShowUserProfile(false)}>
      <div className="w-80 bg-white dark:bg-gray-900 h-full shadow-xl p-6 flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex flex-col items-center gap-2">
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center text-white text-4xl font-bold">
            {selectedUser.avatar ? <img src={selectedUser.avatar} alt={selectedUser.name} className="w-24 h-24 rounded-full object-cover" /> : selectedUser.name.charAt(0).toUpperCase()}
          </div>
          <div className="font-bold text-xl text-gray-800 dark:text-white">{selectedUser.name}</div>
          <div className="text-sm text-gray-500">{selectedUser.role === 'admin' ? 'مدير المجموعة' : 'عضو'}</div>
          <div className="flex gap-2 mt-2">
            <button className="bg-blue-500 text-white px-3 py-1 rounded-lg flex items-center gap-1"><FaEnvelope /> رسالة خاصة</button>
            <button className="bg-red-500 text-white px-3 py-1 rounded-lg flex items-center gap-1"><FaBan /> حظر</button>
          </div>
        </div>
        <div className="mt-6">
          <div className="text-xs text-gray-400">انضم منذ</div>
          <div className="text-sm text-gray-700 dark:text-gray-200">{selectedUser.joinedAt ? new Date(selectedUser.joinedAt).toLocaleDateString('ar-EG') : ''}</div>
        </div>
      </div>
    </div>
  );

  // Sidebar (fixed, simple version)
  const Sidebar = () => (
    <aside className="w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
        <span className="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2"><FaUsers className="text-blue-500" /> أعضاء</span>
        <button className="md:hidden text-gray-500" onClick={() => setShowSidebar(false)}><FaTimes /></button>
      </div>
      <div className="p-2">
        <div className="relative mb-2">
          <input type="text" className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="بحث..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          <FaSearch className="absolute right-3 top-3 text-gray-400" />
        </div>
        <div className="overflow-y-auto h-[calc(100vh-120px)] pr-1">
          {members.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase())).map(member => (
            <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-800 cursor-pointer transition" onClick={() => { setSelectedUser(member); setShowUserProfile(true); }}>
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                  {member.avatar ? <img src={member.avatar} alt={member.name} className="w-10 h-10 rounded-full object-cover" /> : member.name.charAt(0).toUpperCase()}
                </div>
                <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${onlineUsers.has(member.id) ? 'bg-green-500' : 'bg-gray-400'}`}></span>
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-800 dark:text-white flex items-center gap-1">{member.name} {member.role === 'admin' && <FaCrown className="text-yellow-400" title="مدير" />}</div>
                <div className="text-xs text-gray-500">{onlineUsers.has(member.id) ? 'متصل' : 'غير متصل'}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );

  // Main Chat Layout
  return (
    <div className="flex h-[100vh] bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <div className={`fixed md:static z-30 ${showSidebar ? 'block' : 'hidden'} md:block`} style={{height:'100vh'}}>
        <Sidebar />
      </div>
      {/* Overlay for mobile */}
      {showSidebar && <div className="fixed inset-0 bg-black bg-opacity-40 z-20 md:hidden" onClick={() => setShowSidebar(false)}></div>}
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="flex items-center gap-2">
            <button className="md:hidden text-gray-500" onClick={() => setShowSidebar(true)}><FaUsers /></button>
            <span className="font-bold text-lg text-gray-800 dark:text-white">{groupName}</span>
            <span className="ml-2 px-2 py-1 rounded bg-blue-100 text-blue-700 text-xs">{onlineUsers.size} متصل</span>
            <span className="ml-2 px-2 py-1 rounded bg-gray-200 text-gray-700 text-xs">{members.length} عضو</span>
          </div>
        </div>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6" style={{background: 'linear-gradient(to bottom, #f3f4f6, #e0e7ef)'}}>
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400">لا توجد رسائل بعد</div>
          ) : (
            <div className="flex flex-col gap-2">
              {messages.map((msg, idx) => (
                <ChatBubble key={msg.id || idx} msg={msg} isOwn={msg.senderId === userId} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        {/* Input Area */}
        <form className="flex items-center gap-2 px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900" onSubmit={e => { e.preventDefault(); /* handleSendMessage() */ }}>
          <button type="button" className="text-gray-500 hover:text-blue-600"><FaImage /></button>
          <button type="button" className="text-gray-500 hover:text-blue-600"><FaVideo /></button>
          <button type="button" className="text-gray-500 hover:text-blue-600"><FaFileAlt /></button>
          <div className="relative flex-1">
            <input type="text" className="w-full rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="اكتب رسالة..." value={messageInput} onChange={e => setMessageInput(e.target.value)} />
            <button type="button" className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-yellow-500" onClick={() => setShowEmoji(!showEmoji)}><FaRegSmile /></button>
            {showEmoji && (
              <div className="absolute bottom-12 left-0 z-40">
                <EmojiPicker onEmojiClick={e => setMessageInput(prev => prev + e.emoji)} />
              </div>
            )}
          </div>
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-4 py-2 flex items-center gap-1"><FaPaperPlane /> إرسال</button>
        </form>
      </div>
      {/* User Profile Drawer */}
      {showUserProfile && <ProfileDrawer />}
    </div>
  );
};

export default GroupChat;






