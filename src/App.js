import React, { useState, useEffect, useRef } from 'react';
import { Box, TextField, Button, Container, Paper, Typography, IconButton, Avatar } from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import VideocamIcon from '@mui/icons-material/Videocam';
import LogoutIcon from '@mui/icons-material/Logout';
import SendIcon from '@mui/icons-material/Send';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import io from 'socket.io-client';
import { supabase } from './supabaseClient';
import styles from './App.module.css';
import Login from './Login';
import Profile from './Profile';

// Replace the socket connection with dynamic URL detection
const socket = io(window.location.hostname === 'localhost' ? 
  'http://localhost:3001' : 
  'https://videochat-backend-9xq8.onrender.com', {
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
});

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState(() => {
    const savedMessages = localStorage.getItem('chatMessages');
    return savedMessages ? JSON.parse(savedMessages) : [];
  });
  const [file, setFile] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  // Add a state to track the current user (for demo purposes)
  const [currentUser] = useState(localStorage.getItem('username') || 'user1');
  // Track user activity
  const [lastActivity, setLastActivity] = useState(Date.now());
  const inactivityTimeoutRef = useRef(null);
  // Add state for profile page
  const [showProfile, setShowProfile] = useState(false);
  // Profile picture state
  const [profilePic, setProfilePic] = useState(localStorage.getItem('profilePic') || '');

  // Function to update activity timestamp
  const updateActivity = () => {
    setLastActivity(Date.now());
  };

  useEffect(() => {
    // Check for existing session
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user || null);
    };
  
    if (token) {
      getUser();
    }
  
    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);
        if (session) {
          setToken(session.access_token);
          setUser(session.user);
          localStorage.setItem('token', session.access_token);
        } else {
          // Only clear the state if we're not already in the process of logging out
          // This prevents the loop of logout -> login -> logout
          if (token) {
            setToken(null);
            setUser(null);
            localStorage.removeItem('token');
          }
        }
      }
    );
  
    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []); // Remove token from dependencies to prevent re-running this effect when token changes

  // Set up activity tracking
  useEffect(() => {
    // Add event listeners to track user activity
    const activityEvents = ['mousedown', 'keypress', 'scroll', 'touchstart'];
    activityEvents.forEach(event => {
      window.addEventListener(event, updateActivity);
    });

    // Notify server when user joins
    if (token && currentUser) {
      socket.emit('user join', currentUser);
    }

    return () => {
      // Clean up event listeners
      activityEvents.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
    };
  }, [token, currentUser]);

  // Update profile picture when it changes in localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      setProfilePic(localStorage.getItem('profilePic') || '');
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleLogout = async () => {
    try {
      // First remove the token from localStorage to prevent any reloading issues
      localStorage.removeItem('token');
      
      // Then sign out from Supabase
      await supabase.auth.signOut();
      
      // Finally update the state
      setToken(null);
      setUser(null);
      setShowProfile(false); // Ensure profile page is closed if open
      
      // Force a small delay to ensure state updates are processed
      setTimeout(() => {
        // Double-check that token is still null (defensive programming)
        if (localStorage.getItem('token')) {
          localStorage.removeItem('token');
          setToken(null);
        }
      }, 100);
    } catch (error) {
      console.error('Error during logout:', error);
      // Force logout even if there's an error
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    // Properly handle incoming chat messages
    socket.on('chat message', (data) => {
      // Update activity timestamp when receiving messages
      updateActivity();
      
      // For regular messages, add sender property if not present
      if (data.type !== 'system' && !data.sender) {
        // In a real app, you would get this from authentication
        data.sender = currentUser;
      }
      
      setMessages(prevMessages => {
        const newMessages = [...prevMessages, data];
        // Save to localStorage
        localStorage.setItem('chatMessages', JSON.stringify(newMessages));
        return newMessages;
      });
    });
    
    // Listen for clear chat event
    socket.on('clear chat', () => {
      setMessages([]);
      localStorage.removeItem('chatMessages');
    });
    
    // Add ping/pong to keep connection alive
    const pingInterval = setInterval(() => {
      socket.emit('ping');
    }, 240000); // Send ping every 4 minutes
    
    socket.on('pong', () => {
      console.log('Received pong from server');
    });
    
    // Add reconnection handling
    socket.on('connect', () => {
      console.log('Connected to server');
    });
    
    socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });
    
    socket.on('connect_error', (error) => {
      console.log('Connection error:', error);
    });
  
    return () => {
      // Existing cleanup
      socket.off('chat message');
      socket.off('clear chat');
      
      // New cleanup
      clearInterval(pingInterval);
      socket.off('pong');
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
    };
  }, [currentUser]); // Add currentUser as a dependency

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileSelect = (e) => {
    updateActivity(); // Update activity timestamp
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.size <= 10 * 1024 * 1024) { // 10MB limit
      setFile(selectedFile);
    } else {
      alert('File size must be less than 10MB');
      e.target.value = null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    updateActivity(); // Update activity timestamp
    
    if (message.trim() || file) {
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const fileData = {
            type: 'file',
            name: file.name,
            data: e.target.result,
            fileType: file.type,
            sender: currentUser,
            senderProfilePic: profilePic, // Add profile pic to message data
            timestamp: new Date().toISOString()
          };
          socket.emit('chat message', fileData);
          setFile(null);
          fileInputRef.current.value = '';
        };
        reader.readAsDataURL(file);
      }
      
      if (message.trim()) {
        socket.emit('chat message', {
          type: 'text',
          content: message,
          sender: currentUser,
          senderProfilePic: profilePic, // Add profile pic to message data
          timestamp: new Date().toISOString()
        });
      }
      
      setMessage('');
    }
  };

  // Generate initials from username
  const getInitials = (username) => {
    if (!username) return '?';
    return username.substring(0, 2).toUpperCase();
  };

  // Update the renderMessage function to make message bubbles more futuristic
  const renderMessage = (msg, index) => {
  // Handle system messages differently
  if (msg.type === 'system') {
  // Check if it's a join or leave message
  const isJoinMessage = msg.content.includes('joined');
  const isLeaveMessage = msg.content.includes('left');
  
  // Extract the timestamp (if available)
  const timestamp = msg.timestamp ? new Date(msg.timestamp) : new Date();
  const timeString = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  // For join/leave messages, use a futuristic style
  if (isJoinMessage || isLeaveMessage) {
  return (
    <Box key={index} sx={{ 
      display: 'flex', 
      justifyContent: 'center',
      my: 2,
      px: 2
    }}>
      <Paper 
        elevation={0} 
        sx={{ 
          width: '100%',
          py: 1.5,
          px: 2,
          borderRadius: 2,
          backgroundColor: 'rgba(16, 18, 27, 0.6)',
          backdropFilter: 'blur(10px)',
          color: '#fff',
          border: isLeaveMessage ? '1px solid rgba(255, 0, 92, 0.5)' : '1px solid rgba(0, 219, 222, 0.5)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <Typography variant="body2">
          {msg.content}
        </Typography>
        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
          {isLeaveMessage ? 'now' : timeString}
        </Typography>
      </Paper>
    </Box>
  );
  }
  
  // For other system messages, use a minimalist futuristic style
  return (
    <Box key={index} sx={{ 
      display: 'flex', 
      justifyContent: 'center',
      my: 2
    }}>
      <Typography 
        variant="caption" 
        sx={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          color: 'rgba(255, 255, 255, 0.7)',
          py: 0.5,
          px: 2,
          borderRadius: 10,
          fontSize: '0.75rem',
          letterSpacing: '0.5px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        {msg.content}
      </Typography>
    </Box>
  );
  }
  
  // Regular messages with futuristic styling
  const isSentByMe = msg.sender === currentUser;
  
  // Common styles for all message bubbles
  const bubbleStyle = {
    maxWidth: '70%',
    padding: '10px 16px',
    borderRadius: '18px',
    marginBottom: '8px',
    position: 'relative',
    // Different styles based on sender
    background: isSentByMe 
      ? 'linear-gradient(135deg, #00dbde 0%, #fc00ff 100%)' 
      : 'rgba(16, 18, 27, 0.6)',
    backdropFilter: 'blur(10px)',
    color: '#fff',
    marginLeft: isSentByMe ? 'auto' : '0',
    marginRight: isSentByMe ? '0' : 'auto',
    borderTopRightRadius: isSentByMe ? '4px' : '18px',
    borderTopLeftRadius: isSentByMe ? '18px' : '4px',
    boxShadow: isSentByMe 
      ? '0 4px 15px rgba(252, 0, 255, 0.3)' 
      : '0 4px 15px rgba(0, 0, 0, 0.2)',
    border: isSentByMe 
      ? 'none' 
      : '1px solid rgba(255, 255, 255, 0.1)',
  };
  
  const messageContainer = {
    display: 'flex',
    flexDirection: isSentByMe ? 'row-reverse' : 'row',
    alignItems: 'flex-end',
    marginBottom: '16px',
  };
  
  // Determine avatar content - profile pic or initials with futuristic styling
  const avatarContent = (senderProfilePic, sender) => {
    if (senderProfilePic) {
      return (
        <Avatar 
          src={senderProfilePic} 
          sx={{ 
            width: 36, 
            height: 36, 
            mr: isSentByMe ? 0 : 1, 
            ml: isSentByMe ? 1 : 0,
            border: isSentByMe 
              ? '2px solid rgba(252, 0, 255, 0.7)' 
              : '2px solid rgba(0, 219, 222, 0.7)',
            boxShadow: isSentByMe 
              ? '0 0 10px rgba(252, 0, 255, 0.5)' 
              : '0 0 10px rgba(0, 219, 222, 0.5)'
          }} 
        />
      );
    } else {
      return (
        <Avatar 
          sx={{ 
            width: 36, 
            height: 36, 
            mr: isSentByMe ? 0 : 1, 
            ml: isSentByMe ? 1 : 0, 
            background: isSentByMe 
              ? 'linear-gradient(135deg, #fc00ff 0%, #00dbde 100%)' 
              : 'linear-gradient(135deg, #00dbde 0%, #fc00ff 100%)',
            boxShadow: isSentByMe 
              ? '0 0 10px rgba(252, 0, 255, 0.5)' 
              : '0 0 10px rgba(0, 219, 222, 0.5)'
          }}
        >
          {getInitials(sender)}
        </Avatar>
      );
    }
  };
  
  if (msg.type === 'file') {
    if (msg.fileType.startsWith('image/')) {
      return (
        <Box key={index} sx={messageContainer}>
          {!isSentByMe && avatarContent(msg.senderProfilePic, msg.sender)}
          <Box sx={bubbleStyle}>
            <Typography variant="caption" sx={{ display: 'block', mb: 1, color: 'rgba(255, 255, 255, 0.7)' }}>
              {msg.name}
            </Typography>
            <Box sx={{ 
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                pointerEvents: 'none'
              }
            }}>
              <img 
                src={msg.data} 
                alt={msg.name} 
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '200px', 
                  borderRadius: '8px',
                  display: 'block'
                }} 
              />
            </Box>
          </Box>
          {isSentByMe && avatarContent(msg.senderProfilePic, msg.sender)}
        </Box>
      );
    } else {
      return (
        <Box key={index} sx={messageContainer}>
          {!isSentByMe && avatarContent(msg.senderProfilePic, msg.sender)}
          <Box sx={bubbleStyle}>
            <Typography sx={{ 
              wordBreak: 'break-word',
              display: 'flex',
              alignItems: 'center'
            }}>
              <span style={{ 
                marginRight: '8px',
                fontSize: '1.2rem',
                filter: 'drop-shadow(0 0 2px rgba(255, 255, 255, 0.5))'
              }}>📎</span> 
              <a 
                href={msg.data} 
                download={msg.name} 
                style={{ 
                  color: '#fff',
                  textDecoration: 'none',
                  borderBottom: '1px dashed rgba(255, 255, 255, 0.5)'
                }}
              >
                {msg.name}
              </a>
            </Typography>
          </Box>
          {isSentByMe && avatarContent(msg.senderProfilePic, msg.sender)}
        </Box>
      );
    }
  } else {
    return (
      <Box key={index} sx={messageContainer}>
        {!isSentByMe && avatarContent(msg.senderProfilePic, msg.sender)}
        <Box sx={bubbleStyle}>
          <Typography sx={{ wordBreak: 'break-word' }}>{msg.content}</Typography>
        </Box>
        {isSentByMe && avatarContent(msg.senderProfilePic, msg.sender)}
      </Box>
    );
  }
};

  // If no token, show login screen
  if (!token) {
    return <Login setToken={setToken} />;
  }

  // If profile page is active, show profile
  if (showProfile) {
    return <Profile setToken={setToken} goBack={() => setShowProfile(false)} />;
  }

  return (
    <Box sx={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)', // Futuristic gradient background
      color: '#fff',
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    }}>
      {/* Header */}
      <Box className={styles.header}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton 
            onClick={handleLogout} 
            sx={{ 
              color: '#fff',
              background: 'rgba(255, 255, 255, 0.05)',
              '&:hover': {
                background: 'rgba(255, 255, 255, 0.1)',
              }
            }}
          >
            <LogoutIcon />
          </IconButton>
          <Typography variant="h6" className={styles.logoText}>
            NEXUS CHAT
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton 
            onClick={() => setShowProfile(true)} 
            sx={{ 
              color: '#fff', 
              mr: 1,
              background: 'rgba(255, 255, 255, 0.05)',
              '&:hover': {
                background: 'rgba(255, 255, 255, 0.1)',
              }
            }}
          >
            {profilePic ? (
              <Avatar 
                src={profilePic} 
                sx={{ 
                  width: 32, 
                  height: 32,
                  border: '2px solid rgba(0, 219, 222, 0.7)'
                }} 
              />
            ) : (
              <AccountCircleIcon />
            )}
          </IconButton>
          <IconButton 
            sx={{ 
              color: '#fc00ff',
              background: 'rgba(255, 255, 255, 0.05)',
              '&:hover': {
                background: 'rgba(255, 255, 255, 0.1)',
              }
            }}
          >
            <VideocamIcon />
          </IconButton>
        </Box>
      </Box>
      
      {/* Chat Area */}
      <Box sx={{ 
        flexGrow: 1, 
        overflow: 'auto', 
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        '&::-webkit-scrollbar': {
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'rgba(255, 255, 255, 0.05)',
        },
        '&::-webkit-scrollbar-thumb': {
          background: 'linear-gradient(180deg, #00dbde 0%, #fc00ff 100%)',
          borderRadius: '4px',
        },
      }}>
        {/* Date Divider */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          my: 3,
          color: '#aaa'
        }}>
          <Box sx={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(0,219,222,0) 0%, rgba(0,219,222,0.5) 50%, rgba(0,219,222,0) 100%)' }} />
          <Typography 
            variant="body2" 
            sx={{ 
              px: 2,
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}
          >
            Today
          </Typography>
          <Box sx={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(252,0,255,0) 0%, rgba(252,0,255,0.5) 50%, rgba(252,0,255,0) 100%)' }} />
        </Box>
        
        {messages.map((msg, index) => renderMessage(msg, index))}
        <div ref={messagesEndRef} />
      </Box>
      
      {/* Message Input */}
      <Box component="form" onSubmit={handleSubmit} className={styles.messageForm}>
        <IconButton 
          onClick={() => fileInputRef.current.click()}
          sx={{ 
            color: '#00dbde',
            background: 'rgba(255, 255, 255, 0.05)',
            '&:hover': {
              background: 'rgba(255, 255, 255, 0.1)',
            }
          }}
        >
          <AttachFileIcon />
        </IconButton>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        <TextField
          fullWidth
          value={message}
          onChange={(e) => {
            updateActivity(); // Update activity timestamp
            setMessage(e.target.value);
          }}
          placeholder="Type message"
          variant="standard"
          sx={{ 
            mx: 2,
            '& .MuiInputBase-root': {
              color: '#fff',
              '&::before': {
                borderBottom: 'none'
              }
            },
            '& .MuiInput-underline:before': {
              borderBottomColor: 'rgba(255, 255, 255, 0.2)'
            },
            '& .MuiInput-underline:hover:not(.Mui-disabled):before': {
              borderBottomColor: 'rgba(255, 255, 255, 0.3)'
            },
            '& .MuiInput-underline:after': {
              borderImage: 'linear-gradient(90deg, #00dbde 0%, #fc00ff 100%)',
              borderImageSlice: 1
            }
          }}
        />
        <IconButton 
          type="submit" 
          sx={{ 
            background: 'linear-gradient(90deg, #00dbde 0%, #fc00ff 100%)',
            color: '#fff',
            '&:hover': {
              opacity: 0.9,
            }
          }}
        >
          <SendIcon />
        </IconButton>
      </Box>
      
      {/* File Selection Indicator */}
      {file && (
        <Box sx={{ 
          p: 1, 
          bgcolor: 'rgba(0, 219, 222, 0.1)', 
          color: '#fff',
          fontSize: '0.75rem',
          borderTop: '1px solid rgba(0, 219, 222, 0.3)'
        }}>
          Selected file: {file.name}
        </Box>
      )}
    </Box>
  );
}

export default App;

// Fetch user profile from Supabase
const fetchUserProfile = async (username) => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('username, profile_pic')
    .eq('username', username)
    .single();
    
  if (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
  
  return data;
};
