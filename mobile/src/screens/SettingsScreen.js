import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Text,
  List,
  Switch,
  Divider,
  Button,
  useTheme,
  Portal,
  Dialog,
  RadioButton,
  Surface,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNotifications } from '../contexts/NotificationContext';
import { format } from 'date-fns';

const SettingsScreen = ({ navigation, route }) => {
  const theme = useTheme();
  const { notificationSettings, toggleDailyReminder, scheduleDailyReminder } = useNotifications();
  
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showPrivacyDialog, setShowPrivacyDialog] = useState(false);
  const [selectedTime, setSelectedTime] = useState(new Date());
  
  // Parse time from settings
  React.useEffect(() => {
    if (notificationSettings.reminderTime) {
      const [hours, minutes] = notificationSettings.reminderTime.split(':');
      const time = new Date();
      time.setHours(parseInt(hours));
      time.setMinutes(parseInt(minutes));
      setSelectedTime(time);
    }
  }, [notificationSettings.reminderTime]);

  const handleTimeChange = (event, selectedDate) => {
    setShowTimePicker(false);
    if (selectedDate) {
      setSelectedTime(selectedDate);
      const timeString = format(selectedDate, 'HH:mm');
      scheduleDailyReminder(timeString);
    }
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear Local Data',
      'This will remove all cached data from your device. Your account and check-in history will remain safe on our servers.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear Data',
          style: 'destructive',
          onPress: () => {
            // Clear local cache
            Alert.alert('Success', 'Local data cleared successfully');
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            // In production, call API to delete account
            Alert.alert(
              'Account Deletion Requested',
              'Your account deletion has been scheduled. You will receive an email confirmation.',
              [{ text: 'OK' }]
            );
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Notifications Section */}
        <Surface style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          <List.Item
            title="Daily Check-in Reminder"
            description="Get reminded to complete your daily check-in"
            left={(props) => <List.Icon {...props} icon="bell-ring" />}
            right={() => (
              <Switch
                value={notificationSettings.dailyReminder}
                onValueChange={toggleDailyReminder}
                color={theme.colors.primary}
              />
            )}
          />
          
          {notificationSettings.dailyReminder && (
            <>
              <Divider />
              <List.Item
                title="Reminder Time"
                description={format(selectedTime, 'h:mm a')}
                left={(props) => <List.Icon {...props} icon="clock" />}
                right={() => <List.Icon icon="chevron-right" />}
                onPress={() => setShowTimePicker(true)}
              />
            </>
          )}
          
          <Divider />
          <List.Item
            title="Intervention Reminders"
            description="Get reminded to complete wellness activities"
            left={(props) => <List.Icon {...props} icon="meditation" />}
            right={() => (
              <Switch
                value={notificationSettings.interventionReminders}
                onValueChange={() => {}}
                color={theme.colors.primary}
              />
            )}
          />
          
          <Divider />
          <List.Item
            title="Crisis Support Alerts"
            description="Immediate notifications for crisis resources"
            left={(props) => <List.Icon {...props} icon="alert-circle" />}
            right={() => (
              <Switch
                value={true}
                onValueChange={() => {}}
                color={theme.colors.primary}
                disabled
              />
            )}
          />
        </Surface>

        {/* Privacy Section */}
        <Surface style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy & Data</Text>
          
          <List.Item
            title="Data Usage"
            description="How we use your data"
            left={(props) => <List.Icon {...props} icon="information" />}
            right={() => <List.Icon icon="chevron-right" />}
            onPress={() => setShowPrivacyDialog(true)}
          />
          
          <Divider />
          <List.Item
            title="Export My Data"
            description="Download all your check-ins and activity"
            left={(props) => <List.Icon {...props} icon="download" />}
            right={() => <List.Icon icon="chevron-right" />}
            onPress={() => {
              Alert.alert(
                'Export Data',
                'Your data export will be sent to your registered email address within 24 hours.',
                [{ text: 'OK' }]
              );
            }}
          />
          
          <Divider />
          <List.Item
            title="Clear Local Data"
            description="Remove cached data from this device"
            left={(props) => <List.Icon {...props} icon="delete-sweep" />}
            right={() => <List.Icon icon="chevron-right" />}
            onPress={handleClearData}
          />
        </Surface>

        {/* Account Section */}
        <Surface style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <List.Item
            title="Change Email"
            description="Update your login email"
            left={(props) => <List.Icon {...props} icon="email-edit" />}
            right={() => <List.Icon icon="chevron-right" />}
            onPress={() => {}}
          />
          
          <Divider />
          <List.Item
            title="Terms of Service"
            description="View our terms and conditions"
            left={(props) => <List.Icon {...props} icon="file-document" />}
            right={() => <List.Icon icon="chevron-right" />}
            onPress={() => {}}
          />
          
          <Divider />
          <List.Item
            title="Privacy Policy"
            description="View our privacy policy"
            left={(props) => <List.Icon {...props} icon="shield-lock" />}
            right={() => <List.Icon icon="chevron-right" />}
            onPress={() => {}}
          />
        </Surface>

        {/* Danger Zone */}
        <Surface style={[styles.section, styles.dangerSection]}>
          <Text style={[styles.sectionTitle, { color: '#DC2626' }]}>
            Danger Zone
          </Text>
          
          <Button
            mode="outlined"
            onPress={handleDeleteAccount}
            style={styles.deleteButton}
            labelStyle={{ color: '#DC2626' }}
            icon="delete-forever"
          >
            Delete Account
          </Button>
          
          <Text style={styles.deleteWarning}>
            This action cannot be undone. All your data will be permanently deleted.
          </Text>
        </Surface>
      </ScrollView>

      {/* Time Picker */}
      {showTimePicker && (
        <DateTimePicker
          value={selectedTime}
          mode="time"
          is24Hour={false}
          display="default"
          onChange={handleTimeChange}
        />
      )}

      {/* Privacy Dialog */}
      <Portal>
        <Dialog
          visible={showPrivacyDialog}
          onDismiss={() => setShowPrivacyDialog(false)}
        >
          <Dialog.Title>Data Usage</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogText}>
              MindCheck uses your data to:
            </Text>
            <Text style={styles.dialogBullet}>
              • Provide personalized wellness recommendations
            </Text>
            <Text style={styles.dialogBullet}>
              • Track your stress patterns over time
            </Text>
            <Text style={styles.dialogBullet}>
              • Generate anonymous company-wide insights
            </Text>
            <Text style={styles.dialogBullet}>
              • Detect crisis situations and provide support
            </Text>
            <Text style={[styles.dialogText, { marginTop: 16 }]}>
              Your data is encrypted and never sold to third parties. 
              Individual responses are only visible to you unless you explicitly 
              consent to share with your company admin.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowPrivacyDialog(false)}>
              Got It
            </Button>
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
    paddingVertical: 20,
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 12,
    elevation: 2,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  dangerSection: {
    borderColor: '#FEE2E2',
    borderWidth: 1,
  },
  deleteButton: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderColor: '#DC2626',
  },
  deleteWarning: {
    fontSize: 12,
    color: '#7F1D1D',
    paddingHorizontal: 16,
    paddingBottom: 16,
    textAlign: 'center',
  },
  dialogText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#374151',
  },
  dialogBullet: {
    fontSize: 16,
    lineHeight: 24,
    color: '#374151',
    marginLeft: 16,
    marginVertical: 4,
  },
});

export default SettingsScreen;
