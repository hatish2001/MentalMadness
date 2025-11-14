import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {
  Text,
  Card,
  Avatar,
  Button,
  List,
  Divider,
  Surface,
  useTheme,
  Switch,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';

const ProfileScreen = ({ navigation }) => {
  const theme = useTheme();
  const { user, logout, updateUserData } = useAuth();
  
  const handleLogout = async () => {
    await logout();
  };

  const getInitials = () => {
    if (!user) return '??';
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  };

  const handleToggleDataSharing = async (value) => {
    // In production, this would update the backend
    updateUserData({ dataSharingConsent: value });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <Card style={styles.profileCard}>
          <Card.Content>
            <View style={styles.profileHeader}>
              <Avatar.Text
                size={80}
                label={getInitials()}
                style={{ backgroundColor: theme.colors.primary }}
              />
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>
                  {user?.firstName} {user?.lastName}
                </Text>
                <Text style={styles.profileEmail}>{user?.email}</Text>
                <View style={styles.companyContainer}>
                  <MaterialCommunityIcons
                    name="domain"
                    size={16}
                    color="#6B7280"
                  />
                  <Text style={styles.companyName}>
                    {user?.company?.name}
                  </Text>
                </View>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Quick Stats */}
        <Text style={styles.sectionTitle}>Your Progress</Text>
        <View style={styles.statsGrid}>
          <Surface style={styles.statCard}>
            <MaterialCommunityIcons
              name="calendar-check"
              size={32}
              color="#10B981"
            />
            <Text style={styles.statValue}>21</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </Surface>
          <Surface style={styles.statCard}>
            <MaterialCommunityIcons
              name="chart-line"
              size={32}
              color="#3B82F6"
            />
            <Text style={styles.statValue}>5.2</Text>
            <Text style={styles.statLabel}>Avg Stress</Text>
          </Surface>
          <Surface style={styles.statCard}>
            <MaterialCommunityIcons
              name="heart"
              size={32}
              color="#EC4899"
            />
            <Text style={styles.statValue}>89%</Text>
            <Text style={styles.statLabel}>Completion</Text>
          </Surface>
        </View>

        {/* Settings Section */}
        <Text style={styles.sectionTitle}>Settings</Text>
        <Card style={styles.settingsCard}>
          <List.Item
            title="Notifications"
            description="Daily reminders and alerts"
            left={(props) => <List.Icon {...props} icon="bell" />}
            right={() => <List.Icon icon="chevron-right" />}
            onPress={() => navigation.navigate('Settings', { tab: 'notifications' })}
          />
          <Divider />
          <List.Item
            title="Data Sharing"
            description="Share anonymous data with your company"
            left={(props) => <List.Icon {...props} icon="share-variant" />}
            right={() => (
              <Switch
                value={user?.dataSharingConsent || false}
                onValueChange={handleToggleDataSharing}
                color={theme.colors.primary}
              />
            )}
          />
          <Divider />
          <List.Item
            title="Privacy & Security"
            description="Manage your data and privacy"
            left={(props) => <List.Icon {...props} icon="lock" />}
            right={() => <List.Icon icon="chevron-right" />}
            onPress={() => navigation.navigate('Settings', { tab: 'privacy' })}
          />
        </Card>

        {/* Support Section */}
        <Text style={styles.sectionTitle}>Support</Text>
        <Card style={styles.supportCard}>
          <List.Item
            title="Help Center"
            description="FAQs and guides"
            left={(props) => <List.Icon {...props} icon="help-circle" />}
            right={() => <List.Icon icon="chevron-right" />}
            onPress={() => {}}
          />
          <Divider />
          <List.Item
            title="Contact Support"
            description="Get help from our team"
            left={(props) => <List.Icon {...props} icon="email" />}
            right={() => <List.Icon icon="chevron-right" />}
            onPress={() => {}}
          />
          <Divider />
          <List.Item
            title="Crisis Resources"
            description="Immediate help and support"
            left={(props) => <List.Icon {...props} icon="phone-alert" color="#DC2626" />}
            right={() => <List.Icon icon="chevron-right" />}
            onPress={() => {}}
          />
        </Card>

        {/* Account Actions */}
        <Card style={styles.actionsCard}>
          <Card.Content>
            <Button
              mode="outlined"
              onPress={handleLogout}
              style={styles.logoutButton}
              icon="logout"
            >
              Sign Out
            </Button>
            <Text style={styles.versionText}>
              MindCheck v1.0.0
            </Text>
            <Text style={styles.memberSince}>
              Member since {user?.createdAt ? format(new Date(user.createdAt), 'MMM yyyy') : 'Unknown'}
            </Text>
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  profileCard: {
    marginBottom: 24,
    elevation: 3,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 20,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 8,
  },
  companyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  companyName: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    color: '#111827',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    borderRadius: 12,
    marginHorizontal: 4,
    elevation: 2,
    backgroundColor: '#FFFFFF',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  settingsCard: {
    marginBottom: 24,
    elevation: 2,
  },
  supportCard: {
    marginBottom: 24,
    elevation: 2,
  },
  actionsCard: {
    marginBottom: 40,
    elevation: 2,
  },
  logoutButton: {
    marginBottom: 16,
    borderColor: '#DC2626',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  memberSince: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9CA3AF',
  },
});

export default ProfileScreen;
