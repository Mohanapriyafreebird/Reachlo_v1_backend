import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import COLORS from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../constants/typography';
import apiService from '../services/apiService';
import Toast from './Toast';

import { useRoleTheme } from '../context/ThemeContext';

export default function RatingModal({ visible, onClose, userRole = 'buyer', onSuccess }) {
  const { theme } = useRoleTheme(userRole);
  const [rating, setRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleStarPress = (star) => {
    setRating(star);
  };

  const getPromptText = () => {
    if (rating === 0) return 'How would you rate your experience?';
    if (rating >= 4) return "We're thrilled you're enjoying REACHLO! What do you love most?";
    if (userRole.toLowerCase() === 'seller') {
      return "We're sorry to hear that. Are you having trouble creating campaigns or finding buyers? Please tell us how we can improve.";
    }
    return "We're sorry to hear that. Are you having trouble finding relevant local deals? Let us know what went wrong.";
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Toast.show({ type: 'error', text1: 'Please select a rating' });
      return;
    }

    setIsSubmitting(true);
    try {
      await apiService.post('/feedback/submit', {
        rating,
        feedback_text: feedbackText,
        category: rating <= 3 ? 'Complaint' : 'Feedback'
      });
      
      setSubmitted(true);
      if (onSuccess) onSuccess();
      
      // Auto close after 2 seconds on success
      setTimeout(() => {
        resetAndClose();
      }, 2000);
      
    } catch (error) {
      console.error('Feedback submit error', error);
      Toast.show({ type: 'error', text1: 'Failed to submit feedback' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setRating(0);
    setFeedbackText('');
    setSubmitted(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={resetAndClose}
    >
      <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            <View style={[styles.modalContent, { backgroundColor: theme.cardBackground, borderColor: theme.cardBorder }]}>
              
              {/* Close Button */}
              {!submitted && (
                <Pressable style={styles.closeButton} onPress={resetAndClose}>
                  <Ionicons name="close" size={24} color={theme.textTertiary} />
                </Pressable>
              )}

              {submitted ? (
                <View style={styles.successContainer}>
                  <View style={styles.successIconCircle}>
                    <Ionicons name="checkmark" size={32} color="#10B981" />
                  </View>
                  <Text style={[styles.successTitle, { color: theme.text }]}>Thank You!</Text>
                  <Text style={[styles.successText, { color: theme.textSecondary }]}>Your feedback helps us make REACHLO better for everyone.</Text>
                </View>
              ) : (
                <>
                  <Text style={[styles.title, { color: theme.text }]}>Rate REACHLO</Text>
                  
                  {/* Stars Container */}
                  <View style={styles.starsContainer}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Pressable 
                        key={star} 
                        onPress={() => handleStarPress(star)}
                        style={styles.starButton}
                      >
                        <Ionicons 
                          name={star <= rating ? "star" : "star-outline"} 
                          size={40} 
                          color={star <= rating ? "#F59E0B" : "#CBD5E1"} 
                        />
                      </Pressable>
                    ))}
                  </View>

                  {rating > 0 && (
                    <Animated.View style={styles.feedbackContainer}>
                      <Text style={[styles.promptText, { color: theme.textSecondary }]}>{getPromptText()}</Text>
                      <TextInput
                        style={[styles.textInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                        placeholder="Tell us more (optional)..."
                        placeholderTextColor={theme.textTertiary}
                        multiline
                        numberOfLines={4}
                        value={feedbackText}
                        onChangeText={setFeedbackText}
                        textAlignVertical="top"
                      />
                    </Animated.View>
                  )}

                  <Pressable
                    style={[styles.submitButton, rating === 0 && styles.submitButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={rating === 0 || isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.submitButtonText}>Submit Feedback</Text>
                    )}
                  </Pressable>
                </>
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)', // Dark slate overlay
    justifyContent: 'center',
    padding: 20,
  },
  keyboardView: {
    width: '100%',
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0B1B4A',
    marginBottom: 24,
    marginTop: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
  },
  starButton: {
    padding: 4,
  },
  feedbackContainer: {
    width: '100%',
    marginBottom: 24,
  },
  promptText: {
    fontSize: 14,
    color: '#526174',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 20,
  },
  textInput: {
    width: '100%',
    backgroundColor: '#F8FAFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    color: '#0B1B4A',
    minHeight: 100,
  },
  submitButton: {
    width: '100%',
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 100,
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0B1B4A',
    marginBottom: 8,
  },
  successText: {
    fontSize: 15,
    color: '#526174',
    textAlign: 'center',
    lineHeight: 22,
  },
});
