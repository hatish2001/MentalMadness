import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
  RefreshControl,
} from 'react-native';
import {
  Text,
  Card,
  Surface,
  Chip,
  useTheme,
  ActivityIndicator,
  IconButton,
  Divider,
  Button,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { LineChart } from 'react-native-chart-kit';
import { format, parseISO, startOfWeek, endOfWeek } from 'date-fns';
import { apiMethods } from '../api/client';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width: screenWidth } = Dimensions.get('window');

const HistoryScreen = ({ navigation }) => {
  const theme = useTheme();
  const [timeRange, setTimeRange] = useState('week'); // week, month, all
  const [refreshing, setRefreshing] = useState(false);

  // Fetch check-in history
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['checkInHistory', timeRange],
    queryFn: async () => {
      const limit = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 100;
      const response = await apiMethods.getCheckInHistory({ limit });
      return response.data;
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getStressColor = (level) => {
    if (level <= 3) return '#10B981';
    if (level <= 6) return '#F59E0B';
    return '#DC2626';
  };

  const getStressEmoji = (level) => {
    if (level <= 2) return '😌';
    if (level <= 4) return '😊';
    if (level <= 6) return '😐';
    if (level <= 8) return '😟';
    return '😰';
  };

  const getTriggerIcon = (trigger) => {
    const icons = {
      workload: 'briefcase',
      meetings: 'account-group',
      team_conflict: 'account-alert',
      unclear_goals: 'help-circle',
      personal: 'home-heart',
      other: 'dots-horizontal',
    };
    return icons[trigger] || 'help-circle';
  };

  // Prepare chart data
  const prepareChartData = () => {
    if (!data?.checkins || data.checkins.length === 0) {
      return null;
    }

    const checkins = [...data.checkins].reverse(); // Oldest to newest
    const labels = checkins.slice(-7).map(c => 
      format(parseISO(c.created_at), 'EEE')
    );
    const values = checkins.slice(-7).map(c => c.stress_level);

    return {
      labels,
      datasets: [{
        data: values,
        color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
        strokeWidth: 2,
      }],
    };
  };

  const chartData = prepareChartData();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading your history...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <MaterialCommunityIcons
            name="alert-circle"
            size={64}
            color={theme.colors.error}
          />
          <Text style={styles.errorText}>Failed to load history</Text>
          <Button mode="contained" onPress={() => refetch()}>
            Try Again
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <Surface style={styles.statCard}>
            <Text style={styles.statValue}>{data?.stats?.averageStress || 0}</Text>
            <Text style={styles.statLabel}>Avg Stress</Text>
          </Surface>
          <Surface style={styles.statCard}>
            <Text style={styles.statValue}>{data?.stats?.daysTracked || 0}</Text>
            <Text style={styles.statLabel}>Days Tracked</Text>
          </Surface>
          <Surface style={styles.statCard}>
            <Text style={styles.statValue}>{data?.stats?.currentStreak || 0}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </Surface>
        </View>

        {/* Time Range Selector */}
        <View style={styles.timeRangeContainer}>
          <Chip
            mode={timeRange === 'week' ? 'flat' : 'outlined'}
            onPress={() => setTimeRange('week')}
            style={styles.timeRangeChip}
          >
            Week
          </Chip>
          <Chip
            mode={timeRange === 'month' ? 'flat' : 'outlined'}
            onPress={() => setTimeRange('month')}
            style={styles.timeRangeChip}
          >
            Month
          </Chip>
          <Chip
            mode={timeRange === 'all' ? 'flat' : 'outlined'}
            onPress={() => setTimeRange('all')}
            style={styles.timeRangeChip}
          >
            All Time
          </Chip>
        </View>

        {/* Stress Trend Chart */}
        {chartData && (
          <Card style={styles.chartCard}>
            <Card.Content>
              <Text style={styles.chartTitle}>Stress Trend</Text>
              <LineChart
                data={chartData}
                width={screenWidth - 60}
                height={200}
                chartConfig={{
                  backgroundColor: '#ffffff',
                  backgroundGradientFrom: '#ffffff',
                  backgroundGradientTo: '#ffffff',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                  style: {
                    borderRadius: 8,
                  },
                  propsForDots: {
                    r: '6',
                    strokeWidth: '2',
                    stroke: '#4F46E5',
                  },
                }}
                bezier
                style={styles.chart}
              />
            </Card.Content>
          </Card>
        )}

        {/* Check-in History */}
        <Text style={styles.sectionTitle}>Recent Check-ins</Text>
        {data?.checkins?.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <MaterialCommunityIcons
                name="calendar-blank"
                size={64}
                color="#9CA3AF"
                style={styles.emptyIcon}
              />
              <Text style={styles.emptyText}>No check-ins yet</Text>
              <Text style={styles.emptySubtext}>
                Start your wellness journey by completing your first check-in
              </Text>
              <Button
                mode="contained"
                onPress={() => navigation.navigate('CheckIn')}
                style={styles.checkInButton}
              >
                Check In Now
              </Button>
            </Card.Content>
          </Card>
        ) : (
          data?.checkins?.map((checkin) => (
            <Card key={checkin.id} style={styles.historyCard}>
              <Card.Content>
                <View style={styles.historyHeader}>
                  <View style={styles.dateContainer}>
                    <Text style={styles.historyDate}>
                      {format(parseISO(checkin.created_at), 'MMM d')}
                    </Text>
                    <Text style={styles.historyTime}>
                      {format(parseISO(checkin.created_at), 'h:mm a')}
                    </Text>
                  </View>
                  <View style={styles.stressContainer}>
                    <Text style={styles.stressEmoji}>
                      {getStressEmoji(checkin.stress_level)}
                    </Text>
                    <Text 
                      style={[
                        styles.stressLevel,
                        { color: getStressColor(checkin.stress_level) }
                      ]}
                    >
                      {checkin.stress_level}/10
                    </Text>
                  </View>
                </View>
                
                <Divider style={styles.divider} />
                
                <View style={styles.historyDetails}>
                  <View style={styles.detailRow}>
                    <MaterialCommunityIcons
                      name={getTriggerIcon(checkin.stress_trigger)}
                      size={20}
                      color="#6B7280"
                    />
                    <Text style={styles.detailText}>
                      {checkin.stress_trigger.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Text>
                  </View>
                  
                  {checkin.intervention_shown && (
                    <View style={styles.detailRow}>
                      <MaterialCommunityIcons
                        name="meditation"
                        size={20}
                        color="#6B7280"
                      />
                      <Text style={styles.detailText}>
                        {checkin.intervention_name || checkin.intervention_shown}
                      </Text>
                      {checkin.intervention_clicked && (
                        <MaterialCommunityIcons
                          name="check-circle"
                          size={16}
                          color="#10B981"
                          style={styles.checkIcon}
                        />
                      )}
                    </View>
                  )}
                </View>
              </Card.Content>
            </Card>
          ))
        )}

        {/* Load More Button */}
        {data?.checkins?.length > 0 && data?.checkins?.length < data?.total && (
          <Button
            mode="outlined"
            onPress={() => {
              // Implement pagination
            }}
            style={styles.loadMoreButton}
          >
            Load More
          </Button>
        )}
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
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#DC2626',
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  timeRangeChip: {
    marginHorizontal: 4,
  },
  chartCard: {
    marginBottom: 24,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#111827',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    color: '#111827',
  },
  historyCard: {
    marginBottom: 12,
    elevation: 2,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateContainer: {
    flex: 1,
  },
  historyDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  historyTime: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  stressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stressEmoji: {
    fontSize: 32,
    marginRight: 8,
  },
  stressLevel: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  divider: {
    marginVertical: 12,
  },
  historyDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
    flex: 1,
  },
  checkIcon: {
    marginLeft: 8,
  },
  emptyCard: {
    marginTop: 40,
    elevation: 2,
  },
  emptyIcon: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
    color: '#111827',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    color: '#6B7280',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  checkInButton: {
    alignSelf: 'center',
    marginTop: 8,
  },
  loadMoreButton: {
    marginTop: 16,
    marginBottom: 32,
  },
});

export default HistoryScreen;
