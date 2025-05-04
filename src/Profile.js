import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Avatar,
  Paper,
  IconButton,
  Snackbar,
  Alert
} from '@mui/material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { supabase } from './supabaseClient';
import styles from './Profile.module.css'; // Import the CSS module

function Profile({ setToken, goBack }) {
  const [username, setUsername] = useState(localStorage.getItem('username') || '');
  const [profilePic, setProfilePic] = useState(localStorage.getItem('profilePic') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = React.useRef(null);

  useEffect(() => {
    // Fetch user profile data from Supabase
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Get user metadata
        const { username: storedUsername, profile_pic: storedProfilePic } = user.user_metadata || {};
        
        if (storedUsername) {
          setUsername(storedUsername);
          localStorage.setItem('username', storedUsername);
        }
        
        if (storedProfilePic) {
          setProfilePic(storedProfilePic);
          localStorage.setItem('profilePic', storedProfilePic);
        }
      }
    };
    
    fetchProfile();
  }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        setError('Image size must be less than 2MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfilePic(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const compressImage = (base64Str, maxWidth = 800) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ratio = maxWidth / img.width;
        canvas.width = maxWidth;
        canvas.height = img.height * ratio;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        resolve(compressedBase64);
      };
    });
  };
  
  // Modify the handleSubmit function
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Check if username changed and if it's unique
      const currentUsername = localStorage.getItem('username');
      if (username !== currentUsername) {
        const exists = await supabase
          .from('user_profiles')
          .select('username')
          .eq('username', username)
          .not('id', 'eq', (await supabase.auth.getUser()).data.user.id)
          .single();
          
        if (exists.data) {
          setError('Username already taken. Please choose another one.');
          setLoading(false);
          return;
        }
      }
      
      // Compress the image if it exists
      let compressedProfilePic = profilePic;
      if (profilePic && profilePic.startsWith('data:image')) {
        compressedProfilePic = await compressImage(profilePic);
      }
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('User not found');
      
      // Update user metadata in Supabase
      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          username,
          profile_pic: compressedProfilePic
        }
      });
      
      if (metadataError) throw metadataError;
      
      // Update user_profiles table
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          username: username,
          profile_pic: compressedProfilePic,
          updated_at: new Date()
        });
      
      if (profileError) throw profileError;
      
      // Store in localStorage for easy access
      localStorage.setItem('username', username);
      localStorage.setItem('profilePic', compressedProfilePic);
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Profile update error:', error);
      setError(error.message || 'Failed to update profile. Please try again.');
      
      // If it's an authentication error, redirect to login
      if (error.message.includes('session') || error.message.includes('auth')) {
        localStorage.removeItem('token');
        setToken(null);
      }
    } finally {
      setLoading(false);
    }
  };

  // Generate initials from username
  const getInitials = () => {
    if (!username) return '?';
    return username.substring(0, 2).toUpperCase();
  };

  return (
    <Box sx={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
      color: '#fff',
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    }}>
      {/* Header */}
      <Box className={styles.header}>
        <Box className={styles.headerLeft}>
          <IconButton 
            onClick={goBack} 
            sx={{ 
              color: '#fff',
              background: 'rgba(255, 255, 255, 0.05)',
              '&:hover': {
                background: 'rgba(255, 255, 255, 0.1)',
              }
            }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" className={styles.titleText}>
            PROFILE SETTINGS
          </Typography>
        </Box>
      </Box>
      
      {/* Profile Content */}
      <Box className={styles.profileContainer}>
        <Paper 
          elevation={0} 
          className={styles.profileCard}
        >
          {error && (
            <Alert 
              severity="error" 
              sx={{ 
                mb: 3, 
                backgroundColor: 'rgba(211, 47, 47, 0.1)', 
                color: '#ff8a80',
                border: '1px solid rgba(211, 47, 47, 0.3)',
                '& .MuiAlert-icon': {
                  color: '#ff8a80'
                }
              }}
            >
              {error}
            </Alert>
          )}
          
          <Box className={styles.avatarContainer}>
            <Avatar 
              src={profilePic} 
              className={styles.avatar}
            >
              {!profilePic && getInitials()}
            </Avatar>
            <IconButton 
              onClick={() => fileInputRef.current.click()}
              className={styles.cameraButton}
            >
              <PhotoCameraIcon />
            </IconButton>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            
            <Typography 
              variant="body2" 
              sx={{ 
                mt: 2, 
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '0.85rem',
                letterSpacing: '0.5px'
              }}
            >
              Upload a profile picture (max 2MB)
            </Typography>
          </Box>
          
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              label="Username"
              fullWidth
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              variant="outlined"
              sx={{ 
                mb: 4,
                '& .MuiOutlinedInput-root': {
                  color: '#fff',
                  '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                  '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                  '&.Mui-focused fieldset': { 
                    borderColor: 'transparent',
                    borderWidth: 2,
                    borderImage: 'linear-gradient(90deg, #00dbde 0%, #fc00ff 100%) 1'
                  }
                },
                '& .MuiInputLabel-root': {
                  color: 'rgba(255, 255, 255, 0.6)'
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: '#00dbde'
                },
                '& .MuiInputBase-input': {
                  padding: '14px 16px'
                }
              }}
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              className={styles.saveButton}
            >
              {loading ? 'Saving...' : 'Save Profile'}
            </Button>
          </Box>
        </Paper>
      </Box>
      
      <Snackbar 
        open={success} 
        autoHideDuration={3000} 
        onClose={() => setSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          severity="success" 
          sx={{ 
            width: '100%',
            backgroundColor: 'rgba(46, 125, 50, 0.1)',
            color: '#69f0ae',
            border: '1px solid rgba(46, 125, 50, 0.3)',
            '& .MuiAlert-icon': {
              color: '#69f0ae'
            }
          }}
        >
          Profile updated successfully!
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default Profile;