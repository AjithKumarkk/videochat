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
  Alert,
  Stepper,
  Step,
  StepLabel,
  IconButton,
  InputAdornment
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { supabase } from './supabaseClient';

function Login({ setToken }) {
  // Form states
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isRegister, setIsRegister] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);
  
  // Function to check if string is a valid email
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Handle login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Validate input
      if (!email.trim()) {
        setError('Email cannot be empty');
        return;
      }
      
      // Login existing user
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password,
      });
      
      if (error) throw error;
      
      if (data?.session) {
        setToken(data.session.access_token);
        localStorage.setItem('token', data.session.access_token);
        localStorage.setItem('email', email);
        
        // Get user metadata to retrieve username
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user?.user_metadata?.username) {
          localStorage.setItem('username', userData.user.user_metadata.username);
        }
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle registration steps
  const handleRegistrationStep = async (e) => {
    e.preventDefault();
    setError(null);
    
    // Step 1: Validate initial registration info
    if (activeStep === 0) {
      // Validate email
      if (!isValidEmail(email)) {
        setError('Please enter a valid email address');
        return;
      }
      
      // Validate username
      if (username.length < 3) {
        setError('Username must be at least 3 characters');
        return;
      }
      
      // Validate password
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
      
      // Validate password confirmation
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      
      setLoading(true);
      
      // Inside handleRegistrationStep, replace the existing registration code with:
      
      try {
        // Generate a username from email if not provided
        if (!username.trim()) {
          const baseUsername = generateUsernameFromEmail(email);
          username = await generateUniqueUsername(baseUsername);
          setUsername(username); // Update the state
        } else {
          // Check if the provided username is unique
          const exists = await checkUsernameExists(username);
          if (exists) {
            setError('Username already taken. Please choose another one.');
            setLoading(false);
            return;
          }
        }
        
        // Register the user
        const { data, error } = await supabase.auth.signUp({
          email: email,
          password: password,
          options: {
            data: {
              username: username,
            },
            emailRedirectTo: window.location.origin
          }
        });
        
        if (error) throw error;
        
        // Create entry in user_profiles table
        if (data?.user) {
          const { error: profileError } = await supabase
            .from('user_profiles')
            .insert([
              { 
                id: data.user.id,
                username: username,
                profile_pic: null
              }
            ]);
            
          if (profileError) console.error('Error creating profile:', profileError);
        }
        
        setVerificationSent(true);
        setActiveStep(1);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }
    // Step 2: Verify email with code (if using custom verification)
    else if (activeStep === 1) {
      // Note: Supabase handles email verification automatically
      // This step is for UI purposes to inform the user to check their email
      setActiveStep(2);
    }
  };

  // Toggle password visibility
  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Reset registration form
  const resetRegistration = () => {
    setActiveStep(0);
    setVerificationSent(false);
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
          maxWidth: 450,
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
              mb: 3,
              color: '#333'
            }}
          >
            {isRegister ? 'Create Account' : 'Welcome Back'}
          </Typography>

          {isRegister && (
            <Stepper activeStep={activeStep} sx={{ width: '100%', mb: 4 }}>
              <Step>
                <StepLabel>Account Info</StepLabel>
              </Step>
              <Step>
                <StepLabel>Verification</StepLabel>
              </Step>
              <Step>
                <StepLabel>Complete</StepLabel>
              </Step>
            </Stepper>
          )}

          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* LOGIN FORM */}
          {!isRegister && (
            <Box component="form" onSubmit={handleLogin} sx={{ width: '100%' }}>
              <TextField
                label="Email"
                type="email"
                fullWidth
                margin="normal"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                variant="outlined"
                sx={{ mb: 2 }}
              />

              <TextField
                label="Password"
                type={showPassword ? 'text' : 'password'}
                fullWidth
                margin="normal"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                variant="outlined"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={handleTogglePasswordVisibility}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 3 }}
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
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
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
                  onClick={() => setIsRegister(true)}
                  sx={{ color: '#666', textDecoration: 'none' }}
                >
                  Don't have an account? Sign up
                </Link>
              </Box>
            </Box>
          )}

          {/* REGISTRATION FORM - STEP 1: ACCOUNT INFO */}
          {isRegister && activeStep === 0 && (
            <Box component="form" onSubmit={handleRegistrationStep} sx={{ width: '100%' }}>
              <TextField
                label="Email"
                type="email"
                fullWidth
                margin="normal"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                variant="outlined"
                sx={{ mb: 2 }}
              />
              
              <TextField
                label="Username"
                type="text"
                fullWidth
                margin="normal"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                variant="outlined"
                sx={{ mb: 2 }}
              />

              <TextField
                label="Password"
                type={showPassword ? 'text' : 'password'}
                fullWidth
                margin="normal"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                variant="outlined"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={handleTogglePasswordVisibility}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 2 }}
              />
              
              <TextField
                label="Confirm Password"
                type={showPassword ? 'text' : 'password'}
                fullWidth
                margin="normal"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                variant="outlined"
                sx={{ mb: 3 }}
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
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Create Account'}
              </Button>

              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <Link
                  component="button"
                  variant="body2"
                  onClick={() => setIsRegister(false)}
                  sx={{ color: '#666', textDecoration: 'none' }}
                >
                  Already have an account? Sign in
                </Link>
              </Box>
            </Box>
          )}

          {/* REGISTRATION FORM - STEP 2: EMAIL VERIFICATION */}
          {isRegister && activeStep === 1 && (
            <Box sx={{ width: '100%', textAlign: 'center' }}>
              <Alert severity="success" sx={{ width: '100%', mb: 3 }}>
                Verification email sent! Please check your inbox.
              </Alert>
              
              <Typography variant="body1" sx={{ mb: 3 }}>
                We've sent a verification link to <strong>{email}</strong>. Please check your email and click the link to verify your account.
              </Typography>
              
              <Button
                variant="outlined"
                onClick={() => setActiveStep(2)}
                sx={{ mr: 2 }}
              >
                I've verified my email
              </Button>
              
              <Button
                variant="text"
                onClick={resetRegistration}
              >
                Start over
              </Button>
            </Box>
          )}

          {/* REGISTRATION FORM - STEP 3: COMPLETION */}
          {isRegister && activeStep === 2 && (
            <Box sx={{ width: '100%', textAlign: 'center' }}>
              <Alert severity="success" sx={{ width: '100%', mb: 3 }}>
                Account created successfully!
              </Alert>
              
              <Typography variant="body1" sx={{ mb: 3 }}>
                Your account has been created. You can now sign in with your email and password.
              </Typography>
              
              <Button
                variant="contained"
                onClick={() => setIsRegister(false)}
                sx={{
                  py: 1.5,
                  background: 'linear-gradient(90deg, #4776E6 0%, #8E54E9 100%)',
                  borderRadius: 1,
                  textTransform: 'none',
                  fontSize: '1rem',
                  fontWeight: 'medium',
                }}
              >
                Go to Sign In
              </Button>
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
}

export default Login;


// Add this function after isValidEmail
// Generate username from email
const generateUsernameFromEmail = (email) => {
  return email.split('@')[0].toLowerCase();
};

// Check if username exists
const checkUsernameExists = async (username) => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('username')
    .eq('username', username)
    .single();
    
  return data !== null;
};

// Generate a unique username
const generateUniqueUsername = async (baseUsername) => {
  let username = baseUsername;
  let exists = await checkUsernameExists(username);
  let counter = 1;
  
  // If username exists, append a number until we find a unique one
  while (exists) {
    username = `${baseUsername}${counter}`;
    exists = await checkUsernameExists(username);
    counter++;
  }
  
  return username;
};