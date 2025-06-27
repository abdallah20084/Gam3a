// تحسين تصميم صفحة الدردشة بشكل كامل
import React, { useState, useEffect, useRef } from 'react';
import { FaSearch, FaEllipsisV, FaImage, FaVideo, FaFileAlt, FaMicrophone, FaRegSmile, FaPaperPlane, FaTimes, FaEdit, FaTrash } from 'react-icons/fa';
import data from '@emoji-mart/data';
import { Picker } from 'emoji-mart';
import DOMPurify from 'dompurify';
import io from 'socket.io-client';
import Image from 'next/image';

interface GroupChatProps {
  groupId: string;
  userId: string;
  members: any[];
  initialMessages?: any[];
  groupName?: string; // إضافة اسم المجموعة كخاصية
  isAdmin?: boolean; // إضافة معلومة الأدمن
}

// MembersList component for both sidebar and offcanvas
const MembersList: React.FC<{
  members: any[];
  onlineUsers: Set<string>;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}> = ({ members, onlineUsers, searchQuery, setSearchQuery }) => (
  <>
    <div className="p-3 border-bottom">
      <h5 className="fw-bold mb-3 text-center">الأعضاء</h5>
      <div className="position-relative mb-3">
        <input
          type="text"
          className="form-control bg-light border-0 rounded-pill"
          placeholder="بحث..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <FaSearch className="position-absolute top-50 translate-middle-y end-0 me-3 text-muted" />
      </div>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <small className="text-muted">متصل: {onlineUsers.size}</small>
        <small className="text-muted">الكل: {members.length}</small>
      </div>
    </div>
    <div className="p-2">
      {members
        .filter(member => member.name.includes(searchQuery))
        .map((member) => (
          <div
            key={member.id || member._id}
            className="d-flex align-items-center p-2 rounded-3 mb-2 hover-bg-light"
            dir="rtl"
          >
            <div className="position-relative me-2">
              {member.avatar ? (
                <img
                  src={member.avatar}
                  alt={member.name}
                  className="rounded-circle"
                  width="40"
                  height="40"
                  style={{ objectFit: 'cover' }}
                />
              ) : (
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                  style={{
                    width: 40,
                    height: 40,
                    background: 'linear-gradient(135deg, #3b82f6, #1e40af)'
                  }}
                >
                  {member.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span
                className={`position-absolute bottom-0 start-0 rounded-circle border border-white ${onlineUsers.has(member.id || member._id) ? 'bg-success' : 'bg-secondary'}`}
                style={{ width: 10, height: 10 }}
              ></span>
            </div>
            <div className="ms-2 flex-grow-1">
              <div className="fw-medium">{member.name}</div>
              <small className="text-muted">
                {onlineUsers.has(member.id || member._id) ? 'متصل الآن' : 'غير متصل'}
              </small>
            </div>
          </div>
        ))}
    </div>
  </>
);

const GroupChat: React.FC<GroupChatProps> = ({
  groupId,
  userId,
  members = [],
  initialMessages = [],
  groupName = "المجموعة", // إضافة اسم المجموعة كخاصية
  isAdmin = false // إضافة معلومة الأدمن
}) => {
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
  const [activeTab, setActiveTab] = useState('chat');
  const [showDropdown, setShowDropdown] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [messageDropdowns, setMessageDropdowns] = useState<{[key: string]: boolean}>({});
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Filtered messages based on active tab - fix for undefined messages
  const filteredMessages = (messages || []).filter(msg => {
    if (activeTab === 'chat') return true;
    if (activeTab === 'images') return msg.type === 'image';
    if (activeTab === 'videos') return msg.type === 'video';
    if (activeTab === 'files') return msg.type === 'file' || msg.type === 'pdf';
    return true;
  });

  // Socket connection and event handlers
  useEffect(() => {
    // Socket connection logic
    const socketInitializer = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('No token found for socket connection');
          return;
        }

        // Prevent multiple connections
        if (socket && socket.connected) {
          console.log('🔗 Socket already connected, skipping initialization');
          return;
        }

        console.log('🔌 Initializing socket connection...');

        const socketInstance = io(
          {
            transports: ['websocket'], // Force WebSocket only
            timeout: 45000,
            forceNew: false, // Changed to false to prevent multiple connections
            reconnection: true,
            reconnectionAttempts: 3, // Reduced from 5
            reconnectionDelay: 2000, // Increased from 1000
            reconnectionDelayMax: 10000, // Increased from 5000
            query: { token, groupId }
          }
        );

        // Connection event handlers
        socketInstance.on('connect', () => {
          console.log('🔗 Connected to socket server', {
            id: socketInstance.id,
            isMobile: window.innerWidth <= 768,
            userAgent: navigator.userAgent.substring(0, 50),
            serverUrl: '/api/socket'
          });
          setIsConnected(true);
          
          // Join the group room only after successful connection
          console.log('🤝 Joining group room:', groupId);
          socketInstance.emit('joinGroup', groupId, token);
        });

        socketInstance.on('connect_error', (error) => {
          console.error('🔴 Socket connection error:', error);
          setIsConnected(false);
          
          // Don't show alert immediately, let reconnection handle it
          if (error.message.includes('authentication')) {
            console.error('🔑 Authentication error in socket connection');
            // Handle auth error gracefully
          }
        });

        socketInstance.on('disconnect', (reason) => {
          console.log('🔌 Disconnected from socket server:', reason);
          setIsConnected(false);
          
          // Only attempt reconnection for certain reasons
          if (reason === 'io server disconnect') {
            console.log('🔄 Server disconnected, attempting reconnection...');
            // Let the socket handle reconnection automatically
          } else if (reason === 'io client disconnect') {
            console.log('👤 Client disconnected intentionally');
          }
        });

        // Group join event handlers
        socketInstance.on('joinedGroup', (data) => {
          console.log('✅ Successfully joined group:', data.groupId);
          console.log('📨 Received initial messages:', data.messages?.length || 0);
          
          // Set initial messages from socket
          if (data.messages && data.messages.length > 0) {
            setMessages(data.messages);
          }
        });

        socketInstance.on('errorJoiningGroup', (error) => {
          console.error('❌ Error joining group via socket:', error);
          setIsConnected(false);
          
          // Handle specific errors
          if (error.includes('غير مصرح')) {
            console.log('🔒 User not authorized to join group');
            // This should be handled by the page component
          }
        });

        // Message event handlers
        socketInstance.on('receiveMessage', (message) => {
          console.log('📨 Received new message:', message.id);
          setMessages(prev => {
            const prevMessages = prev || [];
            // Check if message already exists
            const messageExists = prevMessages.some(msg => msg.id === message.id);
            if (messageExists) {
              console.log('⚠️ Message already exists, skipping');
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

        // Error handlers
        socketInstance.on('messageError', (error) => {
          console.error('❌ Message error:', error);
          // Show error in a more user-friendly way
          if (typeof window !== 'undefined') {
            // Use a toast or notification instead of alert
            console.warn('Message error:', error);
          }
        });

        socketInstance.on('authError', (error) => {
          console.error('🔑 Auth error:', error);
          setIsConnected(false);
          
          // Handle auth error gracefully
          if (typeof window !== 'undefined') {
            console.warn('Authentication error:', error);
            // Redirect to login or show login prompt
          }
        });

        // Typing indicators
        socketInstance.on('userTyping', ({ userId, isTyping, groupId: typingGroupId }) => {
          if (typingGroupId === groupId) {
            console.log('⌨️ User typing:', userId, isTyping);
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

        // Message editing and deletion
        socketInstance.on('messageEdited', ({ messageId, newContent, isEdited }) => {
          console.log('✏️ Message edited:', messageId);
          setMessages(prev => prev.map(msg =>
            msg.id === messageId
              ? { ...msg, content: newContent, isEdited: true }
              : msg
          ));
        });

        socketInstance.on('messageDeleted', ({ messageId, deletedBy }) => {
          console.log('🗑️ Message deleted:', messageId, 'by:', deletedBy);
          setMessages(prev => prev.map(msg =>
            msg.id === messageId
              ? { ...msg, content: `تم حذف هذه الرسالة بواسطة ${deletedBy}`, isDeleted: true, type: 'text' }
              : msg
          ));
        });

        // Set socket instance
        setSocket(socketInstance);

        // Cleanup function
        return () => {
          console.log('🧹 Cleaning up socket connection');
          if (socketInstance && socketInstance.connected) {
            socketInstance.disconnect();
          }
        };
      } catch (error) {
        console.error('❌ Socket initialization error:', error);
      }
    };

    // Only initialize if we have a groupId and userId
    if (groupId && userId) {
      socketInitializer();
    }

    // Cleanup on unmount or when groupId/userId changes
    return () => {
      if (socket && socket.connected) {
        console.log('🧹 Disconnecting socket on cleanup');
        socket.disconnect();
      }
    };
  }, [groupId, userId]); // Only depend on groupId and userId

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmoji(false);
      }
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
      // Close message dropdowns when clicking outside
      const target = event.target as Element;
      if (!target.closest('.dropdown')) {
        setMessageDropdowns({});
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle sending message
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const isMobile = window.innerWidth <= 768;
    console.log('🚀 handleSendMessage called', {
      messageInput: messageInput.substring(0, 20),
      socket: !!socket,
      isConnected,
      isMobile,
      userAgent: navigator.userAgent.substring(0, 50)
    });

    // Trim message and check if empty
    const trimmedMessage = messageInput.trim();
    if (!trimmedMessage) {
      console.log('❌ Message is empty');

      // Visual feedback for mobile
      if (isMobile) {
        const textarea = document.querySelector('textarea[name="message"]') as HTMLTextAreaElement;
        if (textarea) {
          textarea.style.borderColor = '#dc3545';
          textarea.focus();
          setTimeout(() => {
            textarea.style.borderColor = '';
          }, 1500);
        }
      }
      return;
    }

    if (!socket) {
      console.log('❌ Socket not connected');
      if (isMobile) {
        alert('غير متصل بالسيرفر - يرجى إعادة تحميل الصفحة');
      } else {
        alert('غير متصل بالسيرفر');
      }
      return;
    }

    if (!isConnected) {
      console.log('❌ Not connected to server');
      if (isMobile) {
        alert('الاتصال غير مستقر - يرجى المحاولة مرة أخرى');
      } else {
        alert('الاتصال غير مستقر');
      }
      return;
    }

    console.log('✅ Sending message:', trimmedMessage.substring(0, 50));

    // Visual feedback - disable button temporarily
    const sendButton = document.querySelector('button[type="submit"]') as HTMLButtonElement;
    if (sendButton) {
      sendButton.disabled = true;
      sendButton.style.opacity = '0.6';
      if (isMobile) {
        sendButton.innerHTML = '<div class="spinner-border spinner-border-sm" role="status"></div>';
      }
    }

    try {
      socket.emit("sendMessage", {
        groupId,
        content: trimmedMessage,
        token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
        type: 'text',
        replyTo: replyToMsg?.id || null,
      });

      console.log('✅ Message emitted successfully');
      setMessageInput('');
      setReplyToMsg(null);
      if (isTyping) handleTyping(false);

      // Re-enable button
      setTimeout(() => {
        if (sendButton) {
          sendButton.disabled = false;
          sendButton.style.opacity = '1';
          if (isMobile) {
            sendButton.innerHTML = '<i class="fas fa-paper-plane"></i>';
          }
        }
      }, 1000);

    } catch (error) {
      console.error('❌ Error sending message:', error);
      alert('حدث خطأ أثناء إرسال الرسالة');

      // Re-enable button on error
      if (sendButton) {
        sendButton.disabled = false;
        sendButton.style.opacity = '1';
        if (isMobile) {
          sendButton.innerHTML = '<i class="fas fa-paper-plane"></i>';
        }
      }
    }
  };

  // Handle typing indicator
  const handleTyping = (typing: boolean) => {
    if (!socket || !isConnected) return;
    setIsTyping(typing);
    socket.emit("typing", { groupId, typing });
  };

  // Handle emoji selection
  const handleEmojiSelect = (emoji: any) => {
    setMessageInput(prev => prev + emoji.native);
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

  // Function to detect and format links in text
  const formatTextWithLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, index) => {
      if (urlRegex.test(part)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-decoration-underline"
            style={{ color: 'inherit' }}
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  // Handle file upload with NSFW check
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !socket) return;

    // Check file type
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const isPdf = file.type.endsWith('/pdf');
    
    let type: string = 'file';
    if (isImage) type = 'image';
    else if (isVideo) type = 'video';
    else if (isPdf) type = 'pdf';

    try {
      // NSFW check for images and videos
      if (isImage) {
        // Load NSFW.js model
        const nsfwjs = await import('nsfwjs');
        const model = await nsfwjs.load();
        
        // Create image element for checking
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        await new Promise((resolve) => {
          img.onload = resolve;
        });

        // Check image
        const predictions = await model.classify(img);
        const unsafe = predictions.find(
          (p) =>
            (p.className === 'Porn' && p.probability > 0.5) ||
            (p.className === 'Sexy' && p.probability > 0.5)
        );

        if (unsafe) {
          alert('⚠️ الصورة تحتوي على محتوى غير لائق، تم رفضها.');
          return;
        }
      } else if (isVideo) {
        // Similar NSFW check for video
        // ...
      }

      // If content is safe, proceed with upload
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload-media', { method: 'POST', body: formData });
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
      }
    } catch (error) {
      console.error('Error processing file:', error);
      alert('حدث خطأ أثناء معالجة الملف');
    }
  };

  return (
    <>
      <style jsx>{`
        @media (max-width: 768px) {
          .nav-tabs .nav-link {
            font-size: 0.875rem;
            padding: 0.5rem 0.75rem;
          }

          .chat-messages {
            padding: 0.75rem !important;
          }

          .message-bubble {
            max-width: 85% !important;
          }

          .offcanvas {
            width: 280px !important;
          }
        }

        .hover-bg-light:hover {
          background-color: #f8f9fa !important;
        }

        .nav-tabs .nav-link.active {
          border-bottom: 2px solid #0d6efd !important;
          background-color: transparent !important;
        }

        .dropdown-item:hover {
          background-color: #f8f9fa !important;
        }
      `}</style>

    <div className="container-fluid p-0">
      <div className="row g-0">
        {/* Mobile Header */}
        <div className="col-12 bg-white border-bottom p-3 d-md-none">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center">
              <button
                className="btn btn-light me-2 d-md-none"
                type="button"
                data-bs-toggle="offcanvas"
                data-bs-target="#membersOffcanvas"
                aria-controls="membersOffcanvas"
              >
                <FaSearch size={16} />
              </button>
              <h6 className="mb-0 fw-bold">{groupName || "المجموعة"}</h6>
            </div>
            <div className="dropdown" ref={dropdownRef}>
              <button
                className="btn btn-light rounded-circle"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <FaEllipsisV size={16} />
              </button>
              {showDropdown && (
                <div
                  className="dropdown-menu dropdown-menu-end show position-absolute shadow-sm border"
                  style={{
                    top: '100%',
                    right: 0,
                    minWidth: '160px',
                    zIndex: 1000,
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    padding: '8px 0'
                  }}
                >
                  <button
                    className="dropdown-item d-flex align-items-center px-3 py-2"
                    style={{
                      border: 'none',
                      background: 'transparent',
                      fontSize: '14px',
                      color: '#333'
                    }}
                    onClick={() => {
                      setShowDropdown(false);
                      console.log('تعديل المجموعة');
                    }}
                  >
                    تعديل المجموعة
                  </button>
                  <button
                    className="dropdown-item d-flex align-items-center px-3 py-2 text-danger"
                    style={{
                      border: 'none',
                      background: 'transparent',
                      fontSize: '14px'
                    }}
                    onClick={() => {
                      setShowDropdown(false);
                      if (confirm('هل أنت متأكد من حذف المجموعة؟')) {
                        console.log('حذف المجموعة');
                      }
                    }}
                  >
                    حذف المجموعة
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Desktop Sidebar - Members */}
        <div className="col-md-3 border-end bg-white d-none d-md-block" style={{ height: '100vh', overflowY: 'auto' }}>
          <MembersList members={members} onlineUsers={onlineUsers} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
        </div>
        
        {/* Mobile Offcanvas for Members */}
        <div className="offcanvas offcanvas-start d-md-none" tabIndex={-1} id="membersOffcanvas" aria-labelledby="membersOffcanvasLabel">
          <div className="offcanvas-header">
            <h5 className="offcanvas-title fw-bold" id="membersOffcanvasLabel">الأعضاء</h5>
            <button type="button" className="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
          </div>
          <div className="offcanvas-body p-0">
            <MembersList members={members} onlineUsers={onlineUsers} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="col-12 col-md-9 d-flex flex-column" style={{ height: 'calc(100vh - 70px)' }}>
          {/* Desktop Chat Header */}
          <div className="p-3 border-bottom bg-white d-none d-md-block">
            <div className="d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold me-2"
                  style={{
                    width: 45,
                    height: 45,
                    background: 'linear-gradient(135deg, #3b82f6, #1e40af)'
                  }}
                >
                  {groupId.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h5 className="fw-bold mb-0">{groupName}</h5>
                  <div className="d-flex align-items-center">
                    <small className="text-muted">
                      <span className="me-1 d-inline-block rounded-circle bg-success" style={{ width: 8, height: 8 }}></span>
                      {onlineUsers.size} متصل • {members.length} عضو
                    </small>
                  </div>
                </div>
              </div>

              <div className="d-flex">
                <button className="btn btn-light rounded-circle me-2">
                  <FaSearch size={16} />
                </button>
                <div className="dropdown" ref={dropdownRef}>
                  <button
                    className="btn btn-light rounded-circle"
                    onClick={() => setShowDropdown(!showDropdown)}
                  >
                    <FaEllipsisV size={16} />
                  </button>
                  {showDropdown && (
                    <div
                      className="dropdown-menu dropdown-menu-end show position-absolute shadow-sm border"
                      style={{
                        top: '100%',
                        right: 0,
                        minWidth: '160px',
                        zIndex: 1000,
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        padding: '8px 0'
                      }}
                    >
                      <button
                        className="dropdown-item d-flex align-items-center px-3 py-2"
                        style={{
                          border: 'none',
                          background: 'transparent',
                          fontSize: '14px',
                          color: '#333'
                        }}
                        onClick={() => {
                          setShowDropdown(false);
                          // إضافة منطق تعديل المجموعة هنا
                          console.log('تعديل المجموعة');
                        }}
                        onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#f8f9fa'}
                        onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = 'transparent'}
                      >
                        <FaEdit className="me-2" size={14} />
                        تعديل المجموعة
                      </button>
                      <button
                        className="dropdown-item d-flex align-items-center px-3 py-2 text-danger"
                        style={{
                          border: 'none',
                          background: 'transparent',
                          fontSize: '14px'
                        }}
                        onClick={() => {
                          setShowDropdown(false);
                          // إضافة منطق حذف المجموعة هنا
                          if (confirm('هل أنت متأكد من حذف المجموعة؟')) {
                            console.log('حذف المجموعة');
                          }
                        }}
                        onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#f8f9fa'}
                        onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = 'transparent'}
                      >
                        <FaTrash className="me-2" size={14} />
                        حذف المجموعة
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Tabs - Responsive */}
          <div className="bg-white border-bottom">
            <ul className="nav nav-tabs border-0 justify-content-center flex-nowrap overflow-auto">
              <li className="nav-item">
                <button
                  className={`nav-link border-0 px-2 px-md-3 ${activeTab === 'chat' ? 'active fw-bold' : 'text-muted'}`}
                  onClick={() => setActiveTab('chat')}
                >
                  <span className="d-none d-sm-inline">الدردشة</span>
                  <span className="d-sm-none">💬</span>
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link border-0 px-2 px-md-3 ${activeTab === 'images' ? 'active fw-bold' : 'text-muted'}`}
                  onClick={() => setActiveTab('images')}
                >
                  <span className="d-none d-sm-inline">الصور</span>
                  <span className="d-sm-none">🖼️</span>
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link border-0 px-2 px-md-3 ${activeTab === 'videos' ? 'active fw-bold' : 'text-muted'}`}
                  onClick={() => setActiveTab('videos')}
                >
                  <span className="d-none d-sm-inline">الفيديوهات</span>
                  <span className="d-sm-none">🎥</span>
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link border-0 px-2 px-md-3 ${activeTab === 'files' ? 'active fw-bold' : 'text-muted'}`}
                  onClick={() => setActiveTab('files')}
                >
                  <span className="d-none d-sm-inline">الملفات</span>
                  <span className="d-sm-none">📁</span>
                </button>
              </li>
            </ul>
          </div>
          
          {/* Messages */}
          <div 
            className="flex-grow-1 p-3 overflow-auto chat-messages" 
            style={{ 
              background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)',
              scrollBehavior: 'smooth',
              direction: 'rtl',
              textAlign: 'right'
            }}
          >
            {filteredMessages && filteredMessages.length > 0 ? (
              <div className="d-flex flex-column gap-3" dir="rtl">
                {filteredMessages.map((msg, index) => (
                  <div key={`${msg.id}-${index}`} className={`d-flex ${msg.senderId === userId ? 'justify-content-start' : 'justify-content-end'}`}>
                    <div className={`d-flex ${msg.senderId === userId ? 'flex-row' : 'flex-row-reverse'}`} style={{ maxWidth: '75%' }}>
                      {/* Avatar (only for received messages) */}
                      {msg.senderId !== userId && (
                        <div className="ms-2">
                          {msg.senderAvatar ? (
                            <img 
                              src={msg.senderAvatar} 
                              alt={msg.senderName} 
                              className="rounded-circle border border-2 border-white" 
                              width="40" 
                              height="40"
                              style={{ objectFit: 'cover' }}
                            />
                          ) : (
                            <div 
                              className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold" 
                              style={{ 
                                width: 40, 
                                height: 40, 
                                background: 'linear-gradient(135deg, #3b82f6, #1e40af)' 
                              }}
                            >
                              {msg.senderName.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Message Content */}
                      <div className="d-flex flex-column">
                        {/* Reply Preview */}
                        {msg.replyTo && (
                          <div 
                            className={`small p-2 rounded bg-light mb-1 border-start border-3 border-primary ${msg.senderId === userId ? 'ms-2' : 'me-2'}`}
                            style={{ borderRadius: '0.5rem' }}
                          >
                            <div className="fw-bold text-primary">
                              {messages.find(m => m.id === msg.replyTo)?.senderName || 'رسالة محذوفة'}
                            </div>
                            <div className="text-truncate">
                              {messages.find(m => m.id === msg.replyTo)?.content || 'محتوى الرسالة غير متاح'}
                            </div>
                          </div>
                        )}
                        
                        <div
                          className={`position-relative p-3 shadow-sm ${
                            msg.senderId === userId
                              ? 'bg-primary text-white rounded-4 rounded-bottom-end-0'
                              : 'bg-white text-dark rounded-4 rounded-bottom-start-0'
                          } ${msg.isDeleted ? 'opacity-75' : ''}`}
                        >
                          {/* Message Options Dropdown */}
                          {!msg.isDeleted && (msg.senderId === userId || isAdmin) && (
                            <div className="position-absolute top-0 end-0 mt-2 me-2">
                              <div className="dropdown">
                                <button
                                  className="btn btn-sm btn-outline-secondary rounded-circle"
                                  style={{
                                    width: '32px',
                                    height: '32px',
                                    padding: '0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    zIndex: 10,
                                    backgroundColor: 'rgba(255,255,255,0.9)',
                                    border: '1px solid #dee2e6'
                                  }}
                                  onClick={() => toggleMessageDropdown(msg.id)}
                                  title="خيارات الرسالة"
                                >
                                  <FaEllipsisV size={12} />
                                </button>
                                {messageDropdowns[msg.id] && (
                                  <div
                                    className="dropdown-menu dropdown-menu-end show position-absolute shadow-sm border"
                                    style={{
                                      top: '100%',
                                      right: 0,
                                      minWidth: '140px',
                                      zIndex: 1000,
                                      backgroundColor: 'white',
                                      borderRadius: '8px',
                                      padding: '4px 0'
                                    }}
                                  >
                                    {/* Edit option - only for message owner and text messages */}
                                    {msg.senderId === userId && msg.type === 'text' && (
                                      <button
                                        className="dropdown-item d-flex align-items-center px-3 py-2"
                                        style={{
                                          border: 'none',
                                          background: 'transparent',
                                          fontSize: '13px',
                                          color: '#333'
                                        }}
                                        onClick={() => handleEditMessage(msg.id, msg.content)}
                                      >
                                        <FaEdit className="me-2" size={12} />
                                        تعديل
                                      </button>
                                    )}

                                    {/* Delete option - for message owner or admin */}
                                    <button
                                      className="dropdown-item d-flex align-items-center px-3 py-2 text-danger"
                                      style={{
                                        border: 'none',
                                        background: 'transparent',
                                        fontSize: '13px'
                                      }}
                                      onClick={() => handleDeleteMessage(msg.id)}
                                    >
                                      <FaTrash className="me-2" size={12} />
                                      حذف
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Sender Name (only for received messages) */}
                          {msg.senderId !== userId && (
                            <div className="small fw-bold mb-1 text-primary">{msg.senderName}</div>
                          )}

                          {/* Content based on type or edit mode */}
                          {editingMessage === msg.id ? (
                            <div className="d-flex flex-column gap-2">
                              <textarea
                                className="form-control"
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                rows={2}
                                style={{ resize: 'none' }}
                              />
                              <div className="d-flex gap-2">
                                <button
                                  className="btn btn-sm btn-success"
                                  onClick={handleSaveEdit}
                                  disabled={!editContent.trim()}
                                >
                                  حفظ
                                </button>
                                <button
                                  className="btn btn-sm btn-secondary"
                                  onClick={handleCancelEdit}
                                >
                                  إلغاء
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {msg.type === 'text' && (
                                <div dir="rtl" style={{ textAlign: 'right' }} className="chat-message-content">
                                  <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(msg.content) }} />
                                  {msg.isEdited && (
                                    <small className={`ms-2 ${msg.senderId === userId ? 'text-light' : 'text-muted'}`}>
                                      (تم التعديل)
                                    </small>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                          {msg.type === 'image' && (
                            <img 
                              src={msg.content} 
                              alt="صورة" 
                              className="img-fluid rounded-3 cursor-pointer" 
                              style={{ maxHeight: 240 }}
                              onClick={() => setPreviewImage(msg.content)}
                            />
                          )}
                          {msg.type === 'video' && (
                            <video 
                              src={msg.content} 
                              controls 
                              className="img-fluid rounded-3 w-100"
                              style={{ maxHeight: 240 }}
                            />
                          )}
                          {msg.type === 'file' && (
                            <div className="d-flex align-items-center bg-light p-2 rounded-3">
                              <FaFileAlt className="text-primary me-2" size={24} />
                              <div>
                                <div className="fw-medium">ملف مرفق</div>
                                <a href={msg.content} target="_blank" rel="noopener noreferrer" className="small text-primary">
                                  تحميل الملف
                                </a>
                              </div>
                            </div>
                          )}
                          
                          {/* Time and Status */}
                          <div className={`d-flex justify-content-end align-items-center small mt-1 ${msg.senderId === userId ? 'text-light' : 'text-muted'}`}>
                            {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : 'الآن'}
                            {msg.senderId === userId && (
                              <span className="ms-1">✓</span>
                            )}
                          </div>
                        </div>
                        
                        {/* Reactions */}
                        {msg.reactions && msg.reactions.length > 0 && (
                          <div className={`d-flex mt-1 gap-1 ${msg.senderId === userId ? 'justify-content-start' : 'justify-content-end'}`}>
                            {msg.reactions.map((reaction, idx) => (
                              <span 
                                key={idx} 
                                className="bg-white small py-1 px-2 rounded-pill shadow-sm cursor-pointer"
                              >
                                {reaction.emoji} {reaction.users.length > 1 && reaction.users.length}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            ) : (
              <div className="d-flex h-100 align-items-center justify-content-center">
                <div className="text-center p-4 bg-white rounded-4 shadow-sm">
                  <h5 className="fw-bold mb-2">لا توجد رسائل بعد</h5>
                  <p className="text-muted mb-3">ابدأ المحادثة مع أعضاء المجموعة!</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Input Area */}
          <div className="p-3 border-top bg-white chat-input-area">
            {/* Reply Preview */}
            {replyToMsg && (
              <div className="d-flex justify-content-between align-items-center bg-light p-2 rounded-3 mb-2">
                <div className="d-flex align-items-center">
                  <div className="border-start border-3 border-primary h-100 me-2"></div>
                  <div>
                    <div className="small fw-bold text-primary">{replyToMsg.senderName}</div>
                    <div className="small text-truncate">{replyToMsg.content}</div>
                  </div>
                </div>
                <button 
                  className="btn btn-sm text-muted" 
                  onClick={() => setReplyToMsg(null)}
                >
                  <FaTimes />
                </button>
              </div>
            )}
            
            <form
              onSubmit={(e) => {
                console.log('📝 Form submitted', {
                  isMobile: window.innerWidth <= 768,
                  messageInput: messageInput.substring(0, 20),
                  isConnected
                });
                handleSendMessage(e);
              }}
              className="d-flex align-items-end gap-2"
            >
              <div className="flex-grow-1 bg-light rounded-4 px-3 py-2">
                {/* Attachment Buttons - Responsive */}
                <div className="d-flex gap-1 gap-md-2 mb-2 flex-wrap">
                  <button
                    type="button"
                    className="btn btn-sm btn-light rounded-circle p-1 p-md-2"
                    onClick={() => {
                      const element = document.getElementById('image-upload');
                      if (element) element.click();
                    }}
                    title="إضافة صورة"
                  >
                    <FaImage size={14} />
                  </button>
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />

                  <button
                    type="button"
                    className="btn btn-sm btn-light rounded-circle p-1 p-md-2"
                    onClick={() => {
                      const element = document.getElementById('video-upload');
                      if (element) element.click();
                    }}
                    title="إضافة فيديو"
                  >
                    <FaVideo size={14} />
                  </button>
                  <input
                    id="video-upload"
                    type="file"
                    accept="video/*"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />

                  <button
                    type="button"
                    className="btn btn-sm btn-light rounded-circle p-1 p-md-2"
                    onClick={() => {
                      const element = document.getElementById('file-upload');
                      if (element) element.click();
                    }}
                    title="إضافة ملف"
                  >
                    <FaFileAlt size={14} />
                  </button>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />

                  <button
                    type="button"
                    className="btn btn-sm btn-light rounded-circle p-1 p-md-2 d-none d-md-inline-block"
                    title="تسجيل صوتي"
                  >
                    <FaMicrophone size={14} />
                  </button>

                  <button
                    type="button"
                    className="btn btn-sm btn-light rounded-circle p-1 p-md-2"
                    onClick={() => setShowEmoji(!showEmoji)}
                    title="إضافة إيموجي"
                  >
                    <FaRegSmile size={14} />
                  </button>
                </div>
                
                {/* Text Input */}
                <textarea
                  className="form-control border-0 bg-transparent p-0"
                  placeholder="اكتب رسالتك..."
                  value={messageInput}
                  onChange={e => {
                    setMessageInput(e.target.value);
                    if (!isTyping) handleTyping(true);
                    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                    typingTimeoutRef.current = setTimeout(() => handleTyping(false), 2000);
                  }}
                  onKeyDown={e => {
                    console.log('⌨️ Key pressed:', e.key, {
                      isMobile: window.innerWidth <= 768,
                      keyCode: e.keyCode,
                      which: e.which
                    });

                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      console.log('⌨️ Enter key pressed - sending message');
                      handleSendMessage(e);
                    }
                  }}
                  onKeyUp={e => {
                    // Additional handler for mobile keyboards
                    if ((e.key === 'Enter' || e.keyCode === 13) && !e.shiftKey && window.innerWidth <= 768) {
                      console.log('📱 Mobile Enter detected');
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                  rows={1}
                  style={{ resize: 'none', minHeight: '40px', direction: 'rtl', textAlign: 'right' }}
                  inputMode="text"
                  enterKeyHint="send"
                  name="message"
                  dir="rtl"
                />
              </div>

              {/* Send Button - Mobile Optimized */}
              <button
                type="button"
                className="btn btn-primary d-flex align-items-center justify-content-center"
                disabled={!isConnected || !messageInput.trim()}
                title="إرسال الرسالة"
                onClick={(e) => {
                  console.log('📱 Send button clicked', {
                    isMobile: window.innerWidth <= 768,
                    disabled: !isConnected || !messageInput.trim(),
                    messageLength: messageInput.length,
                    isConnected
                  });

                  // Always prevent default and handle manually for better mobile support
                  e.preventDefault();
                  console.log('📱 Manual send triggered');
                  handleSendMessage(e);
                }}
                style={{
                  minWidth: window.innerWidth <= 768 ? '50px' : '44px',
                  minHeight: window.innerWidth <= 768 ? '50px' : '44px',
                  borderRadius: window.innerWidth <= 768 ? '12px' : '50%',
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent'
                }}
              >
                <FaPaperPlane size={window.innerWidth <= 768 ? 18 : 16} />
              </button>
            </form>
            
            {/* Emoji Picker - Temporarily disabled */}
            {false && showEmoji && (
              <div className="position-absolute bottom-100 end-0 mb-2 shadow-lg rounded-3 overflow-hidden" ref={emojiPickerRef}>
                <div className="p-3 bg-white rounded-3 shadow">
                  <div className="text-center">Emoji Picker</div>
                </div>
              </div>
            )}
            
            {/* Typing Indicator */}
            {typingUsers.size > 0 && (
              <div className="small text-muted mt-1 px-2">
                {Array.from(typingUsers).map(id => 
                  members.find(m => m.id === id)?.name || 'شخص ما'
                ).join(', ')} {typingUsers.size === 1 ? 'يكتب الآن...' : 'يكتبون الآن...'}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Image Preview Modal */}
      {previewImage && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-dark bg-opacity-75"
          style={{ zIndex: 1050 }}
          onClick={() => setPreviewImage(null)}
        >
          <div className="position-relative" style={{ maxWidth: '90%', maxHeight: '90vh' }}>
            <img 
              src={previewImage} 
              alt="معاينة الصورة" 
              className="img-fluid rounded-3"
              style={{ maxHeight: '90vh' }}
            />
            <button 
              className="position-absolute top-0 end-0 btn btn-sm btn-light rounded-circle m-2"
              onClick={() => setPreviewImage(null)}
            >
              <FaTimes />
            </button>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default GroupChat;






