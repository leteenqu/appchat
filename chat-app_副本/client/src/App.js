import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, Search, Send, Smile, X, User, Lock, Mail, Eye, EyeOff, LogOut,
  Paperclip, Mic, MicOff, File, Download, Phone, Video, MoreVertical,
  Check, CheckCheck, Users, Plus, Settings, Shield, Bell,
  Star, Forward, Reply, Copy, Trash2, UserPlus, Volume2,
  VideoOff, PhoneOff, Monitor, BellOff, ArrowLeft, Menu,
  Home, MessageSquare, UserCircle, Smartphone
} from 'lucide-react';
import io from 'socket.io-client';

const ChatApp = () => {
  // 检测是否为移动设备
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [mobileView, setMobileView] = useState('chats'); // 'chats' | 'chat' | 'profile// 原有状态管理
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [activeTab, setActiveTab] = useState('chats');
  const [selectedChat, setSelectedChat] = useState(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState({
    'ai-assistant': [
      { id: 1, text: '你好！我是AI助手，有什么可以帮助你的吗？', sender: 'ai', time: '14:30', status: 'read' },
      { id: 2, text: '我可以帮你解答问题、提供建议、协助写作、编程指导等。随时告诉我你需要什么帮助！', sender: 'ai', time: '14:30', status: 'read' },
    ],
    1: [
      { id: 1, text: '在吗？😊', sender: 'other', senderName: '张三', time: '14:30', status: 'read' },
      { id: 2, text: '在的，有什么事吗？', sender: 'me', time: '14:32', status: 'read' },
      { id: 3, type: 'image', url: '/api/placeholder/300/200', sender: 'other', senderName: '张三', time: '14:33', status: 'read' },
      { id: 4, text: '晚上一起吃饭吧 🍜', sender: 'other', senderName: '张三', time: '14:33', status: 'read' },
    ],
    'group-1': [
      { id: 1, text: '大家好！👋', sender: 'other', senderName: '李四', time: '09:00', status: 'read' },
      { id: 2, text: '早上好！今天的会议几点？', sender: 'other', senderName: '王五', time: '09:05', status: 'read' },
      { id: 3, text: '10点在会议室A', sender: 'me', time: '09:06', status: 'read' },
      { id: 4, text: '收到，谢谢！', sender: 'other', senderName: '王五', time: '09:07', status: 'read' },
    ],
  });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showMessageMenu, setShowMessageMenu] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupForm, setGroupForm] = useState({ name: '', members: [] });
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [callStatus, setCallStatus] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [friendRequests, setFriendRequests] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [isAITyping, setIsAITyping] = useState(false);
  const [aiConversationContext, setAiConversationContext] = useState([]);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const recordingInterval = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const socketRef = useRef(null);
  const selectedChatRef = useRef(selectedChat);
  const [inAppNotifications, setInAppNotifications] = useState([]);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [chatNotificationSettings, setChatNotificationSettings] = useState({});
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [notificationHistory, setNotificationHistory] = useState([]);
  const audioContextRef = useRef(null);
  

    // 响应式检测
  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkDevice();
    window.addEventListener('resize', checkDevice);
    
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

   useEffect(() => {
       if (isMobile && mobileView === 'chat' && selectedChat) {
        // 切换到聊天视图时滚动到底部
       setTimeout(() => {
          scrollToBottom();
        }, 100);
       }
      }, [mobileView, isMobile, selectedChat]);
  // 初始化音频上下文（移动端需要用户交互）
  const initAudioContext = () => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume();
        }
        console.log('音频上下文初始化成功');
      } catch (error) {
        console.error('音频上下文初始化失败:', error);
      }
    }
  };

  const notificationQueue = useRef([]);
  const isProcessingQueue = useRef(false);
  const [socketConnected, setSocketConnected] = useState(false);
  
  // 表情符号列表
  const emojis = [
    '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😌',
    '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑',
    '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄',
    '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮',
    '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟',
    '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥',
    '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡',
    '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👏', '🙌', '👐', '🤲',
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕',
    '🎉', '🎊', '🎈', '🎁', '🎂', '🍰', '🍕', '🍔', '🍟', '🌭', '🍿', '🍜'
  ];

  // 联系人和群组列表
  const [chats, setChats] = useState([
    { 
      id: 'ai-assistant', 
      type: 'ai',
      name: 'AI助手', 
      avatar: '🤖', 
      lastMessage: '你好！我是AI助手，有什么可以帮助你的吗？', 
      time: '现在', 
      unread: 0, 
      online: true,
      pinned: true,
      isAI: true
    }
  ]);

  // 通知设置状态
  const [notificationSettings, setNotificationSettings] = useState(() => {
    // 从 localStorage 加载设置
    const saved = localStorage.getItem('notificationSettings');
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      enabled: true,
      sound: true,
      desktop: true,
      vibration: true,
      showPreview: true,
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00'
      }
    };
  });

  // 通知统计
  const [notificationStats, setNotificationStats] = useState({
    totalUnread: 0,
    chatUnread: {},
    lastNotificationTime: null
  });

  // 更新 selectedChatRef
  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (socketRef.current && socketRef.current.connected) {
        console.log('组件卸载：断开 Socket 连接');
        socketRef.current.disconnect();
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  // 移动端返回列表
  const handleBackToList = () => {
    console.log('返回聊天列表');
    if (isMobile) {
      setMobileView('chats');
      setSelectedChat(null);
    }
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // 在消息更新时自动滚动
  useEffect(() => {
    setTimeout(() => {
      scrollToBottom();
    }, 100);
  }, [messages, selectedChat]);

  // 更新聊天列表
  useEffect(() => {
    if (conversations.length > 0) {
      const newChats = conversations.map(conv => ({
        id: conv.user._id,
        userId: conv.user._id,
        type: 'private',
        name: conv.user.username,
        avatar: conv.user.username[0].toUpperCase(),
        lastMessage: conv.lastMessage ? conv.lastMessage.content : '开始聊天吧',
        time: conv.lastActivity ? new Date(conv.lastActivity).toLocaleTimeString('zh-CN', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }) : '现在',
        unread: conv.unreadCount || 0,
        online: conv.user.status === 'online',
        lastSeen: conv.user.lastSeen,
        pinned: false
      }));
      
      setChats(prev => {
        const aiChat = prev.find(c => c.id === 'ai-assistant');
        return aiChat ? [aiChat, ...newChats] : newChats;
      });
    }
  }, [conversations]);

  // 请求通知权限
  useEffect(() => {
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          console.log('通知权限:', permission);
          if (permission === 'granted') {
            setNotificationSettings(prev => ({
              ...prev,
              desktop: true
            }));
          }
        });
      }
    }
  }, []);

    // 移动端选择聊天时的处理
   // 移动端选择聊天时的处理 - 修复：确保加载消息
 const handleSelectChat = (chatId) => {
  console.log('选择聊天:', chatId, '是否移动端:', isMobile);
  setSelectedChat(chatId);
  
  // 确保加载消息
  loadMessages(chatId);
  
  if (isMobile) {
    setMobileView('chat');
  }
};

  // 播放提示音
  const playNotificationSound = () => {
    if (!notificationSettings.enabled || !notificationSettings.sound) return;
    
    try {
      // 使用持久化的音频上下文
      let audioContext = audioContextRef.current;
      
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioContextRef.current = audioContext;
      }
      
      // 如果音频上下文被暂停，尝试恢复
      if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
          console.log('音频上下文已恢复');
        });
      }
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // 创建两个音符的提示音
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
      
      // 移动端振动
      if (isMobile && 'vibrate' in navigator && notificationSettings.vibration) {
        navigator.vibrate([100, 50, 100]);
      }
      
      console.log('提示音已播放');
    } catch (error) {
      console.error('播放提示音失败:', error);
      
      // 备用方案：使用 Audio API
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZURE');
        audio.volume = 0.5;
        audio.play().catch(e => console.log('音频播放失败:', e));
      } catch (e) {
        console.log('备用音频播放失败:', e);
      }
    }
  };

  const showInAppNotification = (title, body, type = 'info', onClick = null) => {
    const id = Date.now();
    const notification = { 
      id, 
      title, 
      body, 
      type,
      onClick,
      timestamp: new Date()
    };
    
    setInAppNotifications(prev => [...prev, notification]);
    
    // 移动端振动
    if (isMobile && 'vibrate' in navigator && notificationSettings.vibration) {
      navigator.vibrate(200);
    }
    
    // 自动隐藏通知
    setTimeout(() => {
      setInAppNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000); // 延长到4秒
    
    // 添加到通知历史
    setNotificationHistory(prev => [{
      ...notification,
      read: false
    }, ...prev].slice(0, 50)); // 保留最近50条
  };

  const showNotification = (title, body, icon = null, onClick = null) => {
    if (!notificationSettings.enabled) return;
    
    // 始终显示应用内通知（移动端友好）
    showInAppNotification(title, body, 'message', onClick);
    
    // 检查是否在后台或最小化
    const isInBackground = document.hidden || !document.hasFocus();
    
    // 移动端或前台时只显示应用内通知和播放声音
    if (isMobile || !isInBackground) {
      playNotificationSound();
      return;
    }
    
    // 桌面端且在后台时尝试显示系统通知
    if (!notificationSettings.desktop) {
      playNotificationSound();
      return;
    }
    
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        try {
          const notification = new Notification(title, {
            body: body,
            icon: icon || '/favicon.ico',
            badge: '/favicon.ico',
            tag: 'wechat-message',
            requireInteraction: false,
            silent: false,
            vibrate: [200, 100, 200]
          });
          
          notification.onclick = function(event) {
            event.preventDefault();
            window.focus();
            if (onClick) onClick();
            notification.close();
          };
          
          setTimeout(() => notification.close(), 5000);
        } catch (error) {
          console.error('创建通知失败:', error);
        }
      } else if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            showNotification(title, body, icon, onClick);
          }
        });
      }
    }
    
    playNotificationSound();
  };

  // 更新页面标题显示未读数
  const updatePageTitle = () => {
    const totalUnread = chats.reduce((sum, chat) => sum + (chat.unread || 0), 0);
    setUnreadTotal(totalUnread);
    document.title = totalUnread > 0 ? `(${totalUnread}) 聊天应用` : '聊天应用';
  };

  // 监听聊天列表变化，更新未读数
  useEffect(() => {
    updatePageTitle();
  }, [chats]);

  // 选择聊天时标记已读
  useEffect(() => {
    if (selectedChat && selectedChat !== 'ai-assistant') {
      setChats(prev => prev.map(chat => {
        if (chat.id === selectedChat || chat.userId === selectedChat) {
          return { ...chat, unread: 0 };
        }
        return chat;
      }));
      
      const chat = chats.find(c => c.id === selectedChat);
      if (chat && chat.userId) {
        loadMessages(chat.userId);
      }
    }
  }, [selectedChat]);

  // 所有用户列表
  const allUsers = [
    { id: 1, name: '张三', avatar: '张' },
    { id: 2, name: '李四', avatar: '李' },
    { id: 3, name: '王五', avatar: '王' },
    { id: 4, name: '赵六', avatar: '赵' },
    { id: 5, name: '产品经理', avatar: '产' },
    { id: 6, name: '设计师', avatar: '设' },
  ];

  // 初始化 Socket.io 连接
  useEffect(() => {
    if (isLoggedIn && currentUser) {
      // 如果已经有连接，不重复创建
      if (socketRef.current && socketRef.current.connected) {
        console.log('Socket 已连接，跳过重新创建');
        return;
      }
      
      console.log('创建新的 Socket 连接...');
      const socket = io('http://localhost:3001', {
        transports: ['websocket', 'polling'], // 添加 polling 作为备选
        auth: {
          token: localStorage.getItem('token')
        },
        reconnection: true,
        reconnectionAttempts: 10, // 增加重连尝试次数
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000, // 最大重连延迟
        timeout: 20000, // 连接超时时间
      });
      
      socketRef.current = socket;
      
      socket.on('connect', () => {
        console.log('Socket 连接成功');
        setSocketConnected(true);
        socket.emit('auth', localStorage.getItem('token'));
      });
      
      socket.on('disconnect', (reason) => {
        console.log('Socket 断开连接，原因:', reason);
        setSocketConnected(false);
      });
      
      socket.on('reconnect', (attemptNumber) => {
        console.log('Socket 重连成功，尝试次数:', attemptNumber);
        setSocketConnected(true);
        socket.emit('auth', localStorage.getItem('token'));
      });
      
      socket.on('error', (error) => {
        console.error('Socket 错误:', error);
      });
      
      socket.on('connect_error', (error) => {
        console.error('Socket 连接错误:', error);
      });
      
      socket.on('message:receive', (messageData) => {
        console.log('收到新消息:', messageData);
        
        const senderId = messageData.senderId || messageData.sender?._id;
        const senderName = messageData.sender?.username || '好友';
        
        // 更新消息列表
        setMessages(prev => {
          return {
            ...prev,
            [senderId]: [...(prev[senderId] || []), {
              id: messageData._id || Date.now(),
              text: messageData.content,
              type: messageData.type || 'text',
              sender: 'other',
              senderName: messageData.sender?.username,
              time: new Date(messageData.timestamp).toLocaleTimeString('zh-CN', { 
                hour: '2-digit', 
                minute: '2-digit' 
              }),
              status: 'received'
            }]
          };
        });
        
        // 更新聊天列表
        setChats(prev => prev.map(chat => {
          if (chat.id === senderId || chat.userId === senderId) {
            const isCurrentChat = selectedChatRef.current === chat.id || selectedChatRef.current === senderId;
            return {
              ...chat,
              lastMessage: messageData.content,
              time: new Date(messageData.timestamp).toLocaleTimeString('zh-CN', { 
                hour: '2-digit', 
                minute: '2-digit' 
              }),
              unread: isCurrentChat ? 0 : (chat.unread || 0) + 1
            };
          }
          return chat;
        }));
        
        updatePageTitle();
        
        // 检查是否需要显示通知
        const isCurrentChat = selectedChatRef.current === senderId || selectedChatRef.current === messageData.senderId;
        const isAppFocused = !document.hidden && document.hasFocus();
        
        // 修复：检查是否是移动端且当前在聊天视图
        const isMobileChatView = isMobile && mobileView === 'chat';

        // 如果不是当前聊天，或者应用在后台，则显示通知
        if (!isCurrentChat || !isAppFocused) {
          console.log('触发消息通知:', {
            isCurrentChat,
            isAppFocused,
            isMobile,
            currentChat: selectedChatRef.current,
            senderId
          });
          
          showNotification(
            senderName,
            messageData.content,
            messageData.sender?.avatar,
            () => {
              handleSelectChat(senderId);
              // 移动端切换到聊天视图
              if (isMobile) {
                setMobileView('chat');
              }
            }
          );
        } else {
          // 如果在当前聊天但应用在前台，只播放提示音
          if (notificationSettings.sound) {
            playNotificationSound();
          }
          // 修复：确保移动端滚动到底部
          setTimeout(() => {
            scrollToBottom();
          }, 100);
        }
      });

      
      socket.on('friend:request', (data) => {
        console.log('收到好友请求:', data);
        loadFriendRequests();
      });
      
      socket.on('friend:accepted', (data) => {
        console.log('好友请求被接受:', data);
        loadConversations();
      });
      
      loadConversations();
      loadFriendRequests();
      
      const interval = setInterval(() => {
        loadFriendRequests();
      }, 30000);
      
      return () => {
        clearInterval(interval);
        if (socket && socket.connected) {
          console.log('清理：断开 Socket 连接');
          socket.disconnect();
        }
      };
    }
  }, [isLoggedIn, currentUser]); // 移除 selectedChat 依赖，避免切换聊天时重建连接

  // API 调用函数
  const loadConversations = async () => {
    try {
      const response = await fetch('/api/friends/conversations', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      }
    } catch (error) {
      console.error('加载对话失败:', error);
    }
  };

  const loadFriendRequests = async () => {
    try {
      const response = await fetch('/api/friends/requests', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setFriendRequests(data);
      }
    } catch (error) {
      console.error('加载好友请求失败:', error);
    }
  };

  const searchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    try {
      const response = await fetch(`/api/friends/search?query=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
      }
    } catch (error) {
      console.error('搜索失败:', error);
    }
  };

  const sendFriendRequest = async (targetUserId) => {
    try {
      const response = await fetch('/api/friends/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          targetUserId,
          message: '我想加你为好友'
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert('好友请求已发送');
        setSearchResults([]);
        setSearchQuery('');
      } else {
        alert(data.error || '发送失败');
      }
    } catch (error) {
      console.error('发送好友请求失败:', error);
      alert('发送失败');
    }
  };

  const handleFriendRequest = async (requestId, action) => {
    try {
      const response = await fetch(`/api/friends/request/${requestId}/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert(data.message);
        loadFriendRequests();
        loadConversations();
      } else {
        alert(data.error || '操作失败');
      }
    } catch (error) {
      console.error('处理好友请求失败:', error);
      alert('操作失败');
    }
  };

  const loadMessages = async (userId) => {
    try {
      // 如果是AI助手，不需要API请求
     if (userId === 'ai-assistant') {
      setTimeout(() => {
        scrollToBottom();
      }, 100);
      return;
     }
    
      const response = await fetch(`/api/friends/messages/${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMessages(prev => ({
          ...prev,
          [userId]: data.map(msg => ({
            id: msg._id,
            text: msg.content,
            type: msg.type,
            sender: msg.senderId === currentUser.id ? 'me' : 'other',
            time: new Date(msg.timestamp).toLocaleTimeString('zh-CN', { 
              hour: '2-digit', 
              minute: '2-digit' 
            }),
            status: msg.status
          }))
        }));
        setTimeout(() => {
          scrollToBottom();
        }, 100);
      }
    } catch (error) {
      console.error('加载消息失败:', error);
    }
  };


  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollToBottom(!isNearBottom);
    }
  };

  // 登录处理
  const handleLogin = async () => {
    // 移动端初始化音频上下文
    if (isMobile) {
      initAudioContext();
    }
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: loginForm.email,
          password: loginForm.password
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        
        setCurrentUser(data.user);
        setIsLoggedIn(true);
      } else {
        alert(data.error || '登录失败');
      }
    } catch (error) {
      console.error('登录错误:', error);
      alert('登录失败，请检查网络连接');
    }
  };

  // 注册处理
  const handleRegister = async () => {
    if (!registerForm.username || !registerForm.email || !registerForm.password) {
      alert('请填写所有字段');
      return;
    }
    
    if (registerForm.password !== registerForm.confirmPassword) {
      alert('两次输入的密码不一致！');
      return;
    }
    
    if (registerForm.password.length < 6) {
      alert('密码长度至少6位！');
      return;
    }
    
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: registerForm.username,
          email: registerForm.email,
          password: registerForm.password
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert('注册成功！请登录');
        setIsRegistering(false);
        setRegisterForm({ username: '', email: '', password: '', confirmPassword: '' });
        setLoginForm({ email: registerForm.email, password: '' });
      } else {
        alert(data.error || '注册失败，请重试');
      }
    } catch (error) {
      console.error('注册请求失败:', error);
      alert('注册失败：' + error.message);
    }
  };

  // 退出登录
  const handleLogout = () => {
    // 断开 Socket 连接
    if (socketRef.current && socketRef.current.connected) {
      console.log('退出登录：断开 Socket 连接');
      socketRef.current.disconnect();
    }
    
    // 关闭音频上下文
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    setIsLoggedIn(false);
    setCurrentUser(null);
    setSocketConnected(false);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
  };

  // 发送消息到AI助手
  const sendToAI = async (userMessage) => {
    setIsAITyping(true);
    
    const newContext = [...aiConversationContext, { role: 'user', content: userMessage }];
    setAiConversationContext(newContext);
    
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({
          messages: newContext,
          model: 'deepseek-v1',
          temperature: 0.7,
          max_tokens: 1000
        })
      });
      
      if (!response.ok) {
        throw new Error('AI服务暂时不可用');
      }
      
      const data = await response.json();
      const aiReply = data.message || data.choices?.[0]?.message?.content || '抱歉，我暂时无法回复。';
      
      const aiMessage = {
        id: Date.now(),
        text: aiReply,
        sender: 'ai',
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        status: 'read'
      };
      
      setMessages(prev => ({
        ...prev,
        'ai-assistant': [...(prev['ai-assistant'] || []), aiMessage]
      }));
      
      setAiConversationContext([...newContext, { role: 'assistant', content: aiReply }]);
      
      setChats(prev => prev.map(chat => 
        chat.id === 'ai-assistant' 
          ? { ...chat, lastMessage: aiReply, time: aiMessage.time }
          : chat
      ));
      
    } catch (error) {
      console.error('AI请求失败:', error);
      
      const errorMessage = {
        id: Date.now(),
        text: '抱歉，AI服务暂时出现问题。请稍后再试。',
        sender: 'ai',
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        status: 'read'
      };
      
      setMessages(prev => ({
        ...prev,
        'ai-assistant': [...(prev['ai-assistant'] || []), errorMessage]
      }));
    } finally {
      setIsAITyping(false);
    }
  };

  // 发送消息到服务器
  const sendMessageToServer = async (receiverId, messageText) => {
    try {
      const response = await fetch('/api/friends/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          receiverId,
          content: messageText,
          type: 'text'
        })
      });
      
      if (!response.ok) {
        throw new Error('发送失败');
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      throw error;
    }
  };

  // 发送消息
  const handleSendMessage = async () => {
    if (message.trim() && selectedChat) {
      const currentChat = chats.find(c => c.id === selectedChat);
      
      if (currentChat && currentChat.userId) {
        try {
          await sendMessageToServer(currentChat.userId, message);
        } catch (error) {
          alert('消息发送失败');
          return;
        }
      }
      
      const newMessage = {
        id: Date.now(),
        text: message,
        sender: 'me',
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        status: 'sent',
        replyTo: replyingTo
      };
      
      setMessages(prev => ({
        ...prev,
        [selectedChat]: [...(prev[selectedChat] || []), newMessage]
      }));
      
      setChats(prev => prev.map(chat => 
        chat.id === selectedChat 
          ? { ...chat, lastMessage: message, time: newMessage.time }
          : chat
      ));
      
      const messageText = message;
      setMessage('');
      setShowEmojiPicker(false);
      setReplyingTo(null);

      setTimeout(() => {
        scrollToBottom();
      }, 100);
      
      if (selectedChat === 'ai-assistant') {
        await sendToAI(messageText);
      }
    }
  };

  // 创建群组
  const handleCreateGroup = () => {
    if (groupForm.name.trim() && groupForm.members.length > 0) {
      const newGroup = {
        id: `group-${Date.now()}`,
        type: 'group',
        name: groupForm.name,
        avatar: groupForm.name[0],
        lastMessage: '群组已创建',
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        unread: 0,
        members: groupForm.members.length + 1,
        pinned: false
      };
      
      setChats(prev => [newGroup, ...prev]);
      setMessages(prev => ({
        ...prev,
        [newGroup.id]: [{
          id: 1,
          text: `${currentUser.username} 创建了群组`,
          sender: 'system',
          time: newGroup.time
        }]
      }));
      
      setShowGroupModal(false);
      setGroupForm({ name: '', members: [] });
    }
  };

  // 开始视频通话
  const startVideoCall = async () => {
    setShowVideoCall(true);
    setCallStatus('正在连接...');
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      setCallStatus('正在呼叫...');
      
      setTimeout(() => {
        setCallStatus('通话中');
      }, 2000);
    } catch (error) {
      console.error('获取摄像头失败:', error);
      setCallStatus('无法访问摄像头');
    }
  };

  // 结束通话
  const endCall = () => {
    if (localVideoRef.current && localVideoRef.current.srcObject) {
      localVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    setShowVideoCall(false);
    setCallStatus('');
    setIsMuted(false);
    setIsVideoOff(false);
  };

  // 消息操作
  const handleMessageAction = (action, msg) => {
    switch (action) {
      case 'reply':
        setReplyingTo(msg);
        setShowMessageMenu(null);
        break;
      case 'forward':
        alert('转发功能开发中...');
        break;
      case 'copy':
        navigator.clipboard.writeText(msg.text || '');
        alert('已复制到剪贴板');
        break;
      case 'delete':
        setMessages(prev => ({
          ...prev,
          [selectedChat]: prev[selectedChat].filter(m => m.id !== msg.id)
        }));
        break;
      case 'star':
        alert('已收藏消息');
        break;
    }
    setShowMessageMenu(null);
  };

  // 保存通知设置
  const saveNotificationSettings = (newSettings) => {
    setNotificationSettings(newSettings);
    localStorage.setItem('notificationSettings', JSON.stringify(newSettings));
  };

  // 切换聊天通知
  const toggleChatNotification = (chatId) => {
    const newSettings = {
      ...chatNotificationSettings,
      [chatId]: !chatNotificationSettings[chatId]
    };
    setChatNotificationSettings(newSettings);
    localStorage.setItem('chatNotificationSettings', JSON.stringify(newSettings));
  };

  // 置顶聊天
  const togglePinChat = (chatId) => {
    setChats(prev => prev.map(chat => 
      chat.id === chatId ? { ...chat, pinned: !chat.pinned } : chat
    ).sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0;
    }));
  };

  // 搜索消息
  const filteredChats = chats.filter(chat => 
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 移动端底部导航
  const MobileBottomNav = () => (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden">
      <div className="flex justify-around items-center py-2">
        <button 
          onClick={() => {
            setMobileView('chats');
            setSelectedChat(null);
          }}
          className={`flex flex-col items-center p-2 relative ${mobileView === 'chats' ? 'text-green-600' : 'text-gray-600'}`}
        >
          <MessageSquare className="w-6 h-6" />
          <span className="text-xs mt-1">聊天</span>
          {unreadTotal > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
              {unreadTotal > 99 ? '99+' : unreadTotal}
            </span>
          )}
        </button>
        
        <button 
          onClick={() => {
            setMobileView('contacts');
            setActiveTab('contacts');
            setSelectedChat(null);
          }}
          className={`flex flex-col items-center p-2 ${mobileView === 'contacts' && activeTab === 'contacts' ? 'text-green-600' : 'text-gray-600'}`}
        >
          <Users className="w-6 h-6" />
          <span className="text-xs mt-1">通讯录</span>
        </button>
        
        <button 
          onClick={() => {
            setMobileView('groups');
            setActiveTab('groups');
            setSelectedChat(null);
          }}
          className={`flex flex-col items-center p-2 ${mobileView === 'groups' && activeTab === 'groups' ? 'text-green-600' : 'text-gray-600'}`}
        >
          <Users className="w-6 h-6" />
          <span className="text-xs mt-1">群组</span>
        </button>
        
        <button 
          onClick={() => setMobileView('profile')}
          className={`flex flex-col items-center p-2 relative ${mobileView === 'profile' ? 'text-green-600' : 'text-gray-600'}`}
        >
          <UserCircle className="w-6 h-6" />
          <span className="text-xs mt-1">我的</span>
          {(friendRequests.length > 0 || notificationHistory.filter(n => !n.read).length > 0) && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
              {friendRequests.length + notificationHistory.filter(n => !n.read).length}
            </span>
          )}
        </button>
      </div>
    </div>
  );

  // 移动端个人中心页面
  const MobileProfile = () => (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="bg-green-500 text-white p-6">
        <div className="flex items-center">
          <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center text-green-500 text-2xl font-bold">
            {currentUser?.username?.[0] || 'U'}
          </div>
          <div className="ml-4">
            <h2 className="text-xl font-bold">{currentUser?.username || '用户'}</h2>
            <p className="text-green-100">{currentUser?.email}</p>
            <div className="flex items-center mt-1">
              <div className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-green-300' : 'bg-red-300'} mr-2`} />
              <span className="text-sm text-green-100">{socketConnected ? '已连接' : '未连接'}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <div className="bg-white mt-2">
          <button
            onClick={() => setShowAddFriend(true)}
            className="flex items-center w-full p-4 hover:bg-gray-50"
          >
            <UserPlus className="w-5 h-5 text-green-600 mr-3" />
            <span>添加好友</span>
            {friendRequests.length > 0 && (
              <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {friendRequests.length}
              </span>
            )}
          </button>
          
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center w-full p-4 hover:bg-gray-50 border-t"
          >
            <Settings className="w-5 h-5 text-gray-600 mr-3" />
            <span>设置</span>
          </button>
          
          <button
            onClick={() => setShowNotificationCenter(true)}
            className="flex items-center w-full p-4 hover:bg-gray-50 border-t"
          >
            <Bell className="w-5 h-5 text-gray-600 mr-3" />
            <span>通知中心</span>
            {notificationHistory.filter(n => !n.read).length > 0 && (
              <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {notificationHistory.filter(n => !n.read).length}
              </span>
            )}
          </button>
          
          {/* 调试按钮 - 测试通知 */}
          {process.env.NODE_ENV === 'development' && (
            <button
              onClick={() => {
                console.log('测试通知');
                showNotification(
                  '测试用户',
                  '这是一条测试消息 ' + new Date().toLocaleTimeString(),
                  null,
                  () => {
                    console.log('点击了通知');
                  }
                );
              }}
              className="flex items-center w-full p-4 hover:bg-gray-50 border-t text-orange-600"
            >
              <Bell className="w-5 h-5 mr-3" />
              <span>测试通知</span>
            </button>
          )}
        </div>
        
        <div className="bg-white mt-2">
          <button
            onClick={handleLogout}
            className="flex items-center w-full p-4 hover:bg-gray-50 text-red-500"
          >
            <LogOut className="w-5 h-5 mr-3" />
            <span>退出登录</span>
          </button>
        </div>
      </div>
    </div>
  );

  // 通知容器组件
  const NotificationContainer = () => (
    <div className={`fixed ${isMobile ? 'top-0 left-0 right-0 safe-area-top' : 'top-4 right-4'} z-50 space-y-2 p-2`}>
      {inAppNotifications.map(notification => (
        <div
          key={notification.id}
          className={`bg-white rounded-lg shadow-lg ${isMobile ? 'mx-2' : 'min-w-[300px]'} animate-slideIn`}
          onClick={() => {
            if (notification.onClick) {
              notification.onClick();
            }
            setInAppNotifications(prev => 
              prev.filter(n => n.id !== notification.id)
            );
          }}
        >
          <div className="p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {notification.type === 'message' && (
                  <MessageCircle className="w-6 h-6 text-green-500" />
                )}
                {notification.type === 'info' && (
                  <Bell className="w-6 h-6 text-blue-500" />
                )}
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {notification.title}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {notification.body}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setInAppNotifications(prev => 
                    prev.filter(n => n.id !== notification.id)
                  );
                }}
                className="ml-4 flex-shrink-0 p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // 登录/注册界面
  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-400 to-blue-500 p-4">
        <div className={`bg-white rounded-lg shadow-xl ${isMobile ? 'w-full max-w-sm p-6' : 'w-96 p-8'}`}>
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold">
              {isRegistering ? '创建账户' : '欢迎回来'}
            </h2>
          </div>
          
          {isRegistering ? (
            <div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  <User className="inline w-4 h-4 mr-1" />
                  用户名
                </label>
                <input
                  type="text"
                  value={registerForm.username}
                  onChange={(e) => setRegisterForm({...registerForm, username: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  <Mail className="inline w-4 h-4 mr-1" />
                  邮箱
                </label>
                <input
                  type="email"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm({...registerForm, email: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  <Lock className="inline w-4 h-4 mr-1" />
                  密码
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  <Lock className="inline w-4 h-4 mr-1" />
                  确认密码
                </label>
                <input
                  type="password"
                  value={registerForm.confirmPassword}
                  onChange={(e) => setRegisterForm({...registerForm, confirmPassword: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              
              <button
                onClick={handleRegister}
                className="w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition duration-200"
              >
                注册
              </button>
              
              <p className="text-center mt-4 text-sm">
                已有账户？
                <button
                  type="button"
                  onClick={() => setIsRegistering(false)}
                  className="text-green-500 hover:underline ml-1"
                >
                  立即登录
                </button>
              </p>
            </div>
          ) : (
            <div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  <Mail className="inline w-4 h-4 mr-1" />
                  邮箱
                </label>
                <input
                  type="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="user@example.com"
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  <Lock className="inline w-4 h-4 mr-1" />
                  密码
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                    onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="123456"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              <button
                onClick={handleLogin}
                className="w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition duration-200"
              >
                登录
              </button>
              
              <div className={`flex items-center justify-between mt-4 ${isMobile ? 'flex-col space-y-2' : ''}`}>
                <label className="flex items-center text-sm">
                  <input type="checkbox" className="mr-2" />
                  记住我
                </label>
                <a href="#" className="text-sm text-green-500 hover:underline">
                  忘记密码？
                </a>
              </div>
              
              <p className="text-center mt-4 text-sm">
                还没有账户？
                <button
                  type="button"
                  onClick={() => setIsRegistering(true)}
                  className="text-green-500 hover:underline ml-1"
                >
                  立即注册
                </button>
              </p>
              
              <div className="mt-4 text-center text-xs text-gray-500">
                测试账号：user@example.com / 123456
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 主界面 - 移动端
  if (isMobile) {
    return (
      <div className="flex flex-col h-screen bg-gray-100">
        {/* 通知容器 */}
        <NotificationContainer />
        
        {/* 隐藏的文件输入 */}
        <input ref={fileInputRef} type="file" className="hidden" />
        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" />

        {/* 移动端模态框 - 添加好友 */}
        {showAddFriend && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-md max-h-[80vh] overflow-hidden">
              <div className="flex justify-between items-center p-4 border-b">
                <h3 className="text-xl font-bold">添加好友</h3>
                <button
                  onClick={() => {
                    setShowAddFriend(false);
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    searchUsers(e.target.value);
                  }}
                  placeholder="搜索用户名或邮箱"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              
              <div className="flex-1 overflow-y-auto max-h-96">
                {searchResults.length > 0 && (
                  <div className="px-4 pb-4 space-y-2">
                    {searchResults.map(user => (
                      <div key={user._id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold mr-3">
                            {user.username[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">{user.username}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => sendFriendRequest(user._id)}
                          className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                        >
                          添加
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {searchQuery && searchResults.length === 0 && (
                  <p className="text-center text-gray-500 p-4">没有找到用户</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 移动端好友请求通知 */}
        {friendRequests.length > 0 && mobileView === 'profile' && (
          <div className="fixed top-16 right-4 left-4 bg-white rounded-lg shadow-lg p-4 z-40">
            <h4 className="font-bold mb-2">好友请求 ({friendRequests.length})</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {friendRequests.map(request => (
                <div key={request._id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center flex-1">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold mr-2">
                      {request.from.username[0].toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{request.from.username}</p>
                      <p className="text-xs text-gray-500">{request.message}</p>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleFriendRequest(request._id, 'accept')}
                      className="p-1 bg-green-500 text-white rounded hover:bg-green-600"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleFriendRequest(request._id, 'reject')}
                      className="p-1 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 移动端设置模态框 */}
        {showSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-md max-h-[80vh] overflow-y-auto">
              <div className="p-4 border-b">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold">设置</h3>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Bell className="w-5 h-5 mr-2" />
                    <span>消息通知</span>
                  </div>
                  <button
                    onClick={() => saveNotificationSettings({
                      ...notificationSettings,
                      enabled: !notificationSettings.enabled
                    })}
                    className={`w-12 h-6 rounded-full ${notificationSettings.enabled ? 'bg-green-500' : 'bg-gray-300'} relative transition-colors`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${notificationSettings.enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Volume2 className="w-5 h-5 mr-2" />
                    <span>提示音</span>
                  </div>
                  <button
                    onClick={() => saveNotificationSettings({
                      ...notificationSettings,
                      sound: !notificationSettings.sound
                    })}
                    disabled={!notificationSettings.enabled}
                    className={`w-12 h-6 rounded-full ${notificationSettings.sound && notificationSettings.enabled ? 'bg-green-500' : 'bg-gray-300'} relative transition-colors disabled:opacity-50`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${notificationSettings.sound ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>
                
                {isMobile && 'vibrate' in navigator && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Smartphone className="w-5 h-5 mr-2" />
                      <span>振动</span>
                    </div>
                    <button
                      onClick={() => saveNotificationSettings({
                        ...notificationSettings,
                        vibration: !notificationSettings.vibration
                      })}
                      disabled={!notificationSettings.enabled}
                      className={`w-12 h-6 rounded-full ${notificationSettings.vibration && notificationSettings.enabled ? 'bg-green-500' : 'bg-gray-300'} relative transition-colors disabled:opacity-50`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${notificationSettings.vibration ? 'translate-x-6' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Shield className="w-5 h-5 mr-2" />
                    <span>端到端加密</span>
                  </div>
                  <span className="text-green-500 text-sm">已启用</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <User className="w-5 h-5 mr-2" />
                    <span>个人资料</span>
                  </div>
                  <button className="text-blue-500 text-sm hover:underline">编辑</button>
                </div>
                
                <div className="pt-4 border-t">
                  <button className="text-red-500 text-sm hover:underline">清除聊天记录</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 移动端通知中心 */}
        {showNotificationCenter && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-md max-h-[80vh] overflow-hidden">
              <div className="p-4 border-b">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold">通知中心</h3>
                  <button
                    onClick={() => setShowNotificationCenter(false)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div className="overflow-y-auto max-h-[calc(80vh-100px)]">
                {notificationHistory.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    暂无通知
                  </div>
                ) : (
                  <div className="divide-y">
                    {notificationHistory.map((notification, index) => (
                      <div
                        key={notification.id || index}
                        className={`p-4 hover:bg-gray-50 ${!notification.read ? 'bg-blue-50' : ''}`}
                        onClick={() => {
                          // 标记为已读
                          setNotificationHistory(prev => 
                            prev.map(n => n.id === notification.id ? {...n, read: true} : n)
                          );
                          // 如果有点击回调，执行它
                          if (notification.onClick) {
                            notification.onClick();
                            setShowNotificationCenter(false);
                          }
                        }}
                      >
                        <div className="flex items-start">
                          <div className="flex-shrink-0">
                            {notification.type === 'message' && (
                              <MessageCircle className="w-5 h-5 text-green-500" />
                            )}
                            {notification.type === 'info' && (
                              <Bell className="w-5 h-5 text-blue-500" />
                            )}
                          </div>
                          <div className="ml-3 flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {notification.title}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              {notification.body}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(notification.timestamp).toLocaleString('zh-CN')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {notificationHistory.length > 0 && (
                <div className="p-4 border-t">
                  <button
                    onClick={() => {
                      setNotificationHistory([]);
                      setShowNotificationCenter(false);
                    }}
                    className="w-full py-2 text-red-500 hover:bg-red-50 rounded"
                  >
                    清空所有通知
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 移动端主内容区 */}
        <div 
          className="flex-1"
          onTouchStart={() => {
            // 移动端触摸时初始化音频上下文
            if (isMobile && !audioContextRef.current) {
              initAudioContext();
            }
          }}
        >
        {mobileView === 'profile' ? (
          <MobileProfile />
        ) : mobileView === 'chat' && selectedChat ? (
          // 聊天界面
          <div className="flex flex-col h-screen">
            {/* 聊天头部 */}
            <div className="bg-white p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center">
                <button onClick={handleBackToList} className="mr-3">
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="relative">
                  <div className={`w-10 h-10 rounded-full ${
                    chats.find(c => c.id === selectedChat)?.type === 'group' ? 'bg-blue-500' : 
                    chats.find(c => c.id === selectedChat)?.type === 'ai' ? 'bg-purple-500' : 'bg-green-500'
                  } flex items-center justify-center text-white font-bold`}>
                    {chats.find(c => c.id === selectedChat)?.type === 'group' 
                      ? <Users className="w-5 h-5" /> 
                      : chats.find(c => c.id === selectedChat)?.avatar
                    }
                  </div>
                  {chats.find(c => c.id === selectedChat)?.online && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                  )}
                </div>
                <div className="ml-3">
                  <h2 className="font-medium">{chats.find(c => c.id === selectedChat)?.name}</h2>
                  <p className="text-xs text-gray-500">
                    {chats.find(c => c.id === selectedChat)?.type === 'ai'
                      ? isAITyping ? 'AI正在思考...' : 'AI助手'
                      : socketConnected 
                        ? (chats.find(c => c.id === selectedChat)?.online ? '在线' : '离线')
                        : '连接中...'
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button className="p-2 hover:bg-gray-100 rounded-full">
                  <Phone className="w-5 h-5 text-gray-600" />
                </button>
                <button onClick={startVideoCall} className="p-2 hover:bg-gray-100 rounded-full">
                  <Video className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            {/* 消息区域 */}
            <div 
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-4 bg-gray-50"
              onScroll={handleScroll}
            >
              {messages[selectedChat]?.map(msg => (
                <div key={msg.id}>
                  {msg.sender === 'system' && (
                    <div className="text-center my-4">
                      <span className="text-xs text-gray-500 bg-gray-200 px-3 py-1 rounded-full">
                        {msg.text}
                      </span>
                    </div>
                  )}
                  
                  {msg.sender !== 'system' && (
                    <div className={`flex mb-4 ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[80%] ${
                          msg.sender === 'me'
                            ? 'bg-green-500 text-white'
                            : msg.sender === 'ai' 
                            ? 'bg-purple-500 text-white'
                            : 'bg-white text-gray-900'
                        } rounded-lg shadow`}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setShowMessageMenu(msg.id);
                        }}
                      >
                        <div className="px-4 py-2">
                          <p>{msg.text}</p>
                        </div>
                        <div className={`flex items-center justify-between px-3 pb-1 text-xs ${
                          msg.sender === 'me' ? 'text-green-100' : 'text-gray-500'
                        }`}>
                          <span>{msg.time}</span>
                          {msg.sender === 'me' && msg.status && (
                            <span className="ml-2">
                              {msg.status === 'sent' && <Check className="w-3 h-3 inline" />}
                              {msg.status === 'delivered' && <CheckCheck className="w-3 h-3 inline" />}
                              {msg.status === 'read' && <CheckCheck className="w-3 h-3 inline text-blue-300" />}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {selectedChat === 'ai-assistant' && isAITyping && (
                <div className="flex justify-start mb-4">
                  <div className="bg-purple-500 text-white rounded-lg px-4 py-2">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                        <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                        <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                      </div>
                      <span className="text-sm">AI正在思考...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* 输入区域 */}
            <div className="bg-white p-4 border-t border-gray-200">
              {showEmojiPicker && (
                <div className="absolute bottom-20 left-4 right-4 bg-white rounded-lg shadow-xl p-4 max-h-64 overflow-y-auto z-10">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium">选择表情</h3>
                    <button onClick={() => setShowEmojiPicker(false)} className="p-1 hover:bg-gray-100 rounded">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-8 gap-1">
                    {emojis.map((emoji, index) => (
                      <button
                        key={index}
                        onClick={() => setMessage(prev => prev + emoji)}
                        className="text-2xl hover:bg-gray-100 rounded p-1"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex items-center space-x-2">
                <button className="p-2 hover:bg-gray-100 rounded-full">
                  <Paperclip className="w-5 h-5 text-gray-600" />
                </button>
                <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-2 hover:bg-gray-100 rounded-full">
                  <Smile className="w-5 h-5 text-gray-600" />
                </button>
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  onFocus={() => {
                    // 移动端输入框聚焦时初始化音频
                    if (isMobile && !audioContextRef.current) {
                      initAudioContext();
                    }
                  }}
                  placeholder="输入消息..."
                  className="flex-1 px-4 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                {message.trim() ? (
                  <button onClick={handleSendMessage} className="p-2 bg-green-500 hover:bg-green-600 rounded-full text-white">
                    <Send className="w-5 h-5" />
                  </button>
                ) : (
                  <button className="p-2 bg-green-500 hover:bg-green-600 rounded-full text-white">
                    <Mic className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          // 聊天列表
          <div className="flex-1 overflow-hidden">
            {/* 搜索栏 */}
            <div className="bg-white p-4 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索聊天"
                  className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            {/* 标签栏 */}
            {(mobileView === 'chats' || mobileView === 'contacts' || mobileView === 'groups') && (
              <div className="flex bg-white border-b border-gray-200">
                <button
                  className={`flex-1 py-3 text-center ${activeTab === 'chats' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-600'}`}
                  onClick={() => setActiveTab('chats')}
                >
                  聊天
                </button>
                <button
                  className={`flex-1 py-3 text-center ${activeTab === 'contacts' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-600'}`}
                  onClick={() => setActiveTab('contacts')}
                >
                  通讯录
                </button>
                <button
                  className={`flex-1 py-3 text-center ${activeTab === 'groups' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-600'}`}
                  onClick={() => setActiveTab('groups')}
                >
                  群组
                </button>
              </div>
            )}

            {/* 添加好友按钮 */}
            {activeTab === 'contacts' && (
              <button
                onClick={() => setShowAddFriend(true)}
                className="w-full p-4 flex items-center justify-center text-green-600 hover:bg-gray-50 bg-white border-b"
              >
                <UserPlus className="w-5 h-5 mr-2" />
                添加好友
              </button>
            )}

            {/* 创建群组按钮 */}
            {activeTab === 'groups' && (
              <button
                onClick={() => setShowGroupModal(true)}
                className="w-full p-4 flex items-center justify-center text-green-600 hover:bg-gray-50 bg-white"
              >
                <Plus className="w-5 h-5 mr-2" />
                创建群组
              </button>
            )}

            {/* 聊天列表 */}
            <div className="flex-1 overflow-y-auto bg-white">
              {filteredChats
                .filter(chat => {
                  if (activeTab === 'groups') return chat.type === 'group';
                  if (activeTab === 'contacts') return chat.type === 'private';
                  return true;
                })
                .map(chat => (
                <div
                  key={chat.id}
                  className={`flex items-center p-4 hover:bg-gray-50 cursor-pointer ${selectedChat === chat.id ? 'bg-gray-100' : ''}`}
                  onClick={() => handleSelectChat(chat.id)}
                >
                  <div className="relative">
                    <div className={`w-12 h-12 rounded-full ${
                      chat.type === 'group' ? 'bg-blue-500' : 
                      chat.type === 'ai' ? 'bg-purple-500' : 'bg-green-500'
                    } flex items-center justify-center text-white font-bold`}>
                      {chat.type === 'group' ? <Users className="w-6 h-6" /> : 
                       chat.type === 'ai' ? chat.avatar : chat.avatar}
                    </div>
                    {chat.online && chat.type === 'private' && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                  <div className="flex-1 ml-3">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium text-gray-900">{chat.name}</h3>
                      <span className="text-xs text-gray-500">{chat.time}</span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">{chat.lastMessage}</p>
                  </div>
                  {chat.unread > 0 && (
                    <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {chat.unread > 99 ? '99+' : chat.unread}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        </div>

        {/* 移动端底部导航 */}
        {(!selectedChat || mobileView !== 'chat') && <MobileBottomNav />}
      </div>
    );
  }

  // 主界面 - 桌面端
  return (
    <div className="flex h-screen bg-gray-100">
      {/* 通知容器 */}
      <NotificationContainer />
      
      {/* 隐藏的文件输入 */}
      <input ref={fileInputRef} type="file" className="hidden" />
      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" />

      {/* 添加好友模态框 */}
      {showAddFriend && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">添加好友</h3>
              <button
                onClick={() => {
                  setShowAddFriend(false);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                搜索用户
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  searchUsers(e.target.value);
                }}
                placeholder="输入用户名或邮箱"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            
            {/* 搜索结果 */}
            {searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map(user => (
                  <div key={user._id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold mr-3">
                        {user.username[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{user.username}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => sendFriendRequest(user._id)}
                      className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                    >
                      添加
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {searchQuery && searchResults.length === 0 && (
              <p className="text-center text-gray-500">没有找到用户</p>
            )}
            
            {/* 好友请求列表 */}
            {friendRequests.length > 0 && (
              <div className="mt-6">
                <h4 className="font-bold mb-2">待处理的好友请求 ({friendRequests.length})</h4>
                <div className="space-y-2">
                  {friendRequests.map(request => (
                    <div key={request._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold mr-3">
                          {request.from.username[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{request.from.username}</p>
                          <p className="text-sm text-gray-500">{request.message}</p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleFriendRequest(request._id, 'accept')}
                          className="p-2 bg-green-500 text-white rounded hover:bg-green-600"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleFriendRequest(request._id, 'reject')}
                          className="p-2 bg-red-500 text-white rounded hover:bg-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 设置模态框 */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">设置</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Bell className="w-5 h-5 mr-2" />
                  <span>消息通知</span>
                </div>
                <button
                  onClick={() => saveNotificationSettings({
                    ...notificationSettings,
                    enabled: !notificationSettings.enabled
                  })}
                  className={`w-12 h-6 rounded-full ${notificationSettings.enabled ? 'bg-green-500' : 'bg-gray-300'} relative transition-colors`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${notificationSettings.enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Volume2 className="w-5 h-5 mr-2" />
                  <span>提示音</span>
                </div>
                <button
                  onClick={() => saveNotificationSettings({
                    ...notificationSettings,
                    sound: !notificationSettings.sound
                  })}
                  disabled={!notificationSettings.enabled}
                  className={`w-12 h-6 rounded-full ${notificationSettings.sound && notificationSettings.enabled ? 'bg-green-500' : 'bg-gray-300'} relative transition-colors disabled:opacity-50`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${notificationSettings.sound ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Monitor className="w-5 h-5 mr-2" />
                  <span>桌面通知</span>
                </div>
                <button
                  onClick={() => saveNotificationSettings({
                    ...notificationSettings,
                    desktop: !notificationSettings.desktop
                  })}
                  disabled={!notificationSettings.enabled}
                  className={`w-12 h-6 rounded-full ${notificationSettings.desktop && notificationSettings.enabled ? 'bg-green-500' : 'bg-gray-300'} relative transition-colors disabled:opacity-50`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${notificationSettings.desktop ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
              
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Shield className="w-5 h-5 mr-2" />
                    <span>端到端加密</span>
                  </div>
                  <span className="text-green-500 text-sm">已启用</span>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <button className="text-red-500 text-sm hover:underline">清除聊天记录</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 创建群组模态框 */}
      {showGroupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">创建群组</h3>
              <button
                onClick={() => {
                  setShowGroupModal(false);
                  setGroupForm({ name: '', members: [] });
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                群组名称
              </label>
              <input
                type="text"
                value={groupForm.name}
                onChange={(e) => setGroupForm({...groupForm, name: e.target.value})}
                placeholder="输入群组名称"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                选择成员
              </label>
              <div className="max-h-48 overflow-y-auto border rounded-lg p-2">
                {allUsers.map(user => (
                  <label key={user.id} className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={groupForm.members.includes(user.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setGroupForm({
                            ...groupForm,
                            members: [...groupForm.members, user.id]
                          });
                        } else {
                          setGroupForm({
                            ...groupForm,
                            members: groupForm.members.filter(id => id !== user.id)
                          });
                        }
                      }}
                      className="mr-3"
                    />
                    <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-sm font-bold mr-2">
                      {user.avatar}
                    </div>
                    <span>{user.name}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <button
              onClick={handleCreateGroup}
              disabled={!groupForm.name.trim() || groupForm.members.length === 0}
              className="w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              创建群组
            </button>
          </div>
        </div>
      )}

      {/* 视频通话界面 */}
      {showVideoCall && (
        <div className="fixed inset-0 bg-black flex flex-col z-50">
          <div className="flex-1 relative">
            {/* 远程视频 */}
            <video
              ref={remoteVideoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
            />
            
            {/* 本地视频 */}
            <div className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden shadow-lg">
              <video
                ref={localVideoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
              />
            </div>
            
            {/* 通话状态 */}
            {callStatus && (
              <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-4 py-2 rounded-lg">
                {callStatus}
              </div>
            )}
          </div>
          
          {/* 控制栏 */}
          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 p-6">
            <div className="flex justify-center items-center space-x-6">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`p-4 rounded-full ${isMuted ? 'bg-red-500' : 'bg-gray-700'} text-white hover:opacity-80`}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>
              
              <button
                onClick={endCall}
                className="p-4 bg-red-500 rounded-full text-white hover:bg-red-600"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
              
              <button
                onClick={() => setIsVideoOff(!isVideoOff)}
                className={`p-4 rounded-full ${isVideoOff ? 'bg-red-500' : 'bg-gray-700'} text-white hover:opacity-80`}
              >
                {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 侧边栏 */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* 用户信息栏 */}
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">
                {currentUser?.username?.[0] || 'U'}
              </div>
              <div className="ml-3">
                <h3 className="font-medium">{currentUser?.username || '用户'}</h3>
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-green-400' : 'bg-red-400'} mr-1`} />
                  <span className="text-xs text-gray-500">{socketConnected ? '在线' : '离线'}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowAddFriend(true)}
                className="p-2 hover:bg-gray-200 rounded-full relative"
              >
                <UserPlus className="w-5 h-5 text-gray-600" />
                {friendRequests.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
                    {friendRequests.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 hover:bg-gray-200 rounded-full"
              >
                <Settings className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-gray-200 rounded-full"
              >
                <LogOut className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        {/* 搜索栏 */}
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索聊天"
              className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        {/* 标签栏 */}
        <div className="flex border-b border-gray-200">
          <button
            className={`flex-1 py-3 text-center ${activeTab === 'chats' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab('chats')}
          >
            聊天
          </button>
          <button
            className={`flex-1 py-3 text-center ${activeTab === 'contacts' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab('contacts')}
          >
            通讯录
          </button>
          <button
            className={`flex-1 py-3 text-center ${activeTab === 'groups' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab('groups')}
          >
            群组
          </button>
        </div>

        {/* 创建群组按钮 */}
        {activeTab === 'groups' && (
          <button
            onClick={() => setShowGroupModal(true)}
            className="m-4 p-3 flex items-center justify-center text-green-600 hover:bg-gray-50 rounded-lg border border-green-600"
          >
            <Plus className="w-5 h-5 mr-2" />
            创建群组
          </button>
        )}

        {/* 聊天列表 */}
        <div className="flex-1 overflow-y-auto">
          {filteredChats
            .filter(chat => {
              if (activeTab === 'groups') return chat.type === 'group';
              if (activeTab === 'contacts') return chat.type === 'private';
              return true;
            })
            .map(chat => (
            <div
              key={chat.id}
              className={`flex items-center p-4 hover:bg-gray-50 cursor-pointer ${selectedChat === chat.id ? 'bg-gray-100' : ''}`}
              onClick={() => setSelectedChat(chat.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                // 可以添加右键菜单功能
              }}
            >
              <div className="relative">
                <div className={`w-12 h-12 rounded-full ${
                  chat.type === 'group' ? 'bg-blue-500' : 
                  chat.type === 'ai' ? 'bg-purple-500' : 'bg-green-500'
                } flex items-center justify-center text-white font-bold`}>
                  {chat.type === 'group' ? <Users className="w-6 h-6" /> : 
                   chat.type === 'ai' ? chat.avatar : chat.avatar}
                </div>
                {chat.online && chat.type === 'private' && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                )}
              </div>
              <div className="flex-1 ml-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium text-gray-900">{chat.name}</h3>
                  <span className="text-xs text-gray-500">{chat.time}</span>
                </div>
                <p className="text-sm text-gray-500 truncate">{chat.lastMessage}</p>
              </div>
              {chat.unread > 0 && (
                <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {chat.unread > 99 ? '99+' : chat.unread}
                </div>
              )}
              {chat.pinned && (
                <div className="ml-2">
                  <Star className="w-4 h-4 text-gray-400" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 主聊天区域 */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            {/* 聊天头部 */}
            <div className="bg-white p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center">
                <div className="relative">
                  <div className={`w-10 h-10 rounded-full ${
                    chats.find(c => c.id === selectedChat)?.type === 'group' ? 'bg-blue-500' : 
                    chats.find(c => c.id === selectedChat)?.type === 'ai' ? 'bg-purple-500' : 'bg-green-500'
                  } flex items-center justify-center text-white font-bold`}>
                    {chats.find(c => c.id === selectedChat)?.type === 'group' 
                      ? <Users className="w-5 h-5" /> 
                      : chats.find(c => c.id === selectedChat)?.avatar
                    }
                  </div>
                  {chats.find(c => c.id === selectedChat)?.online && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                  )}
                </div>
                <div className="ml-3">
                  <h2 className="font-medium">{chats.find(c => c.id === selectedChat)?.name}</h2>
                  <p className="text-sm text-gray-500">
                    {chats.find(c => c.id === selectedChat)?.type === 'ai'
                      ? isAITyping ? 'AI正在思考...' : 'AI助手'
                      : chats.find(c => c.id === selectedChat)?.type === 'group'
                      ? `${chats.find(c => c.id === selectedChat)?.members || 0} 成员`
                      : chats.find(c => c.id === selectedChat)?.online 
                      ? '在线' 
                      : `最后上线: ${chats.find(c => c.id === selectedChat)?.lastSeen || '未知'}`
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button className="p-2 hover:bg-gray-100 rounded-full">
                  <Phone className="w-5 h-5 text-gray-600" />
                </button>
                <button onClick={startVideoCall} className="p-2 hover:bg-gray-100 rounded-full">
                  <Video className="w-5 h-5 text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-full">
                  <MoreVertical className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            {/* 消息区域 */}
            <div 
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-4 bg-gray-50"
              onScroll={handleScroll}
            >
              {/* 回复提示 */}
              {replyingTo && (
                <div className="mb-4 p-2 bg-blue-50 rounded-lg flex items-center justify-between">
                  <div className="flex items-center">
                    <Reply className="w-4 h-4 text-blue-600 mr-2" />
                    <div>
                      <p className="text-xs text-blue-600">回复 {replyingTo.senderName || '自己'}</p>
                      <p className="text-sm text-gray-700 truncate">{replyingTo.text}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setReplyingTo(null)}
                    className="p-1 hover:bg-blue-100 rounded"
                  >
                    <X className="w-4 h-4 text-blue-600" />
                  </button>
                </div>
              )}

              {/* 消息列表 */}
              {messages[selectedChat]?.map(msg => (
                <div key={msg.id}>
                  {/* 系统消息 */}
                  {msg.sender === 'system' && (
                    <div className="text-center my-4">
                      <span className="text-xs text-gray-500 bg-gray-200 px-3 py-1 rounded-full">
                        {msg.text}
                      </span>
                    </div>
                  )}
                  
                  {/* 普通消息 */}
                  {msg.sender !== 'system' && (
                    <div className={`flex mb-4 ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                      <div className="max-w-lg">
                        {/* 发送者名称（群聊） */}
                        {msg.sender === 'other' && chats.find(c => c.id === selectedChat)?.type === 'group' && (
                          <p className="text-xs text-gray-500 mb-1 ml-1">{msg.senderName}</p>
                        )}
                        
                        <div
                          className={`relative ${
                            msg.sender === 'me'
                              ? 'bg-green-500 text-white'
                              : msg.sender === 'ai' 
                              ? 'bg-purple-500 text-white'
                              : 'bg-white text-gray-900'
                          } rounded-lg shadow`}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setShowMessageMenu(msg.id);
                          }}
                        >
                          {/* 消息内容 */}
                          <div className="px-4 py-2">
                            {msg.replyTo && (
                              <div className={`mb-2 p-2 rounded ${
                                msg.sender === 'me' ? 'bg-green-600' : 'bg-gray-100'
                              }`}>
                                <p className={`text-xs ${msg.sender === 'me' ? 'text-green-200' : 'text-gray-500'}`}>
                                  {msg.replyTo.senderName || '自己'}
                                </p>
                                <p className={`text-sm truncate ${msg.sender === 'me' ? 'text-white' : 'text-gray-700'}`}>
                                  {msg.replyTo.text}
                                </p>
                              </div>
                            )}
                            
                            {msg.type === 'image' ? (
                              <img src={msg.url} alt="图片" className="max-w-xs rounded" />
                            ) : (
                              <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                            )}
                          </div>
                          
                          {/* 时间和状态 */}
                          <div className={`flex items-center justify-between px-3 pb-1 text-xs ${
                            msg.sender === 'me' ? 'text-green-100' : msg.sender === 'ai' ? 'text-purple-100' : 'text-gray-500'
                          }`}>
                            <span>{msg.time}</span>
                            {msg.sender === 'me' && msg.status && (
                              <span className="ml-2">
                                {msg.status === 'sent' && <Check className="w-3 h-3 inline" />}
                                {msg.status === 'delivered' && <CheckCheck className="w-3 h-3 inline" />}
                                {msg.status === 'read' && <CheckCheck className="w-3 h-3 inline text-blue-300" />}
                              </span>
                            )}
                          </div>
                          
                          {/* 消息菜单 */}
                          {showMessageMenu === msg.id && (
                            <div className="absolute top-0 right-0 mt-8 bg-white rounded-lg shadow-lg py-2 z-10">
                              <button
                                onClick={() => handleMessageAction('reply', msg)}
                                className="flex items-center px-4 py-2 hover:bg-gray-100 w-full text-left"
                              >
                                <Reply className="w-4 h-4 mr-2" />
                                回复
                              </button>
                              <button
                                onClick={() => handleMessageAction('forward', msg)}
                                className="flex items-center px-4 py-2 hover:bg-gray-100 w-full text-left"
                              >
                                <Forward className="w-4 h-4 mr-2" />
                                转发
                              </button>
                              <button
                                onClick={() => handleMessageAction('copy', msg)}
                                className="flex items-center px-4 py-2 hover:bg-gray-100 w-full text-left"
                              >
                                <Copy className="w-4 h-4 mr-2" />
                                复制
                              </button>
                              <button
                                onClick={() => handleMessageAction('star', msg)}
                                className="flex items-center px-4 py-2 hover:bg-gray-100 w-full text-left"
                              >
                                <Star className="w-4 h-4 mr-2" />
                                收藏
                              </button>
                              {msg.sender === 'me' && (
                                <button
                                  onClick={() => handleMessageAction('delete', msg)}
                                  className="flex items-center px-4 py-2 hover:bg-gray-100 w-full text-left text-red-500"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  删除
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {/* AI 输入中提示 */}
              {selectedChat === 'ai-assistant' && isAITyping && (
                <div className="flex justify-start mb-4">
                  <div className="bg-purple-500 text-white rounded-lg px-4 py-2">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                        <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                        <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                      </div>
                      <span className="text-sm">AI正在思考...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
              
              {/* 滚动到底部按钮 */}
              {showScrollToBottom && (
                <button
                  onClick={scrollToBottom}
                  className="fixed bottom-24 right-8 bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition-shadow"
                >
                  <ArrowLeft className="w-5 h-5 transform rotate-270" />
                </button>
              )}
            </div>

            {/* 输入区域 */}
            <div className="bg-white p-4 border-t border-gray-200">
              {/* 表情选择器 */}
              {showEmojiPicker && (
                <div className="absolute bottom-20 left-4 bg-white rounded-lg shadow-xl p-4 w-96 max-h-80 overflow-y-auto z-10">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium">选择表情</h3>
                    <button onClick={() => setShowEmojiPicker(false)} className="p-1 hover:bg-gray-100 rounded">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-10 gap-1">
                    {emojis.map((emoji, index) => (
                      <button
                        key={index}
                        onClick={() => setMessage(prev => prev + emoji)}
                        className="text-2xl hover:bg-gray-100 rounded p-1"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* 附件菜单 */}
              {showAttachMenu && (
                <div className="absolute bottom-20 left-4 bg-white rounded-lg shadow-xl py-2 z-10">
                  <button
                    onClick={() => {
                      imageInputRef.current?.click();
                      setShowAttachMenu(false);
                    }}
                    className="flex items-center px-4 py-2 hover:bg-gray-100 w-full text-left"
                  >
                    <File className="w-4 h-4 mr-2" />
                    图片
                  </button>
                  <button
                    onClick={() => {
                      fileInputRef.current?.click();
                      setShowAttachMenu(false);
                    }}
                    className="flex items-center px-4 py-2 hover:bg-gray-100 w-full text-left"
                  >
                    <File className="w-4 h-4 mr-2" />
                    文件
                  </button>
                </div>
              )}
              
              {/* 录音时间显示 */}
              {isRecording && (
                <div className="flex items-center justify-center mb-2 text-red-500">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-2"></div>
                  正在录音 {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                </div>
              )}
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowAttachMenu(!showAttachMenu)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <Paperclip className="w-5 h-5 text-gray-600" />
                </button>
                
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <Smile className="w-5 h-5 text-gray-600" />
                </button>
                
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="输入消息..."
                  className="flex-1 px-4 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                
                {message.trim() ? (
                  <button
                    onClick={handleSendMessage}
                    className="p-2 bg-green-500 hover:bg-green-600 rounded-full text-white transition-colors"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (!isRecording) {
                        setIsRecording(true);
                        setRecordingTime(0);
                        recordingInterval.current = setInterval(() => {
                          setRecordingTime(prev => prev + 1);
                        }, 1000);
                      } else {
                        setIsRecording(false);
                        if (recordingInterval.current) {
                          clearInterval(recordingInterval.current);
                        }
                        alert('语音消息功能开发中...');
                      }
                    }}
                    className={`p-2 ${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} rounded-full text-white transition-colors`}
                  >
                    {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          /* 未选择聊天时的占位界面 */
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl text-gray-500 mb-2">欢迎使用聊天应用</h3>
              <p className="text-gray-400">选择一个聊天开始对话</p>
            </div>
          </div>
        )}
      </div>
      
      {/* 点击空白处关闭菜单 */}
      {(showMessageMenu || showEmojiPicker || showAttachMenu) && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => {
            setShowMessageMenu(null);
            setShowEmojiPicker(false);
            setShowAttachMenu(false);
          }}
        />
      )}
    </div>
  );
};

export default ChatApp;