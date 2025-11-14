import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import {
  Text,
  Button,
  Surface,
  RadioButton,
  useTheme,
  Portal,
  Dialog,
  Paragraph,
  IconButton,
  Card,
  Chip,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiMethods } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import InterventionCard from '../components/InterventionCard';

const { width: screenWidth } = Dimensions.get('window');

const STRESS_TRIGGERS = [
  { value: 'workload', label: 'Workload', icon: 'briefcase' },
  { value: 'meetings', label: 'Meetings', icon: 'account-group' },
  { value: 'team_conflict', label: 'Team Conflict', icon: 'account-alert' },
  { value: 'unclear_goals', label: 'Unclear Goals', icon: 'help-circle' },
  { value: 'personal', label: 'Personal', icon: 'home-heart' },
  { value: 'other', label: 'Other', icon: 'dots-horizontal' },
];

const PREVIOUS_HELPERS = [
  { value: 'meditation', label: 'Meditation', icon: 'meditation' },
  { value: 'exercise', label: 'Exercise', icon: 'run' },
  { value: 'talk', label: 'Talk to Someone', icon: 'chat' },
  { value: 'break', label: 'Take a Break', icon: 'coffee' },
  { value: 'nothing', label: 'Nothing', icon: 'close-circle' },
];

const CheckInScreen = ({ navigation }) => {
  const theme = useTheme();
  const { user } = useAuth();
  const scrollViewRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  
  const [step, setStep] = useState(0);
  const [stressLevel, setStressLevel] = useState(5);
  const [stressTrigger, setStressTrigger] = useState('');
  const [previousHelper, setPreviousHelper] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [intervention, setIntervention] = useState(null);
  
  // Check if user already checked in today
  const { data: hasCheckedIn } = useQuery({
    queryKey: ['hasCheckedInToday'],
    queryFn: async () => {
      const response = await apiMethods.getCheckInHistory({ limit: 1 });
      const today = new Date().toDateString();
      const lastCheckIn = response.data.checkins[0];
      return lastCheckIn && new Date(lastCheckIn.created_at).toDateString() === today;
    },
  });

  // Submit check-in mutation
  const submitCheckIn = useMutation({
    mutationFn: (data) => apiMethods.createCheckIn(data),
    onSuccess: (response) => {
      setIntervention(response.data.intervention);
      setStep(3); // Show intervention
    },
    onError: (error) => {
      console.error('Check-in failed:', error);
      // Handle error with snackbar or alert
    },
  });

  const handleNext = () => {
    if (step === 0 && !stressTrigger) {
      setShowDialog(true);
      return;
    }
    
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setStep(step + 1);
      scrollViewRef.current?.scrollTo({ x: 0, y: 0, animated: true });
    });

    if (step === 2) {
      // Submit check-in
      submitCheckIn.mutate({
        stress_level: stressLevel,
        stress_trigger: stressTrigger,
        previous_helper: previousHelper || null,
      });
    }
  };

  const handleBack = () => {
    if (step > 0) {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setStep(step - 1);
      });
    }
  };

  const getStressEmoji = (level) => {
    if (level <= 2) return '😌';
    if (level <= 4) return '😊';
    if (level <= 6) return '😐';
    if (level <= 8) return '😟';
    return '😰';
  };

  const getStressColor = (level) => {
    if (level <= 3) return '#10B981';
    if (level <= 6) return '#F59E0B';
    return '#DC2626';
  };

  if (hasCheckedIn && step < 3) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.emoji}>✅</Text>
          <Text style={styles.completedTitle}>Already Checked In Today!</Text>
          <Paragraph style={styles.completedText}>
            Great job staying consistent with your daily check-ins.
            Come back tomorrow to check in again.
          </Paragraph>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('History')}
            style={styles.viewHistoryButton}
          >
            View Your History
          </Button>
          <Button
            mode="text"
            onPress={() => navigation.navigate('Interventions')}
          >
            Explore Wellness Activities
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.greeting}>Hi {user?.firstName}! 👋</Text>
            <Text style={styles.question}>How stressed are you feeling today?</Text>
            
            <View style={styles.sliderContainer}>
              <Text style={[styles.stressEmoji, { fontSize: 60 }]}>
                {getStressEmoji(stressLevel)}
              </Text>
              
              <Text style={[styles.stressNumber, { color: getStressColor(stressLevel) }]}>
                {stressLevel}
              </Text>
              
              <Slider
                style={styles.slider}
                value={stressLevel}
                onValueChange={setStressLevel}
                minimumValue={1}
                maximumValue={10}
                step={1}
                minimumTrackTintColor={getStressColor(stressLevel)}
                maximumTrackTintColor="#E5E7EB"
                thumbTintColor={getStressColor(stressLevel)}
              />
              
              <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabel}>1</Text>
                <Text style={styles.sliderLabel}>Not stressed</Text>
                <Text style={styles.sliderLabel}>Very stressed</Text>
                <Text style={styles.sliderLabel}>10</Text>
              </View>
            </View>

            <View style={styles.stressGuide}>
              <Text style={styles.guideTitle}>Quick Guide:</Text>
              <Text style={styles.guideText}>1-3: Calm and relaxed</Text>
              <Text style={styles.guideText}>4-6: Some stress, manageable</Text>
              <Text style={styles.guideText}>7-10: High stress, need support</Text>
            </View>
          </View>
        );

      case 1:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.question}>What's causing the most stress today?</Text>
            
            <View style={styles.triggersGrid}>
              {STRESS_TRIGGERS.map((trigger) => (
                <Surface
                  key={trigger.value}
                  style={[
                    styles.triggerCard,
                    stressTrigger === trigger.value && styles.triggerCardSelected,
                  ]}
                >
                  <IconButton
                    icon={trigger.icon}
                    size={32}
                    iconColor={
                      stressTrigger === trigger.value
                        ? theme.colors.primary
                        : '#6B7280'
                    }
                    onPress={() => setStressTrigger(trigger.value)}
                  />
                  <Text
                    style={[
                      styles.triggerLabel,
                      stressTrigger === trigger.value && styles.triggerLabelSelected,
                    ]}
                  >
                    {trigger.label}
                  </Text>
                </Surface>
              ))}
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.question}>
              {stressLevel > 3
                ? 'What helped with stress yesterday?'
                : 'What contributed to your good mood?'}
            </Text>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.helpersContainer}>
                {PREVIOUS_HELPERS.map((helper) => (
                  <Chip
                    key={helper.value}
                    mode={previousHelper === helper.value ? 'flat' : 'outlined'}
                    selected={previousHelper === helper.value}
                    onPress={() => setPreviousHelper(helper.value)}
                    icon={helper.icon}
                    style={styles.helperChip}
                  >
                    {helper.label}
                  </Chip>
                ))}
              </View>
            </ScrollView>
            
            <Text style={styles.optionalText}>
              This is optional but helps us personalize your experience
            </Text>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.completedTitle}>Check-in Complete! 🎉</Text>
            {intervention ? (
              <>
                <Text style={styles.interventionTitle}>
                  Here's something that might help today:
                </Text>
                <InterventionCard
                  intervention={intervention}
                  onComplete={(helpful) => {
                    // Submit feedback
                    apiMethods.submitFeedback(intervention.id, { helpful });
                    navigation.navigate('History');
                  }}
                />
              </>
            ) : (
              <>
                <Text style={styles.completedText}>
                  Thank you for checking in today. Keep up the great work!
                </Text>
                <Button
                  mode="contained"
                  onPress={() => navigation.navigate('History')}
                  style={styles.button}
                >
                  View History
                </Button>
              </>
            )}
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {step < 3 && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${((step + 1) / 3) * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>Step {step + 1} of 3</Text>
          </View>
        )}

        <Animated.View style={{ opacity: fadeAnim }}>
          {renderStep()}
        </Animated.View>

        {step < 3 && (
          <View style={styles.buttonContainer}>
            {step > 0 && (
              <Button
                mode="outlined"
                onPress={handleBack}
                style={[styles.button, styles.backButton]}
                disabled={submitCheckIn.isLoading}
              >
                Back
              </Button>
            )}
            <Button
              mode="contained"
              onPress={handleNext}
              style={[styles.button, styles.nextButton]}
              loading={submitCheckIn.isLoading}
              disabled={submitCheckIn.isLoading}
            >
              {step === 2 ? 'Submit' : 'Next'}
            </Button>
          </View>
        )}
      </ScrollView>

      <Portal>
        <Dialog visible={showDialog} onDismiss={() => setShowDialog(false)}>
          <Dialog.Title>Select a Stress Trigger</Dialog.Title>
          <Dialog.Content>
            <Paragraph>
              Please select what's causing stress today to continue.
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDialog(false)}>OK</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  progressContainer: {
    marginBottom: 30,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4F46E5',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  stepContainer: {
    flex: 1,
    minHeight: 400,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
    color: '#111827',
  },
  question: {
    fontSize: 20,
    fontWeight: '500',
    marginBottom: 30,
    color: '#111827',
  },
  sliderContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  stressEmoji: {
    fontSize: 60,
    marginBottom: 10,
  },
  stressNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  slider: {
    width: screenWidth - 60,
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: screenWidth - 60,
    marginTop: 10,
  },
  sliderLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  stressGuide: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 8,
    marginTop: 30,
  },
  guideTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#374151',
  },
  guideText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  triggersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  triggerCard: {
    width: (screenWidth - 50) / 3,
    height: 100,
    marginBottom: 10,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    elevation: 2,
  },
  triggerCardSelected: {
    borderWidth: 2,
    borderColor: '#4F46E5',
  },
  triggerLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  triggerLabelSelected: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  helpersContainer: {
    flexDirection: 'row',
    paddingVertical: 10,
  },
  helperChip: {
    marginRight: 8,
  },
  optionalText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
  },
  button: {
    flex: 1,
  },
  backButton: {
    marginRight: 10,
  },
  nextButton: {
    marginLeft: 10,
  },
  completedTitle: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
    color: '#111827',
  },
  completedText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#6B7280',
    marginBottom: 30,
    lineHeight: 24,
  },
  interventionTitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
    color: '#374151',
  },
  viewHistoryButton: {
    marginBottom: 16,
    paddingHorizontal: 32,
  },
  emoji: {
    fontSize: 80,
    marginBottom: 20,
  },
});

export default CheckInScreen;
