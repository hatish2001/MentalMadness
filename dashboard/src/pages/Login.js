import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  Link,
  CircularProgress,
} from '@mui/material';
import { Email as EmailIcon, Key as KeyIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, requestMagicLink, verifyMagicLink, error } = useAuth();
  
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [step, setStep] = useState('email'); // 'email' or 'verify'
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Check for token in URL
  useEffect(() => {
    const urlToken = searchParams.get('token');
    if (urlToken) {
      setToken(urlToken);
      setStep('verify');
      handleVerifyToken(urlToken);
    }
  }, [searchParams]);

  // Redirect if already logged in
  useEffect(() => {
    if (user && user.isAdmin) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSendMagicLink = async (e) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setMessage('Please enter your email address');
      return;
    }

    setLoading(true);
    setMessage('');
    
    try {
      await requestMagicLink(email.toLowerCase().trim());
      setStep('verify');
    } catch (error) {
      console.error('Magic link request failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyToken = async (tokenToVerify = token) => {
    if (!tokenToVerify.trim()) {
      setMessage('Please enter the verification code from your email');
      return;
    }

    setLoading(true);
    setMessage('');
    
    try {
      await verifyMagicLink(tokenToVerify.trim());
      // Navigation handled by AuthContext
    } catch (error) {
      console.error('Token verification failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
          }}
        >
          {/* Logo/Header */}
          <Box sx={{ mb: 3, textAlign: 'center' }}>
            <Typography component="h1" variant="h4" color="primary" fontWeight="bold">
              MindCheck
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Admin Dashboard
            </Typography>
          </Box>

          {/* Error/Message Display */}
          {(error || message) && (
            <Alert severity={error ? 'error' : 'info'} sx={{ width: '100%', mb: 2 }}>
              {error || message}
            </Alert>
          )}

          {step === 'email' ? (
            // Email Step
            <Box component="form" onSubmit={handleSendMagicLink} sx={{ width: '100%' }}>
              <Typography component="h2" variant="h5" sx={{ mb: 3 }}>
                Sign In
              </Typography>
              
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Admin Email Address"
                name="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                InputProps={{
                  startAdornment: <EmailIcon color="action" sx={{ mr: 1 }} />,
                }}
              />
              
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : null}
              >
                {loading ? 'Sending...' : 'Send Magic Link'}
              </Button>
              
              <Typography variant="body2" color="text.secondary" align="center">
                We'll send a secure login link to your email
              </Typography>
            </Box>
          ) : (
            // Verification Step
            <Box sx={{ width: '100%' }}>
              <Typography component="h2" variant="h5" sx={{ mb: 3 }}>
                Check Your Email
              </Typography>
              
              <Alert severity="success" sx={{ mb: 3 }}>
                We've sent a magic link to: <strong>{email}</strong>
              </Alert>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Click the link in the email to sign in, or enter the verification code below:
              </Typography>
              
              <TextField
                margin="normal"
                required
                fullWidth
                id="token"
                label="Verification Code"
                name="token"
                autoFocus
                value={token}
                onChange={(e) => setToken(e.target.value)}
                disabled={loading}
                InputProps={{
                  startAdornment: <KeyIcon color="action" sx={{ mr: 1 }} />,
                }}
              />
              
              <Button
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                onClick={() => handleVerifyToken()}
                disabled={loading || !token}
                startIcon={loading ? <CircularProgress size={20} /> : null}
              >
                {loading ? 'Verifying...' : 'Verify & Sign In'}
              </Button>
              
              <Button
                fullWidth
                variant="text"
                onClick={() => {
                  setStep('email');
                  setToken('');
                  setMessage('');
                }}
                disabled={loading}
              >
                Use Different Email
              </Button>
            </Box>
          )}

          {/* Footer */}
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Only authorized administrators can access this dashboard.
            </Typography>
            <Box sx={{ mt: 1 }}>
              <Link href="#" variant="caption" sx={{ mx: 1 }}>
                Help
              </Link>
              <Link href="#" variant="caption" sx={{ mx: 1 }}>
                Privacy
              </Link>
              <Link href="#" variant="caption" sx={{ mx: 1 }}>
                Terms
              </Link>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;
