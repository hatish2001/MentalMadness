import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Linking,
} from 'react-native';
import {
  Card,
  Text,
  Button,
  IconButton,
  Chip,
  Portal,
  Modal,
  useTheme,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const InterventionCard = ({ intervention, onComplete, showFeedback = true }) => {
  const theme = useTheme();
  const [showModal, setShowModal] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    // Animate card press
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowModal(true);
    });
  };

  const handleFeedback = (helpful) => {
    setFeedbackGiven(true);
    if (onComplete) {
      onComplete(helpful);
    }
    setTimeout(() => setShowModal(false), 500);
  };

  const getInterventionIcon = (type) => {
    const icons = {
      breathing: 'lungs',
      meditation: 'meditation',
      activity: 'run',
      journaling: 'pencil',
      social: 'account-group',
      break: 'coffee',
    };
    return icons[type] || 'heart';
  };

  const getInterventionColor = (type) => {
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

  const renderInterventionContent = () => {
    const { content, contentType } = intervention;

    switch (contentType) {
      case 'interactive':
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.contentTitle}>{content.title}</Text>
            {content.instructions?.map((instruction, index) => (
              <View key={index} style={styles.instructionItem}>
                <Text style={styles.instructionNumber}>{index + 1}</Text>
                <Text style={styles.instructionText}>{instruction}</Text>
              </View>
            ))}
            {content.action && (
              <Button
                mode="contained"
                onPress={() => handleAction(content.action)}
                style={styles.actionButton}
              >
                Start Activity
              </Button>
            )}
          </View>
        );

      case 'audio':
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.contentTitle}>{content.title}</Text>
            <MaterialCommunityIcons
              name="headphones"
              size={64}
              color={getInterventionColor(intervention.type)}
              style={styles.audioIcon}
            />
            <Text style={styles.audioText}>
              Tap to play guided audio
            </Text>
            {content.transcript && (
              <Text style={styles.transcriptText}>
                Preview: "{content.transcript.substring(0, 100)}..."
              </Text>
            )}
          </View>
        );

      case 'video':
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.contentTitle}>{content.title}</Text>
            <MaterialCommunityIcons
              name="play-circle"
              size={64}
              color={getInterventionColor(intervention.type)}
              style={styles.videoIcon}
            />
            {content.exercises?.map((exercise, index) => (
              <Chip
                key={index}
                mode="outlined"
                style={styles.exerciseChip}
                icon="checkbox-marked-circle"
              >
                {exercise}
              </Chip>
            ))}
          </View>
        );

      case 'text':
      default:
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.contentTitle}>{content.title}</Text>
            {content.instructions?.map((instruction, index) => (
              <Text key={index} style={styles.textInstruction}>
                • {instruction}
              </Text>
            ))}
            {content.suggestions?.map((suggestion, index) => (
              <Card key={index} style={styles.suggestionCard}>
                <Card.Content>
                  <Text>{suggestion}</Text>
                </Card.Content>
              </Card>
            ))}
          </View>
        );
    }
  };

  const handleAction = (action) => {
    switch (action) {
      case 'block_calendar':
        // In a real app, integrate with calendar API
        alert('Calendar blocking feature coming soon!');
        break;
      default:
        break;
    }
  };

  return (
    <>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Card style={styles.card} onPress={handlePress}>
          <Card.Content>
            <View style={styles.header}>
              <View style={styles.titleContainer}>
                <MaterialCommunityIcons
                  name={getInterventionIcon(intervention.type)}
                  size={24}
                  color={getInterventionColor(intervention.type)}
                  style={styles.icon}
                />
                <Text style={styles.title}>{intervention.name}</Text>
              </View>
              <Chip
                mode="flat"
                style={[
                  styles.durationChip,
                  { backgroundColor: getInterventionColor(intervention.type) + '20' },
                ]}
                textStyle={{ color: getInterventionColor(intervention.type) }}
              >
                {intervention.duration} min
              </Chip>
            </View>
            
            <Text style={styles.preview}>
              Tap to start this {intervention.type} activity
            </Text>
          </Card.Content>
        </Card>
      </Animated.View>

      <Portal>
        <Modal
          visible={showModal}
          onDismiss={() => setShowModal(false)}
          contentContainerStyle={styles.modal}
        >
          <View style={styles.modalHeader}>
            <IconButton
              icon="close"
              size={24}
              onPress={() => setShowModal(false)}
              style={styles.closeButton}
            />
          </View>

          {renderInterventionContent()}

          {showFeedback && !feedbackGiven && (
            <View style={styles.feedbackContainer}>
              <Text style={styles.feedbackText}>Was this helpful?</Text>
              <View style={styles.feedbackButtons}>
                <Button
                  mode="contained-tonal"
                  onPress={() => handleFeedback(false)}
                  style={styles.feedbackButton}
                  icon="thumb-down"
                >
                  Not Really
                </Button>
                <Button
                  mode="contained"
                  onPress={() => handleFeedback(true)}
                  style={styles.feedbackButton}
                  icon="thumb-up"
                >
                  Yes, Helpful
                </Button>
              </View>
            </View>
          )}

          {feedbackGiven && (
            <View style={styles.thankYouContainer}>
              <MaterialCommunityIcons
                name="check-circle"
                size={48}
                color={theme.colors.primary}
              />
              <Text style={styles.thankYouText}>Thanks for your feedback!</Text>
            </View>
          )}
        </Modal>
      </Portal>
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  durationChip: {
    height: 28,
  },
  preview: {
    fontSize: 14,
    color: '#6B7280',
  },
  modal: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 12,
    maxHeight: '80%',
  },
  modalHeader: {
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  closeButton: {
    margin: -10,
  },
  contentContainer: {
    paddingVertical: 10,
  },
  contentTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
    color: '#111827',
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  instructionNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#4F46E5',
    color: 'white',
    textAlign: 'center',
    lineHeight: 30,
    fontWeight: '600',
    marginRight: 12,
  },
  instructionText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    color: '#374151',
  },
  actionButton: {
    marginTop: 20,
    marginHorizontal: 40,
  },
  audioIcon: {
    alignSelf: 'center',
    marginVertical: 20,
  },
  audioText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#6B7280',
    marginBottom: 10,
  },
  transcriptText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 10,
  },
  videoIcon: {
    alignSelf: 'center',
    marginVertical: 20,
  },
  exerciseChip: {
    marginVertical: 4,
    marginHorizontal: 20,
  },
  textInstruction: {
    fontSize: 16,
    lineHeight: 24,
    color: '#374151',
    marginBottom: 12,
  },
  suggestionCard: {
    marginVertical: 6,
    backgroundColor: '#F9FAFB',
  },
  feedbackContainer: {
    marginTop: 30,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 20,
  },
  feedbackText: {
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 16,
    color: '#111827',
  },
  feedbackButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  feedbackButton: {
    flex: 0.45,
  },
  thankYouContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  thankYouText: {
    fontSize: 16,
    color: '#059669',
    marginTop: 8,
    fontWeight: '500',
  },
});

export default InterventionCard;
