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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Update user metadata in Supabase
      const { error } = await supabase.auth.updateUser({
        data: {
          username,
          profile_pic: profilePic
        }
      });
      
      if (error) throw error;
      
      // Store in localStorage for easy access
      localStorage.setItem('username', username);
      localStorage.setItem('profilePic', profilePic);
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      setError(error.message);
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
      bgcolor: '#212121', 
      color: '#fff'
    }}>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        p: 2, 
        borderBottom: '1px solid #333',
        bgcolor: '#212121'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton onClick={goBack} sx={{ color: '#fff' }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ ml: 2 }}>
            Profile
          </Typography>
        </Box>
      </Box>
      
      {/* Profile Content */}
      <Box sx={{ 
        flexGrow: 1, 
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        p: 3
      }}>
        <Paper 
          elevation={3} 
          sx={{ 
            width: '100%', 
            maxWidth: 500, 
            p: 4, 
            bgcolor: '#303030',
            borderRadius: 2
          }}
        >
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
          
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            mb: 4
          }}>
            <Box sx={{ position: 'relative', mb: 3 }}>
              <Avatar 
                src={profilePic} 
                sx={{ 
                  width: 120, 
                  height: 120, 
                  fontSize: '2.5rem',
                  bgcolor: profilePic ? 'transparent' : '#4285F4'
                }}
              >
                {!profilePic && getInitials()}
              </Avatar>
              <IconButton 
                onClick={() => fileInputRef.current.click()}
                sx={{ 
                  position: 'absolute', 
                  bottom: 0, 
                  right: 0, 
                  bgcolor: '#4285F4',
                  '&:hover': { bgcolor: '#3367d6' },
                  color: '#fff'
                }}
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
            </Box>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1, color: '#aaa' }}>
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
                mb: 3,
                '& .MuiOutlinedInput-root': {
                  color: '#fff',
                  '& fieldset': { borderColor: '#555' },
                  '&:hover fieldset': { borderColor: '#777' },
                  '&.Mui-focused fieldset': { borderColor: '#4285F4' }
                },
                '& .MuiInputLabel-root': {
                  color: '#aaa'
                }
              }}
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{ 
                py: 1.5,
                background: 'linear-gradient(90deg, #4776E6 0%, #8E54E9 100%)',
                borderRadius: 1,
                textTransform: 'none',
                fontSize: '1rem'
              }}
            >
              {loading ? 'Saving...' : 'Save Profile'}
            </Button>
          </Box>
        </Paper>
      </Box>
      
      <Snackbar open={success} autoHideDuration={3000} onClose={() => setSuccess(false)}>
        <Alert severity="success" sx={{ width: '100%' }}>
          Profile updated successfully!
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default Profile;