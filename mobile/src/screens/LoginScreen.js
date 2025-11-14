import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Linking,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Surface,
  Snackbar,
  Headline,
  Paragraph,
  useTheme,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';

const LoginScreen = ({ navigation }) => {
  const theme = useTheme();
  const { requestMagicLink, verifyMagicLink, error } = useAuth();
  
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [step, setStep] = useState('email'); // 'email' or 'verify'
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showSnackbar, setShowSnackbar] = useState(false);

  const handleSendMagicLink = async () => {
    if (!email.trim()) {
      setMessage('Please enter your email address');
      setShowSnackbar(true);
      return;
    }

    setLoading(true);
    try {
      const response = await requestMagicLink(email.toLowerCase().trim());
      setMessage(response.message);
      setShowSnackbar(true);
      setStep('verify');
    } catch (error) {
      setMessage(error.response?.data?.error?.message || 'Failed to send login link');
      setShowSnackbar(true);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyToken = async () => {
    if (!token.trim()) {
      setMessage('Please check your email for the verification link');
      setShowSnackbar(true);
      return;
    }

    setLoading(true);
    try {
      await verifyMagicLink(token.trim());
      // Navigation will be handled automatically by AuthProvider
    } catch (error) {
      setMessage(error.response?.data?.error?.message || 'Invalid or expired token');
      setShowSnackbar(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDeepLink = (url) => {
    // Extract token from deep link URL
    const match = url.match(/token=([^&]+)/);
    if (match && match[1]) {
      setToken(match[1]);
      setStep('verify');
      handleVerifyToken();
    }
  };

  // Listen for deep links
  React.useEffect(() => {
    // Get initial URL
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    // Listen for URL changes
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    return () => subscription.remove();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Text style={[styles.logo, { color: theme.colors.primary }]}>
                MindCheck
              </Text>
            </View>
            <Headline style={styles.headline}>Welcome Back</Headline>
            <Paragraph style={styles.subtitle}>
              Your mental wellness journey continues
            </Paragraph>
          </View>

          <Surface style={styles.formContainer}>
            {step === 'email' ? (
              <>
                <Text style={styles.label}>Email Address</Text>
                <TextInput
                  mode="outlined"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="your.email@company.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  style={styles.input}
                  disabled={loading}
                  left={<TextInput.Icon icon="email" />}
                />
                <Button
                  mode="contained"
                  onPress={handleSendMagicLink}
                  loading={loading}
                  style={styles.button}
                  contentStyle={styles.buttonContent}
                >
                  Send Magic Link
                </Button>
                <Text style={styles.helpText}>
                  We'll send you a secure login link to your email
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.verifyTitle}>Check your email!</Text>
                <Text style={styles.verifyText}>
                  We've sent a magic link to:
                </Text>
                <Text style={styles.emailText}>{email}</Text>
                
                <View style={styles.divider} />
                
                <Text style={styles.label}>Or enter code manually</Text>
                <TextInput
                  mode="outlined"
                  value={token}
                  onChangeText={setToken}
                  placeholder="Enter verification code"
                  autoCapitalize="none"
                  style={styles.input}
                  disabled={loading}
                  left={<TextInput.Icon icon="key" />}
                />
                <Button
                  mode="contained"
                  onPress={handleVerifyToken}
                  loading={loading}
                  style={styles.button}
                  contentStyle={styles.buttonContent}
                >
                  Verify & Sign In
                </Button>
                <Button
                  mode="text"
                  onPress={() => {
                    setStep('email');
                    setToken('');
                  }}
                  style={styles.backButton}
                >
                  Use different email
                </Button>
              </>
            )}
          </Surface>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              By signing in, you agree to MindCheck's
            </Text>
            <View style={styles.links}>
              <Button
                mode="text"
                compact
                onPress={() => Linking.openURL('https://mindcheck.com/terms')}
              >
                Terms of Service
              </Button>
              <Text style={styles.footerText}> and </Text>
              <Button
                mode="text"
                compact
                onPress={() => Linking.openURL('https://mindcheck.com/privacy')}
              >
                Privacy Policy
              </Button>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Snackbar
        visible={showSnackbar}
        onDismiss={() => setShowSnackbar(false)}
        duration={4000}
        style={styles.snackbar}
      >
        {message}
      </Snackbar>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  headline: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  formContainer: {
    padding: 24,
    borderRadius: 12,
    elevation: 2,
    backgroundColor: '#FFFFFF',
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
    marginBottom: 16,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  helpText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  verifyTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  verifyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 4,
  },
  emailText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 20,
  },
  backButton: {
    marginTop: 8,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
  },
  links: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  snackbar: {
    backgroundColor: '#374151',
  },
});

export default LoginScreen;
