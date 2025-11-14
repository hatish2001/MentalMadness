import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  FlatList,
  RefreshControl,
} from 'react-native';
import {
  Text,
  Card,
  Chip,
  Searchbar,
  FAB,
  useTheme,
  ActivityIndicator,
  Portal,
  Modal,
  Button,
  RadioButton,
  Surface,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { apiMethods } from '../api/client';
import InterventionCard from '../components/InterventionCard';

const INTERVENTION_TYPES = [
  { value: 'all', label: 'All', icon: 'all-inclusive' },
  { value: 'breathing', label: 'Breathing', icon: 'lungs' },
  { value: 'meditation', label: 'Meditation', icon: 'meditation' },
  { value: 'activity', label: 'Activity', icon: 'run' },
  { value: 'journaling', label: 'Journaling', icon: 'pencil' },
  { value: 'social', label: 'Social', icon: 'account-group' },
  { value: 'break', label: 'Break', icon: 'coffee' },
];

const InterventionScreen = ({ navigation }) => {
  const theme = useTheme();
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showRecommendModal, setShowRecommendModal] = useState(false);
  const [currentStress, setCurrentStress] = useState('5');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch interventions
  const { data: interventionsData, isLoading, error, refetch } = useQuery({
    queryKey: ['interventions', selectedType],
    queryFn: async () => {
      const params = selectedType === 'all' ? {} : { type: selectedType };
      const response = await apiMethods.getInterventions(params);
      return response.data.interventions;
    },
  });

  // Fetch personalized recommendations
  const { data: recommendations, refetch: refetchRecommendations } = useQuery({
    queryKey: ['recommendations', currentStress],
    queryFn: async () => {
      const response = await apiMethods.recommendInterventions({
        stressLevel: parseInt(currentStress),
      });
      return response.data.recommendations;
    },
    enabled: false, // Only fetch when modal opens
  });

  // Fetch intervention history
  const { data: historyData } = useQuery({
    queryKey: ['interventionHistory'],
    queryFn: async () => {
      const response = await apiMethods.getInterventionHistory({ limit: 5 });
      return response.data;
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleOpenRecommendations = () => {
    setShowRecommendModal(true);
    refetchRecommendations();
  };

  const filteredInterventions = interventionsData?.filter(intervention =>
    intervention.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const getTypeColor = (type) => {
    const colors = {
      breathing: '#3B82F6',
      meditation: '#8B5CF6',
      activity: '#10B981',
      journaling: '#F59E0B',
      social: '#EC4899',
      break: '#14B8A6',
    };
    return colors[type] || theme.colors.primary;
  };

  const renderInterventionItem = ({ item }) => (
    <InterventionCard
      intervention={item}
      onComplete={(helpful) => {
        apiMethods.submitFeedback(item.id, { helpful });
        refetch();
      }}
      showFeedback={true}
    />
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading wellness activities...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Searchbar
          placeholder="Search activities..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          icon="magnify"
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.typeSelector}
        >
          {INTERVENTION_TYPES.map((type) => (
            <Chip
              key={type.value}
              mode={selectedType === type.value ? 'flat' : 'outlined'}
              selected={selectedType === type.value}
              onPress={() => setSelectedType(type.value)}
              style={[
                styles.typeChip,
                selectedType === type.value && {
                  backgroundColor: getTypeColor(type.value) + '20',
                },
              ]}
              textStyle={{
                color: selectedType === type.value 
                  ? getTypeColor(type.value)
                  : '#6B7280',
              }}
              icon={type.icon}
            >
              {type.label}
            </Chip>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredInterventions}
        keyExtractor={(item) => item.id}
        renderItem={renderInterventionItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={() => (
          <>
            {/* Recent Activity Summary */}
            {historyData && historyData.stats.totalInterventions > 0 && (
              <Card style={styles.summaryCard}>
                <Card.Content>
                  <View style={styles.summaryHeader}>
                    <MaterialCommunityIcons
                      name="chart-donut"
                      size={24}
                      color={theme.colors.primary}
                    />
                    <Text style={styles.summaryTitle}>Your Activity</Text>
                  </View>
                  <View style={styles.summaryStats}>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>
                        {historyData.stats.totalInterventions}
                      </Text>
                      <Text style={styles.statLabel}>Activities Done</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>
                        {historyData.stats.helpfulRate}%
                      </Text>
                      <Text style={styles.statLabel}>Found Helpful</Text>
                    </View>
                  </View>
                </Card.Content>
              </Card>
            )}

            {filteredInterventions.length > 0 && (
              <Text style={styles.sectionTitle}>
                {selectedType === 'all' ? 'All Activities' : `${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} Activities`}
              </Text>
            )}
          </>
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="magnify-close"
              size={64}
              color="#9CA3AF"
            />
            <Text style={styles.emptyText}>No activities found</Text>
            <Text style={styles.emptySubtext}>
              Try a different search or category
            </Text>
          </View>
        )}
      />

      <FAB
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        icon="robot-happy"
        label="Get Recommendations"
        onPress={handleOpenRecommendations}
        extended
      />

      <Portal>
        <Modal
          visible={showRecommendModal}
          onDismiss={() => setShowRecommendModal(false)}
          contentContainerStyle={styles.modal}
        >
          <Text style={styles.modalTitle}>
            Get Personalized Recommendations
          </Text>
          
          <Text style={styles.modalLabel}>
            How are you feeling right now?
          </Text>
          
          <RadioButton.Group
            onValueChange={value => setCurrentStress(value)}
            value={currentStress}
          >
            <Surface style={styles.radioContainer}>
              <RadioButton.Item
                label="Great (1-3)"
                value="2"
                labelStyle={styles.radioLabel}
              />
              <RadioButton.Item
                label="Okay (4-6)"
                value="5"
                labelStyle={styles.radioLabel}
              />
              <RadioButton.Item
                label="Stressed (7-10)"
                value="8"
                labelStyle={styles.radioLabel}
              />
            </Surface>
          </RadioButton.Group>

          <Button
            mode="contained"
            onPress={() => {
              refetchRecommendations();
            }}
            style={styles.modalButton}
          >
            Get Recommendations
          </Button>

          {recommendations && (
            <View style={styles.recommendationsContainer}>
              <Text style={styles.recommendationsTitle}>
                Recommended for You:
              </Text>
              {recommendations.map((rec) => (
                <Card key={rec.id} style={styles.recommendationCard}>
                  <Card.Content>
                    <View style={styles.recHeader}>
                      <MaterialCommunityIcons
                        name="star"
                        size={20}
                        color="#F59E0B"
                      />
                      <Text style={styles.recName}>{rec.name}</Text>
                    </View>
                    <Text style={styles.recReason}>{rec.reason}</Text>
                    <Button
                      mode="text"
                      onPress={() => {
                        setShowRecommendModal(false);
                        // Navigate to specific intervention
                      }}
                      compact
                    >
                      Try Now
                    </Button>
                  </Card.Content>
                </Card>
              ))}
            </View>
          )}

          <Button
            mode="text"
            onPress={() => setShowRecommendModal(false)}
            style={styles.modalCloseButton}
          >
            Close
          </Button>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  searchBar: {
    marginBottom: 16,
    elevation: 2,
  },
  typeSelector: {
    marginBottom: 16,
  },
  typeChip: {
    marginRight: 8,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  summaryCard: {
    marginBottom: 20,
    elevation: 3,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
    color: '#111827',
  },
  summaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4F46E5',
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    color: '#111827',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    color: '#111827',
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    color: '#6B7280',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  modal: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 12,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
    color: '#111827',
  },
  modalLabel: {
    fontSize: 16,
    marginBottom: 16,
    color: '#374151',
  },
  radioContainer: {
    marginBottom: 20,
    padding: 8,
    borderRadius: 8,
  },
  radioLabel: {
    fontSize: 16,
  },
  modalButton: {
    marginVertical: 16,
  },
  recommendationsContainer: {
    marginTop: 20,
  },
  recommendationsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#111827',
  },
  recommendationCard: {
    marginBottom: 12,
    elevation: 2,
  },
  recHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  recName: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    color: '#111827',
  },
  recReason: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  modalCloseButton: {
    marginTop: 8,
  },
});

export default InterventionScreen;
