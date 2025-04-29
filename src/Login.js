import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Container,
  Paper,
  Typography,
  Link,
  CircularProgress,
  Alert
} from '@mui/material';
import { supabase } from './supabaseClient';

function Login({ setToken }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isRegister, setIsRegister] = useState(false);
  
  // Function to create a valid email from username
  const createValidEmail = (username) => {
    // Remove spaces and special characters, convert to lowercase
    const sanitizedUsername = username.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    return `${sanitizedUsername}@example.com`;
  };

  // Function to check if string is a valid email
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    // Validate input
    if (!identifier.trim()) {
      setError('Email cannot be empty');
      setLoading(false);
      return;
    }
    
    try {
      // Determine if the identifier is an email or username
      const email = isValidEmail(identifier) ? identifier : createValidEmail(identifier);
      
      if (isRegister) {
        // Register new user
        const { data, error } = await supabase.auth.signUp({
          email: email,
          password,
          options: {
            data: {
              username: identifier, // Store original identifier in metadata
            }
          }
        });
        
        if (error) throw error;
        
        if (data?.user) {
          // Auto sign in after registration
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: email,
            password,
          });
          
          if (signInError) throw signInError;
          
          if (signInData?.session) {
            setToken(signInData.session.access_token);
            localStorage.setItem('token', signInData.session.access_token);
            localStorage.setItem('username', identifier);
          }
        }
      } else {
        // Login existing user
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email,
          password,
        });
        
        if (error) throw error;
        
        if (data?.session) {
          setToken(data.session.access_token);
          localStorage.setItem('token', data.session.access_token);
          localStorage.setItem('username', identifier);
        }
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: 2
      }}
    >
      <Paper
        elevation={3}
        sx={{
          width: '100%',
          maxWidth: 400,
          borderRadius: 2,
          overflow: 'hidden',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
        }}
      >
        <Box
          sx={{
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 'bold',
              mb: 4,
              color: '#333'
            }}
          >
            {isRegister ? 'Sign up' : 'Login'}
          </Typography>

          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleAuth} sx={{ width: '100%' }}>
            <TextField
              label="Email"
              type="text"
              fullWidth
              margin="normal"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              variant="standard"
              sx={{ mb: 2 }}
            />

            <TextField
              label="Password"
              type="password"
              fullWidth
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              variant="standard"
              sx={{ mb: 4 }}
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
                fontSize: '1rem',
                fontWeight: 'medium',
                mb: 2
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Login'}
            </Button>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
              <Link
                component="button"
                variant="body2"
                onClick={() => {}}
                sx={{ color: '#666', textDecoration: 'none' }}
              >
                Forgot Password?
              </Link>

              <Link
                component="button"
                variant="body2"
                onClick={() => setIsRegister(!isRegister)}
                sx={{ color: '#666', textDecoration: 'none' }}
              >
                {isRegister ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
              </Link>
            </Box>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}

export default Login;