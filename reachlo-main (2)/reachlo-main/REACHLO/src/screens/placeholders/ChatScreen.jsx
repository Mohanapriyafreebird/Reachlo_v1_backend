import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';

import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
  Image,
  Linking,
  Alert,
  Animated,
  Modal,
} from 'react-native';

import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import chatService from '../../services/chatService';
import { LinearGradient } from 'expo-linear-gradient';
import LeadWelcomeCard from '../../components/LeadWelcomeCard';

import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

import apiService from '../../services/apiService';
import { resolveMediaUrl } from '../../config/apiConfig';


// ---------------------------------------------------------
// HELPERS
// ---------------------------------------------------------

const generateId = () =>
  Date.now().toString(36) + Math.random().toString(36).substr(2, 5);


const isNewDay = (currentMsgTime, previousMsgTime) => {
  if (!previousMsgTime) return true;

  const current = new Date(currentMsgTime);
  const previous = new Date(previousMsgTime);

  return current.toDateString() !== previous.toDateString();
};


const getDateSeparator = (dateString) => {
  const date = new Date(dateString);

  const today = new Date();

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  }

  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  const options = {
    day: 'numeric',
    month: 'short',
  };

  return date.toLocaleDateString(undefined, options);
};


// ---------------------------------------------------------
// MAIN SCREEN
// ---------------------------------------------------------

export default function ChatScreen({ route, navigation }) {
  const { theme, isDarkMode } = useTheme();

  const {
    threadId,
    campaign,
    business,
    buyer,
  } = route.params;

  const { user } = useAuth();

  const isSeller = user?.role === 'SELLER';

  // -------------------------------------------------------
  // ROLE BASED COLOR SYSTEM
  // Seller = Purple
  // Buyer  = Blue
  // -------------------------------------------------------

  const accent = isSeller ? '#8B5CF6' : '#2563EB';
  const accentLight = isSeller ? '#A78BFA' : '#60A5FA';
  const accentDark = isSeller ? '#7C3AED' : '#1D4ED8';

  const colors = isDarkMode
    ? {
      background: '#090817',
      surface: '#111022',
      surfaceElevated: '#17152B',
      surfaceSoft: '#1C1933',
      border: '#292543',
      borderStrong: '#38315A',

      text: '#F8FAFC',
      textSecondary: '#A9A5BD',
      textTertiary: '#77728D',

      incomingBubble: '#18162A',
      incomingBorder: '#292543',

      inputBackground: '#151329',

      sheetBackground: '#111022',
      sheetRow: '#17152B',

      iconBackground: isSeller
        ? 'rgba(139,92,246,0.14)'
        : 'rgba(37,99,235,0.14)',

      dateBackground: isSeller
        ? 'rgba(139,92,246,0.13)'
        : 'rgba(37,99,235,0.13)',

      infoBackground: isSeller
        ? 'rgba(139,92,246,0.10)'
        : 'rgba(37,99,235,0.10)',

      attachBackground: '#111022',
      divider: '#292543',

      dangerBackground: 'rgba(239,68,68,0.10)',
      danger: '#F87171',

      success: '#34D399',
    }
    : {
      background: '#F6F7FB',
      surface: '#FFFFFF',
      surfaceElevated: '#FFFFFF',
      surfaceSoft: '#F8F7FC',
      border: '#E7E5EF',
      borderStrong: '#D9D5E6',

      text: '#172033',
      textSecondary: '#64748B',
      textTertiary: '#94A3B8',

      incomingBubble: '#FFFFFF',
      incomingBorder: '#E7EAF0',

      inputBackground: '#F3F4F8',

      sheetBackground: '#FFFFFF',
      sheetRow: '#FAFAFC',

      iconBackground: isSeller
        ? '#F1EBFF'
        : '#EAF2FF',

      dateBackground: isSeller
        ? '#F0EAFE'
        : '#EAF2FF',

      infoBackground: isSeller
        ? '#F5F0FF'
        : '#EFF6FF',

      attachBackground: '#FFFFFF',
      divider: '#EEF0F4',

      dangerBackground: '#FEF2F2',
      danger: '#DC2626',

      success: '#059669',
    };


  // -------------------------------------------------------
  // STATE
  // -------------------------------------------------------

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const [inputText, setInputText] = useState('');

  const [threadStatus, setThreadStatus] = useState('WAITING');

  const [uploading, setUploading] = useState(false);

  const [showAttachMenu, setShowAttachMenu] = useState(false);

  const [sendingAction, setSendingAction] = useState(false);

  const [showCampaignDetails, setShowCampaignDetails] =
    useState(false);

  const [showSettingsMenu, setShowSettingsMenu] =
    useState(false);

  const [settingsMode, setSettingsMode] =
    useState('MAIN');

  const [retentionMode, setRetentionMode] =
    useState('Forever');

  const [toastMessage, setToastMessage] =
    useState(null);

  const [isPinned, setIsPinned] =
    useState(false);

  const flatListRef = useRef(null);

  const insets = useSafeAreaInsets();

  const [isKeyboardVisible, setKeyboardVisible] =
    useState(false);


  // -------------------------------------------------------
  // INITIAL LOAD
  // -------------------------------------------------------

  useEffect(() => {
    fetchMessages();
    markRead();

    chatService.emitLocal('THREAD_READ', {
      threadId,
    });

    chatService.connectWs();

    const unsubscribe = chatService.subscribe((data) => {

      if (
        data.type === 'MARK_READ' &&
        data.thread_id === threadId
      ) {
        setThreadStatus('VIEWED');
      }

      else if (
        data.type === 'TYPING' &&
        data.thread_id === threadId
      ) {
        // Typing state can be implemented here.
      }

      else if (data.id) {

        if (data.thread_id === threadId) {

          setMessages((prev) => {

            if (prev.find((m) => m.id === data.id)) {
              return prev;
            }

            return [...prev, data];
          });

          if (data.sender_id !== user.id) {

            setThreadStatus('REPLIED');

            chatService.markAsRead(threadId);
          }

          setTimeout(() => {
            scrollToBottom();
          }, 100);
        }

        else if (
          data.sender_id !== user.id &&
          !data.is_system
        ) {
          showToast(
            `New message from ${data.sender_role === 'SELLER'
              ? 'a Business'
              : 'a Buyer'
            }`
          );
        }
      }
    });


    const kbShow = Keyboard.addListener(
      Platform.OS === 'ios'
        ? 'keyboardWillShow'
        : 'keyboardDidShow',
      () => {
        setKeyboardVisible(true);

        setShowAttachMenu(false);

        setTimeout(() => {
          scrollToBottom();
        }, 100);
      }
    );


    const kbHide = Keyboard.addListener(
      Platform.OS === 'ios'
        ? 'keyboardWillHide'
        : 'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      }
    );


    chatService
      .getPinnedThreads()
      .then((pinned) => {
        if (pinned.includes(threadId)) {
          setIsPinned(true);
        }
      });


    return () => {
      unsubscribe();
      kbShow.remove();
      kbHide.remove();
    };

  }, [threadId]);


  // -------------------------------------------------------
  // TOAST
  // -------------------------------------------------------

  const showToast = (msg) => {
    setToastMessage(msg);

    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };


  // -------------------------------------------------------
  // FETCH MESSAGES
  // -------------------------------------------------------

  const fetchMessages = async () => {

    try {

      const msgs =
        await chatService.getMessages(threadId);

      setMessages(msgs);

      const sellerReplies =
        msgs.filter(
          (m) =>
            m.sender_role === 'SELLER' &&
            !m.is_system
        );

      if (sellerReplies.length > 0) {
        setThreadStatus('REPLIED');
      }

    }

    catch (e) {
      console.log(
        'Error fetching messages',
        e
      );
    }

    finally {

      setLoading(false);

      setTimeout(() => {
        scrollToBottom();
      }, 200);
    }
  };


  // -------------------------------------------------------
  // MARK READ
  // -------------------------------------------------------

  const markRead = async () => {

    try {
      await chatService.markAsRead(threadId);
    }

    catch (e) {
      // Ignore
    }
  };


  // -------------------------------------------------------
  // SCROLL
  // -------------------------------------------------------

  const scrollToBottom = () => {

    if (
      flatListRef.current &&
      messages.length > 0
    ) {
      flatListRef.current.scrollToEnd({
        animated: true,
      });
    }
  };


  // -------------------------------------------------------
  // SEND MESSAGE
  // -------------------------------------------------------

  const sendMessageApi = async (body) => {

    const optimisticId = generateId();

    const optimisticMsg = {
      id: optimisticId,
      body,
      sender_id: user.id,
      sender_role: user.role,
      is_system: false,
      created_at: new Date().toISOString(),
    };


    setMessages((prev) => [
      ...prev,
      optimisticMsg,
    ]);


    setTimeout(() => {
      scrollToBottom();
    }, 50);


    try {

      const actualMsg =
        await chatService.sendMessage(
          threadId,
          body
        );


      setMessages((prev) => {

        if (
          prev.find(
            (m) => m.id === actualMsg.id
          )
        ) {
          return prev.filter(
            (m) => m.id !== optimisticId
          );
        }

        return prev.map(
          (m) =>
            m.id === optimisticId
              ? actualMsg
              : m
        );
      });

    }

    catch (e) {

      console.log(
        'Failed to send message',
        e
      );

      setMessages((prev) =>
        prev.filter(
          (m) => m.id !== optimisticId
        )
      );

      Alert.alert(
        'Error',
        'Failed to send message.'
      );
    }
  };


  const handleSend = async () => {

    if (!inputText.trim()) {
      return;
    }

    const body = inputText.trim();

    setInputText('');

    await sendMessageApi(body);
  };


  // -------------------------------------------------------
  // CALL
  // -------------------------------------------------------

  const handleCall = () => {

    const phoneNumber =
      user?.role === 'SELLER'
        ? buyer?.phone
        : business?.phone;


    if (phoneNumber) {

      Linking.openURL(
        `tel:${phoneNumber}`
      );

    }

    else {

      Alert.alert(
        'Not Available',
        'No phone number provided.'
      );
    }
  };


  // -------------------------------------------------------
  // QUICK ACTIONS
  // -------------------------------------------------------

  const handleQuickAction = async (action) => {

    if (sendingAction) {
      return;
    }

    setSendingAction(true);

    let msgText = action.title;


    if (
      action.title
        .toLowerCase()
        .includes('price') ||
      action.title
        .toLowerCase()
        .includes('pricing')
    ) {
      msgText = "What's the price?";
    }

    else if (
      action.title
        .toLowerCase()
        .includes('location') ||
      action.title
        .toLowerCase()
        .includes('direction')
    ) {
      msgText = "Where is your location?";
    }

    else if (
      action.title
        .toLowerCase()
        .includes('offer')
    ) {
      msgText =
        "What are the current offers?";
    }

    else {
      msgText =
        `I'd like to know more about: ${action.title}`;
    }


    await sendMessageApi(msgText);

    setTimeout(() => {
      setSendingAction(false);
    }, 2000);
  };


  // -------------------------------------------------------
  // FILE UPLOAD
  // -------------------------------------------------------

  const uploadFile = async (
    uri,
    name,
    type,
    isImage
  ) => {

    try {

      setUploading(true);

      setShowAttachMenu(false);

      const formData = new FormData();

      formData.append('file', {
        uri:
          Platform.OS === 'ios'
            ? uri.replace('file://', '')
            : uri,
        type:
          type ||
          'application/octet-stream',
        name:
          name ||
          (isImage
            ? 'image.jpg'
            : 'document.pdf'),
      });


      const response =
        await apiService.post(
          '/upload/image',
          formData
        );


      if (response && response.url) {

        const prefix = isImage
          ? '[ATTACHMENT:IMAGE]'
          : `[ATTACHMENT:DOCUMENT:${name}]`;


        await sendMessageApi(
          `${prefix}${response.url}`
        );
      }

    }

    catch (e) {

      Alert.alert(
        'Upload Failed',
        'There was an error uploading your file.'
      );

      console.log(
        'Upload error:',
        e
      );

    }

    finally {
      setUploading(false);
    }
  };


  // -------------------------------------------------------
  // PICK IMAGE
  // -------------------------------------------------------

  const pickImage = async () => {

    const permissionResult =
      await ImagePicker
        .requestMediaLibraryPermissionsAsync();


    if (
      permissionResult.granted === false
    ) {

      Alert.alert(
        'Permission required',
        'Please grant camera roll permissions.'
      );

      return;
    }


    const result =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        quality: 0.8,
      });


    if (!result.canceled) {

      const asset =
        result.assets[0];

      const filename =
        asset.uri.split('/').pop();

      const mimeType =
        asset.type === 'video'
          ? 'video/mp4'
          : 'image/jpeg';


      uploadFile(
        asset.uri,
        filename,
        mimeType,
        asset.type !== 'video'
      );
    }
  };


  // -------------------------------------------------------
  // PICK DOCUMENT
  // -------------------------------------------------------

  const pickDocument = async () => {

    try {

      const result =
        await DocumentPicker.getDocumentAsync({
          type: '*/*',
          copyToCacheDirectory: true,
        });


      if (
        !result.canceled &&
        result.assets &&
        result.assets.length > 0
      ) {

        const asset =
          result.assets[0];


        uploadFile(
          asset.uri,
          asset.name,
          asset.mimeType,
          false
        );
      }

    }

    catch (err) {

      console.log(
        'DocumentPicker Error:',
        err
      );
    }
  };


  // -------------------------------------------------------
  // TIME FORMAT
  // -------------------------------------------------------

  const formatTime = (isoString) => {

    if (!isoString) {
      return '';
    }


    const timeStr =
      isoString.endsWith('Z') ||
        isoString.includes('+')
        ? isoString
        : `${isoString}Z`;


    const date = new Date(timeStr);


    if (isNaN(date.getTime())) {
      return '';
    }


    let hours = date.getHours();

    const minutes =
      date
        .getMinutes()
        .toString()
        .padStart(2, '0');


    const ampm =
      hours >= 12
        ? 'PM'
        : 'AM';


    hours = hours % 12;

    hours = hours
      ? hours
      : 12;


    return `${hours}:${minutes} ${ampm}`;
  };


  // -------------------------------------------------------
  // MESSAGE BODY
  // -------------------------------------------------------

  const renderMessageBody = (
    body,
    isMe,
    time
  ) => {

    const timeColor = isMe
      ? 'rgba(255,255,255,0.72)'
      : colors.textTertiary;


    // -----------------------------------------------------
    // IMAGE
    // -----------------------------------------------------

    if (
      body.startsWith(
        '[ATTACHMENT:IMAGE]'
      )
    ) {

      const url =
        body.replace(
          '[ATTACHMENT:IMAGE]',
          ''
        );


      return (
        <View style={styles.imageBubbleContainer}>

          <Pressable
            onPress={() =>
              Linking.openURL(
                resolveMediaUrl(url)
              )
            }
          >

            <Image
              source={{
                uri: resolveMediaUrl(url),
              }}
              style={[
                styles.messageImage,
                {
                  borderColor:
                    isDarkMode
                      ? colors.borderStrong
                      : 'transparent',
                },
              ]}
            />

          </Pressable>


          <View
            style={[
              styles.imageTimeOverlay,
              {
                backgroundColor:
                  'rgba(0,0,0,0.55)',
              },
            ]}
          >

            <Text
              style={styles.imageTimeText}
            >
              {formatTime(time)}
            </Text>


            {isMe && (
              <Ionicons
                name={
                  threadStatus === 'VIEWED'
                    ? 'checkmark-done'
                    : 'checkmark'
                }
                size={12}
                color={
                  threadStatus === 'VIEWED'
                    ? '#6EE7B7'
                    : '#FFFFFF'
                }
                style={{
                  marginLeft: 3,
                }}
              />
            )}

          </View>

        </View>
      );
    }


    // -----------------------------------------------------
    // DOCUMENT
    // -----------------------------------------------------

    if (
      body.startsWith(
        '[ATTACHMENT:DOCUMENT:'
      )
    ) {

      const parts =
        body.split(']');

      const filename =
        parts[0].replace(
          '[ATTACHMENT:DOCUMENT:',
          ''
        );

      const url =
        parts.slice(1).join(']');


      return (
        <View>

          <Pressable
            onPress={() =>
              Linking.openURL(
                resolveMediaUrl(url)
              )
            }
            style={[
              styles.documentCard,
              {
                backgroundColor:
                  isMe
                    ? 'rgba(255,255,255,0.14)'
                    : colors.surfaceSoft,

                borderColor:
                  isMe
                    ? 'rgba(255,255,255,0.16)'
                    : colors.border,
              },
            ]}
          >

            <View
              style={[
                styles.documentIconWrap,
                {
                  backgroundColor:
                    isMe
                      ? 'rgba(255,255,255,0.15)'
                      : colors.iconBackground,
                },
              ]}
            >

              <Ionicons
                name="document-text"
                size={22}
                color={
                  isMe
                    ? '#FFFFFF'
                    : accent
                }
              />

            </View>


            <View
              style={{
                flex: 1,
              }}
            >

              <Text
                style={[
                  styles.documentName,
                  {
                    color: isMe
                      ? '#FFFFFF'
                      : colors.text,
                  },
                ]}
                numberOfLines={1}
              >
                {filename}
              </Text>


              <Text
                style={[
                  styles.documentOpenText,
                  {
                    color: isMe
                      ? 'rgba(255,255,255,0.68)'
                      : accent,
                  },
                ]}
              >
                Tap to open
              </Text>

            </View>

          </Pressable>


          <View
            style={[
              styles.msgTimeRow,
              {
                alignSelf: 'flex-end',
                marginTop: 4,
              },
            ]}
          >

            <Text
              style={[
                styles.msgTime,
                {
                  color: timeColor,
                },
              ]}
            >
              {formatTime(time)}
            </Text>


            {isMe && (
              <Ionicons
                name={
                  threadStatus === 'VIEWED'
                    ? 'checkmark-done'
                    : 'checkmark'
                }
                size={12}
                color={
                  threadStatus === 'VIEWED'
                    ? '#6EE7B7'
                    : timeColor
                }
                style={{
                  marginLeft: 2,
                }}
              />
            )}

          </View>

        </View>
      );
    }


    // -----------------------------------------------------
    // NORMAL TEXT
    // -----------------------------------------------------

    return (
      <View
        style={styles.textBubbleContainer}
      >

        <Text
          style={[
            styles.msgText,
            {
              color: isMe
                ? '#FFFFFF'
                : colors.text,
            },
          ]}
        >
          {body}
        </Text>


        <View
          style={styles.msgTimeRow}
        >

          <Text
            style={[
              styles.msgTime,
              {
                color: timeColor,
              },
            ]}
          >
            {formatTime(time)}
          </Text>


          {isMe && (
            <Ionicons
              name={
                threadStatus === 'VIEWED'
                  ? 'checkmark-done'
                  : 'checkmark'
              }
              size={14}
              color={
                threadStatus === 'VIEWED'
                  ? '#6EE7B7'
                  : 'rgba(255,255,255,0.72)'
              }
              style={{
                marginLeft: 2,
                marginBottom: -2,
              }}
            />
          )}

        </View>

      </View>
    );
  };


  // -------------------------------------------------------
  // MESSAGE
  // -------------------------------------------------------

  const renderMessage = ({
    item,
    index,
  }) => {

    const isMe =
      item.sender_id === user.id;

    const isSystem =
      item.is_system;


    const showDateSeparator =
      index === 0 ||
      isNewDay(
        item.created_at,
        messages[index - 1].created_at
      );


    const messageContent = () => {

      // ---------------------------------------------------
      // SYSTEM MESSAGE
      // ---------------------------------------------------

      if (isSystem) {

        if (user?.role === 'SELLER') {
          return null;
        }


        if (
          item.body.includes(
            'created successfully'
          )
        ) {

          return (
            <LeadWelcomeCard
              campaign={campaign}
              business={business}
              onQuickAction={
                handleQuickAction
              }
            />
          );
        }


        return (
          <View
            style={[
              styles.systemMsgContainer,
              {
                backgroundColor:
                  isDarkMode
                    ? colors.infoBackground
                    : '#FFF7ED',

                borderColor:
                  isDarkMode
                    ? colors.border
                    : '#FED7AA',
              },
            ]}
          >

            <Ionicons
              name="information-circle-outline"
              size={15}
              color={
                isDarkMode
                  ? accentLight
                  : '#EA580C'
              }
            />

            <Text
              style={[
                styles.systemMsgText,
                {
                  color:
                    isDarkMode
                      ? colors.textSecondary
                      : '#9A3412',
                },
              ]}
            >
              {item.body}
            </Text>

          </View>
        );
      }


      const showSellerBranding =
        !isMe &&
        item.sender_role === 'SELLER';


      const showBuyerBranding =
        !isMe &&
        item.sender_role === 'BUYER';


      const isFirstInGroup =
        index === 0 ||
        messages[index - 1].sender_id !==
        item.sender_id ||
        messages[index - 1].is_system ||
        showDateSeparator;


      // ---------------------------------------------------
      // MESSAGE BUBBLE
      // ---------------------------------------------------

      const bubbleWrapper = (children) => {

        if (isMe) {

          return (
            <LinearGradient
              colors={[
                accent,
                accentDark,
              ]}
              start={{
                x: 0,
                y: 0,
              }}
              end={{
                x: 1,
                y: 1,
              }}
              style={[
                styles.msgBubble,
                styles.msgBubbleMe,

                !isFirstInGroup && {
                  borderTopRightRadius: 6,
                },
              ]}
            >
              {children}
            </LinearGradient>
          );
        }


        return (
          <View
            style={[
              styles.msgBubble,
              styles.msgBubbleOther,

              {
                backgroundColor:
                  colors.incomingBubble,

                borderColor:
                  colors.incomingBorder,
              },

              !isFirstInGroup && {
                borderTopLeftRadius: 6,
              },
            ]}
          >
            {children}
          </View>
        );
      };


      return (
        <View
          style={[
            styles.msgWrapper,

            isMe
              ? styles.msgWrapperMe
              : styles.msgWrapperOther,

            isFirstInGroup
              ? {
                marginTop: 14,
              }
              : {
                marginTop: 5,
              },
          ]}
        >

          <View
            style={[
              styles.msgContentCol,
              {
                alignItems: isMe
                  ? 'flex-end'
                  : 'flex-start',
              },
            ]}
          >

            {/* -----------------------------------------
                SENDER BRANDING
            ----------------------------------------- */}

            {showSellerBranding &&
              isFirstInGroup && (
                <View
                  style={styles.senderNameRow}
                >

                  <View
                    style={[
                      styles.tinyAvatar,
                      {
                        backgroundColor:
                          isSeller
                            ? accent
                            : '#8B5CF6',
                      },
                    ]}
                  >

                    <Text
                      style={
                        styles.tinyAvatarText
                      }
                    >
                      {(
                        business?.name ||
                        'B'
                      )[0]}
                    </Text>

                  </View>


                  <Text
                    style={[
                      styles.senderNameText,
                      {
                        color:
                          isDarkMode
                            ? colors.textSecondary
                            : '#64748B',
                      },
                    ]}
                  >
                    {business?.name ||
                      item.sender_name ||
                      'Business'}
                  </Text>


                  <Ionicons
                    name="checkmark-circle"
                    size={14}
                    color={colors.success}
                    style={{
                      marginLeft: 4,
                    }}
                  />

                </View>
              )}


            {showBuyerBranding &&
              isFirstInGroup && (
                <View
                  style={styles.senderNameRow}
                >

                  <View
                    style={[
                      styles.tinyAvatar,
                      {
                        backgroundColor:
                          accent,
                      },
                    ]}
                  >

                    <Text
                      style={
                        styles.tinyAvatarText
                      }
                    >
                      {(
                        buyer?.name ||
                        'B'
                      )[0]}
                    </Text>

                  </View>


                  <Text
                    style={[
                      styles.senderNameText,
                      {
                        color:
                          isDarkMode
                            ? colors.textSecondary
                            : '#64748B',
                      },
                    ]}
                  >
                    {buyer?.name ||
                      item.sender_name ||
                      'Buyer'}
                  </Text>

                </View>
              )}


            {/* -----------------------------------------
                BUBBLE
            ----------------------------------------- */}

            {bubbleWrapper(
              renderMessageBody(
                item.body,
                isMe,
                item.created_at
              )
            )}


            {/* -----------------------------------------
                SMART ACTIONS
            ----------------------------------------- */}

            {showSellerBranding &&
              user?.role === 'BUYER' &&
              isFirstInGroup && (

                <View
                  style={
                    styles.smartActionsContainer
                  }
                >

                  {item.body
                    .toLowerCase()
                    .includes('pricing') ||
                    item.body
                      .toLowerCase()
                      .includes('price') ? (

                    <>

                      <Pressable
                        style={[
                          styles.smartChip,
                          {
                            backgroundColor:
                              colors.surface,
                            borderColor:
                              colors.borderStrong,
                          },
                        ]}
                        onPress={() =>
                          handleQuickAction({
                            title:
                              'Membership Plans',
                          })
                        }
                      >

                        <Ionicons
                          name="pricetag-outline"
                          size={14}
                          color={accent}
                        />

                        <Text
                          style={[
                            styles.smartChipText,
                            {
                              color: accent,
                            },
                          ]}
                        >
                          Membership Plans
                        </Text>

                      </Pressable>


                      <Pressable
                        style={[
                          styles.smartChip,
                          {
                            backgroundColor:
                              colors.surface,
                            borderColor:
                              colors.borderStrong,
                          },
                        ]}
                        onPress={() =>
                          handleQuickAction({
                            title:
                              'Current Offers',
                          })
                        }
                      >

                        <Ionicons
                          name="gift-outline"
                          size={14}
                          color={accent}
                        />

                        <Text
                          style={[
                            styles.smartChipText,
                            {
                              color: accent,
                            },
                          ]}
                        >
                          Current Offers
                        </Text>

                      </Pressable>

                    </>

                  ) : item.body
                    .toLowerCase()
                    .includes('located') ||
                    item.body
                      .toLowerCase()
                      .includes('location') ? (

                    <>

                      <Pressable
                        style={[
                          styles.smartChip,
                          {
                            backgroundColor:
                              colors.surface,
                            borderColor:
                              colors.borderStrong,
                          },
                        ]}
                        onPress={() =>
                          handleQuickAction({
                            title:
                              'Business Hours',
                          })
                        }
                      >

                        <Ionicons
                          name="time-outline"
                          size={14}
                          color={accent}
                        />

                        <Text
                          style={[
                            styles.smartChipText,
                            {
                              color: accent,
                            },
                          ]}
                        >
                          Business Hours
                        </Text>

                      </Pressable>


                      <Pressable
                        style={[
                          styles.smartChip,
                          {
                            backgroundColor:
                              colors.surface,
                            borderColor:
                              colors.borderStrong,
                          },
                        ]}
                        onPress={() =>
                          handleQuickAction({
                            title:
                              'Call Business',
                          })
                        }
                      >

                        <Ionicons
                          name="call-outline"
                          size={14}
                          color={accent}
                        />

                        <Text
                          style={[
                            styles.smartChipText,
                            {
                              color: accent,
                            },
                          ]}
                        >
                          Call Business
                        </Text>

                      </Pressable>

                    </>

                  ) : null}

                </View>
              )}

          </View>

        </View>
      );
    };


    return (
      <View>

        {showDateSeparator && (

          <View
            style={[
              styles.dateSeparator,
              {
                backgroundColor:
                  colors.dateBackground,

                borderColor:
                  colors.border,
              },
            ]}
          >

            <Ionicons
              name="calendar-outline"
              size={12}
              color={accent}
            />

            <Text
              style={[
                styles.dateSeparatorText,
                {
                  color:
                    isDarkMode
                      ? accentLight
                      : accentDark,
                },
              ]}
            >
              {getDateSeparator(
                item.created_at
              )}
            </Text>

          </View>
        )}


        {messageContent()}

      </View>
    );
  };


  // -------------------------------------------------------
  // CAMPAIGN IMAGE
  // -------------------------------------------------------

  const getCampaignImage = () => {

    if (!campaign) {
      return null;
    }

    return (
      campaign.image_urls?.[0] ||
      campaign.image_url ||
      null
    );
  };


  // -------------------------------------------------------
  // RENDER
  // -------------------------------------------------------

  return (

    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor:
            colors.background,
        },
      ]}
      edges={[
        'top',
        'left',
        'right',
      ]}
    >

      <KeyboardAvoidingView
        style={[
          styles.container,
          {
            backgroundColor:
              colors.background,
          },
        ]}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : 'padding'
        }
        keyboardVerticalOffset={0}
      >

        {/* =================================================
            HEADER
        ================================================= */}

        <View
          style={[
            styles.header,
            {
              backgroundColor:
                colors.surface,

              borderBottomColor:
                colors.border,
            },
          ]}
        >

          <Pressable
            onPress={() =>
              navigation.goBack()
            }
            style={[
              styles.backBtn,
              {
                backgroundColor:
                  colors.surfaceSoft,

                borderColor:
                  colors.border,
              },
            ]}
          >

            <Ionicons
              name="arrow-back"
              size={23}
              color={colors.text}
            />

          </Pressable>


          <View
            style={styles.headerProfileContainer}
          >

            {/* HEADER AVATAR */}

            <View
              style={[
                styles.headerAvatarWrap,
                {
                  backgroundColor:
                    isSeller
                      ? accent
                      : '#2563EB',

                  shadowColor:
                    accent,
                },
              ]}
            >

              <Text
                style={
                  styles.headerAvatarText
                }
              >
                {(
                  isSeller
                    ? buyer?.name
                    : business?.name
                    || 'B'
                )[0]?.toUpperCase()}
              </Text>


              <View
                style={[
                  styles.onlineBadge,
                  {
                    borderColor:
                      colors.surface,
                  },
                ]}
              />

            </View>


            {/* HEADER TEXT */}

            <View
              style={
                styles.headerTitleContainer
              }
            >

              <Text
                style={[
                  styles.headerTitle,
                  {
                    color: colors.text,
                  },
                ]}
                numberOfLines={1}
              >
                {isSeller
                  ? buyer?.name ||
                  'Buyer'
                  : business?.name ||
                  'Business'}
              </Text>


              <View
                style={
                  styles.statusRow
                }
              >

                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor:
                        colors.success,
                    },
                  ]}
                />

                <Text
                  style={[
                    styles.headerSubtitle,
                    {
                      color:
                        colors.textSecondary,
                    },
                  ]}
                >
                  {isSeller
                    ? 'Active Lead'
                    : 'Typically replies in 5m'}
                </Text>

              </View>

            </View>

          </View>


          {/* HEADER ACTIONS */}

          <View
            style={styles.headerActions}
          >

            <Pressable
              style={[
                styles.headerActionBtn,
                {
                  backgroundColor:
                    colors.surfaceSoft,
                  borderColor:
                    colors.border,
                },
              ]}
              onPress={handleCall}
            >

              <Ionicons
                name="call-outline"
                size={21}
                color={accent}
              />

            </Pressable>


            <Pressable
              style={[
                styles.headerActionBtn,
                {
                  backgroundColor:
                    colors.surfaceSoft,
                  borderColor:
                    colors.border,
                },
              ]}
              onPress={() => {
                setSettingsMode('MAIN');
                setShowSettingsMenu(true);
              }}
            >

              <Ionicons
                name="ellipsis-vertical"
                size={21}
                color={colors.textSecondary}
              />

            </Pressable>

          </View>

        </View>


        {/* =================================================
            CHAT AREA
        ================================================= */}

        <View
          style={[
            styles.chatBackground,
            {
              backgroundColor:
                colors.background,
            },
          ]}
        >

          {loading ? (

            <View
              style={styles.loaderContainer}
            >

              <View
                style={[
                  styles.loaderCircle,
                  {
                    backgroundColor:
                      colors.iconBackground,
                  },
                ]}
              >

                <ActivityIndicator
                  size="small"
                  color={accent}
                />

              </View>

              <Text
                style={[
                  styles.loadingText,
                  {
                    color:
                      colors.textSecondary,
                  },
                ]}
              >
                Loading conversation...
              </Text>

            </View>

          ) : (

            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) =>
                item.id.toString()
              }
              renderItem={renderMessage}
              contentContainerStyle={[
                styles.listContent,
                {
                  paddingBottom:
                    isKeyboardVisible
                      ? 18
                      : 24,
                },
              ]}
              onContentSizeChange={
                scrollToBottom
              }
              onLayout={
                scrollToBottom
              }
              showsVerticalScrollIndicator={
                false
              }
              keyboardShouldPersistTaps="handled"
            />

          )}

        </View>


        {/* =================================================
            ATTACHMENT MENU
        ================================================= */}

        {showAttachMenu && (

          <View
            style={[
              styles.attachMenu,
              {
                backgroundColor:
                  colors.surface,

                borderTopColor:
                  colors.border,

                borderBottomColor:
                  colors.border,
              },
            ]}
          >

            <Pressable
              style={styles.attachOption}
              onPress={pickImage}
            >

              <View
                style={[
                  styles.attachIconWrap,
                  {
                    backgroundColor:
                      isDarkMode
                        ? 'rgba(139,92,246,0.14)'
                        : isSeller
                          ? '#F1EBFF'
                          : '#EEF4FF',
                  },
                ]}
              >

                <Ionicons
                  name="images-outline"
                  size={23}
                  color={accent}
                />

              </View>


              <Text
                style={[
                  styles.attachOptionText,
                  {
                    color:
                      colors.textSecondary,
                  },
                ]}
              >
                Photos & Videos
              </Text>

            </Pressable>


            <Pressable
              style={styles.attachOption}
              onPress={pickDocument}
            >

              <View
                style={[
                  styles.attachIconWrap,
                  {
                    backgroundColor:
                      isDarkMode
                        ? 'rgba(37,99,235,0.14)'
                        : '#EAF2FF',
                  },
                ]}
              >

                <Ionicons
                  name="document-text-outline"
                  size={23}
                  color={
                    isSeller
                      ? '#A78BFA'
                      : '#2563EB'
                  }
                />

              </View>


              <Text
                style={[
                  styles.attachOptionText,
                  {
                    color:
                      colors.textSecondary,
                  },
                ]}
              >
                Document
              </Text>

            </Pressable>

          </View>
        )}


        {/* =================================================
            MESSAGE INPUT
        ================================================= */}

        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor:
                colors.surface,

              borderTopColor:
                colors.border,

              paddingBottom:
                isKeyboardVisible
                  ? 10
                  : Math.max(
                    insets.bottom,
                    10
                  ),
            },
          ]}
        >

          <Pressable
            style={[
              styles.attachBtn,
              {
                backgroundColor:
                  colors.surfaceSoft,

                borderColor:
                  colors.border,
              },
            ]}
            onPress={() =>
              setShowAttachMenu(
                !showAttachMenu
              )
            }
          >

            <Ionicons
              name={
                showAttachMenu
                  ? 'close'
                  : 'add'
              }
              size={23}
              color={
                showAttachMenu
                  ? accent
                  : colors.textSecondary
              }
            />

          </Pressable>


          <View
            style={[
              styles.inputWrapper,
              {
                backgroundColor:
                  colors.inputBackground,

                borderColor:
                  colors.border,
              },
            ]}
          >

            <TextInput
              style={[
                styles.input,
                {
                  color: colors.text,
                },
              ]}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type a message..."
              placeholderTextColor={
                colors.textTertiary
              }
              multiline
              maxLength={1000}
              onFocus={() => {
                setShowAttachMenu(false);
                scrollToBottom();
              }}
            />

          </View>


          {/* SEND */}

          {inputText.trim() ? (

            <Pressable
              onPress={handleSend}
              style={styles.sendBtn}
              disabled={uploading}
            >

              {uploading ? (

                <View
                  style={[
                    styles.sendButton,
                    {
                      backgroundColor:
                        colors.borderStrong,
                    },
                  ]}
                >

                  <ActivityIndicator
                    size="small"
                    color="#FFFFFF"
                  />

                </View>

              ) : (

                <LinearGradient
                  colors={[
                    accent,
                    accentDark,
                  ]}
                  start={{
                    x: 0,
                    y: 0,
                  }}
                  end={{
                    x: 1,
                    y: 1,
                  }}
                  style={styles.sendButton}
                >

                  <Ionicons
                    name="send"
                    size={17}
                    color="#FFFFFF"
                    style={{
                      marginLeft: 2,
                    }}
                  />

                </LinearGradient>

              )}

            </Pressable>

          ) : (

            <Pressable
              onPress={pickImage}
              style={styles.sendBtn}
            >

              <View
                style={[
                  styles.sendButton,
                  {
                    backgroundColor:
                      colors.surfaceSoft,

                    borderColor:
                      colors.border,
                  },
                ]}
              >

                <Ionicons
                  name="camera-outline"
                  size={20}
                  color={accent}
                />

              </View>

            </Pressable>

          )}

        </View>

      </KeyboardAvoidingView>


      {/* =====================================================
          CONVERSATION SETTINGS MODAL
      ===================================================== */}

      <Modal
        visible={showSettingsMenu}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setShowSettingsMenu(false)
        }
      >

        <View
          style={styles.modalOverlay}
        >

          {/* BACKDROP */}

          <Pressable
            style={[
              styles.modalBackdrop,
              {
                backgroundColor:
                  isDarkMode
                    ? 'rgba(0,0,0,0.72)'
                    : 'rgba(15,23,42,0.42)',
              },
            ]}
            onPress={() =>
              setShowSettingsMenu(false)
            }
          />


          {/* SHEET */}

          <View
            style={[
              styles.bottomSheet,
              {
                backgroundColor:
                  colors.sheetBackground,

                borderColor:
                  colors.border,
              },
            ]}
          >

            {/* =================================================
                MAIN SETTINGS
            ================================================= */}

            {settingsMode === 'MAIN' ? (

              <>

                <View
                  style={styles.sheetHandle}
                >
                  <View
                    style={[
                      styles.sheetHandleBar,
                      {
                        backgroundColor:
                          colors.borderStrong,
                      },
                    ]}
                  />
                </View>


                <View
                  style={styles.sheetHeader}
                >

                  <View>
                    <Text
                      style={[
                        styles.sheetTitle,
                        {
                          color:
                            colors.text,
                        },
                      ]}
                    >
                      Manage Conversation
                    </Text>

                    <Text
                      style={[
                        styles.sheetSubtitleSmall,
                        {
                          color:
                            colors.textTertiary,
                        },
                      ]}
                    >
                      Control your chat preferences
                    </Text>
                  </View>


                  <Pressable
                    onPress={() =>
                      setShowSettingsMenu(false)
                    }
                    style={[
                      styles.sheetCloseBtn,
                      {
                        backgroundColor:
                          colors.surfaceSoft,

                        borderColor:
                          colors.border,
                      },
                    ]}
                  >

                    <Ionicons
                      name="close"
                      size={20}
                      color={
                        colors.textSecondary
                      }
                    />

                  </Pressable>

                </View>


                <View
                  style={styles.sheetContent}
                >

                  {/* PIN */}

                  <Pressable
                    style={[
                      styles.sheetOption,
                      {
                        backgroundColor:
                          colors.sheetRow,

                        borderColor:
                          colors.border,
                      },
                    ]}
                    onPress={async () => {

                      setShowSettingsMenu(false);

                      const nowPinned =
                        await chatService.togglePin(
                          threadId
                        );

                      setIsPinned(
                        nowPinned
                      );

                      showToast(
                        nowPinned
                          ? 'Conversation pinned.'
                          : 'Conversation unpinned.'
                      );
                    }}
                  >

                    <View
                      style={[
                        styles.sheetOptionIcon,
                        {
                          backgroundColor:
                            colors.iconBackground,
                        },
                      ]}
                    >

                      <Ionicons
                        name={
                          isPinned
                            ? 'pin'
                            : 'pin-outline'
                        }
                        size={19}
                        color={accent}
                      />

                    </View>


                    <View
                      style={
                        styles.sheetOptionTextWrap
                      }
                    >

                      <Text
                        style={[
                          styles.sheetOptionText,
                          {
                            color:
                              colors.text,
                          },
                        ]}
                      >
                        {isPinned
                          ? 'Unpin Conversation'
                          : 'Pin Conversation'}
                      </Text>

                      <Text
                        style={[
                          styles.sheetOptionDescription,
                          {
                            color:
                              colors.textTertiary,
                          },
                        ]}
                      >
                        {isPinned
                          ? 'Remove this chat from pinned conversations'
                          : 'Keep this conversation at the top'}
                      </Text>

                    </View>

                  </Pressable>


                  {/* MUTE */}

                  <Pressable
                    style={[
                      styles.sheetOption,
                      {
                        backgroundColor:
                          colors.sheetRow,

                        borderColor:
                          colors.border,
                      },
                    ]}
                    onPress={() => {
                      setShowSettingsMenu(false);

                      showToast(
                        'Notifications muted.'
                      );
                    }}
                  >

                    <View
                      style={[
                        styles.sheetOptionIcon,
                        {
                          backgroundColor:
                            colors.iconBackground,
                        },
                      ]}
                    >

                      <Ionicons
                        name="notifications-off-outline"
                        size={19}
                        color={accent}
                      />

                    </View>


                    <View
                      style={
                        styles.sheetOptionTextWrap
                      }
                    >

                      <Text
                        style={[
                          styles.sheetOptionText,
                          {
                            color:
                              colors.text,
                          },
                        ]}
                      >
                        Mute Notifications
                      </Text>

                      <Text
                        style={[
                          styles.sheetOptionDescription,
                          {
                            color:
                              colors.textTertiary,
                          },
                        ]}
                      >
                        Stop notifications from this conversation
                      </Text>

                    </View>

                  </Pressable>


                  {/* CHAT HISTORY */}

                  <Pressable
                    style={[
                      styles.sheetOption,
                      {
                        backgroundColor:
                          colors.sheetRow,

                        borderColor:
                          colors.border,
                      },
                    ]}
                    onPress={() =>
                      setSettingsMode(
                        'HISTORY'
                      )
                    }
                  >

                    <View
                      style={[
                        styles.sheetOptionIcon,
                        {
                          backgroundColor:
                            colors.iconBackground,
                        },
                      ]}
                    >

                      <Ionicons
                        name="time-outline"
                        size={19}
                        color={accent}
                      />

                    </View>


                    <View
                      style={
                        styles.sheetOptionTextWrap
                      }
                    >

                      <Text
                        style={[
                          styles.sheetOptionText,
                          {
                            color:
                              colors.text,
                          },
                        ]}
                      >
                        Chat History
                      </Text>

                      <Text
                        style={[
                          styles.sheetOptionDescription,
                          {
                            color:
                              colors.textTertiary,
                          },
                        ]}
                      >
                        Choose how long messages are retained
                      </Text>

                    </View>


                    <Ionicons
                      name="chevron-forward"
                      size={19}
                      color={
                        colors.textTertiary
                      }
                    />

                  </Pressable>


                  {/* DELETE */}

                  <Pressable
                    style={[
                      styles.sheetOption,
                      {
                        backgroundColor:
                          isDarkMode
                            ? colors.dangerBackground
                            : '#FFF8F8',

                        borderColor:
                          isDarkMode
                            ? 'rgba(239,68,68,0.18)'
                            : '#FEE2E2',
                      },
                    ]}
                    onPress={() => {

                      Alert.alert(
                        'Delete Conversation?',
                        'Deleting this conversation will permanently remove all messages from your account.\n\nThis action cannot be undone.',
                        [
                          {
                            text: 'Cancel',
                            style: 'cancel',
                          },
                          {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: () => {
                              setShowSettingsMenu(
                                false
                              );

                              navigation.goBack();
                            },
                          },
                        ]
                      );

                    }}
                  >

                    <View
                      style={[
                        styles.sheetOptionIcon,
                        {
                          backgroundColor:
                            isDarkMode
                              ? 'rgba(239,68,68,0.14)'
                              : '#FEF2F2',
                        },
                      ]}
                    >

                      <Ionicons
                        name="trash-outline"
                        size={19}
                        color={colors.danger}
                      />

                    </View>


                    <View
                      style={
                        styles.sheetOptionTextWrap
                      }
                    >

                      <Text
                        style={[
                          styles.sheetOptionText,
                          {
                            color:
                              colors.danger,
                          },
                        ]}
                      >
                        Delete Conversation
                      </Text>

                      <Text
                        style={[
                          styles.sheetOptionDescription,
                          {
                            color:
                              isDarkMode
                                ? '#C98989'
                                : '#B91C1C',
                          },
                        ]}
                      >
                        Permanently remove this chat
                      </Text>

                    </View>

                  </Pressable>

                </View>

              </>

            ) : (

              /* =================================================
                 HISTORY SETTINGS
              ================================================= */

              <>

                <View
                  style={styles.sheetHandle}
                >
                  <View
                    style={[
                      styles.sheetHandleBar,
                      {
                        backgroundColor:
                          colors.borderStrong,
                      },
                    ]}
                  />
                </View>


                <View
                  style={styles.sheetHeader}
                >

                  <View
                    style={
                      styles.historyHeaderLeft
                    }
                  >

                    <Pressable
                      onPress={() =>
                        setSettingsMode(
                          'MAIN'
                        )
                      }
                      style={[
                        styles.historyBackBtn,
                        {
                          backgroundColor:
                            colors.surfaceSoft,

                          borderColor:
                            colors.border,
                        },
                      ]}
                    >

                      <Ionicons
                        name="arrow-back"
                        size={19}
                        color={
                          colors.textSecondary
                        }
                      />

                    </Pressable>


                    <View>

                      <Text
                        style={[
                          styles.sheetTitle,
                          {
                            color:
                              colors.text,
                          },
                        ]}
                      >
                        Chat History
                      </Text>

                      <Text
                        style={[
                          styles.sheetSubtitleSmall,
                          {
                            color:
                              colors.textTertiary,
                          },
                        ]}
                      >
                        Retention preference
                      </Text>

                    </View>

                  </View>


                  <Pressable
                    onPress={() =>
                      setShowSettingsMenu(false)
                    }
                    style={[
                      styles.sheetCloseBtn,
                      {
                        backgroundColor:
                          colors.surfaceSoft,

                        borderColor:
                          colors.border,
                      },
                    ]}
                  >

                    <Ionicons
                      name="close"
                      size={20}
                      color={
                        colors.textSecondary
                      }
                    />

                  </Pressable>

                </View>


                <View
                  style={styles.sheetContent}
                >

                  <Text
                    style={[
                      styles.historyDescription,
                      {
                        color:
                          colors.textSecondary,
                      },
                    ]}
                  >
                    Choose how long you would like to keep
                    this conversation available. This setting
                    only affects this conversation and can be
                    changed at any time.
                  </Text>


                  {/* RETENTION OPTIONS */}

                  <View
                    style={
                      styles.retentionOptions
                    }
                  >

                    {[
                      '1 Week',
                      '1 Month',
                      '3 Months',
                      '6 Months',
                      'Forever',
                    ].map((opt) => {

                      const selected =
                        retentionMode === opt;


                      const descriptions = {
                        '1 Week':
                          'Ideal for short-term enquiries.',

                        '1 Month':
                          'Recommended for active campaigns.',

                        '3 Months':
                          'Useful for ongoing customer discussions.',

                        '6 Months':
                          'Suitable for long-term business communication.',

                        Forever:
                          'Your conversation remains available until you delete it manually.',
                      };


                      return (

                        <Pressable
                          key={opt}
                          style={[
                            styles.radioOption,

                            {
                              backgroundColor:
                                selected
                                  ? colors.iconBackground
                                  : 'transparent',

                              borderColor:
                                selected
                                  ? isDarkMode
                                    ? 'rgba(139,92,246,0.25)'
                                    : isSeller
                                      ? '#DDD0FF'
                                      : '#CFE0FF'
                                  : 'transparent',
                            },
                          ]}
                          onPress={() =>
                            setRetentionMode(
                              opt
                            )
                          }
                        >

                          {/* RADIO */}

                          <View
                            style={[
                              styles.radioCircle,

                              {
                                borderColor:
                                  selected
                                    ? accent
                                    : colors.borderStrong,
                              },
                            ]}
                          >

                            {selected && (

                              <View
                                style={[
                                  styles.radioInner,
                                  {
                                    backgroundColor:
                                      accent,
                                  },
                                ]}
                              />

                            )}

                          </View>


                          {/* TEXT */}

                          <View
                            style={
                              styles.radioTextWrap
                            }
                          >

                            <Text
                              style={[
                                styles.radioTitle,
                                {
                                  color:
                                    colors.text,
                                },
                              ]}
                            >
                              {opt === 'Forever'
                                ? 'Keep Forever'
                                : `Keep for ${opt}`}
                            </Text>


                            <Text
                              style={[
                                styles.radioDesc,
                                {
                                  color:
                                    colors.textSecondary,
                                },
                              ]}
                            >
                              {descriptions[opt]}
                            </Text>

                          </View>


                          {/* RECOMMENDED */}

                          {opt ===
                            'Forever' && (

                              <View
                                style={[
                                  styles.recommendedBadge,
                                  {
                                    backgroundColor:
                                      colors.iconBackground,

                                    borderColor:
                                      isDarkMode
                                        ? 'rgba(139,92,246,0.20)'
                                        : isSeller
                                          ? '#DDD0FF'
                                          : '#CFE0FF',
                                  },
                                ]}
                              >

                                <Ionicons
                                  name="star"
                                  size={11}
                                  color={accent}
                                />

                                <Text
                                  style={[
                                    styles.recommendedBadgeText,
                                    {
                                      color:
                                        accent,
                                    },
                                  ]}
                                >
                                  Recommended
                                </Text>

                              </View>

                            )}

                        </Pressable>
                      );
                    })}

                  </View>


                  {/* INFO CARD */}

                  <View
                    style={[
                      styles.infoCard,
                      {
                        backgroundColor:
                          colors.infoBackground,

                        borderColor:
                          colors.border,
                      },
                    ]}
                  >

                    <View
                      style={[
                        styles.infoIconWrap,
                        {
                          backgroundColor:
                            colors.iconBackground,
                        },
                      ]}
                    >

                      <Ionicons
                        name="information-circle-outline"
                        size={19}
                        color={accent}
                      />

                    </View>


                    <Text
                      style={[
                        styles.infoCardText,
                        {
                          color:
                            colors.textSecondary,
                        },
                      ]}
                    >
                      Your conversations may contain quotations,
                      offers, and important business discussions.
                      Keeping your chat history helps you revisit
                      previous conversations whenever needed.
                    </Text>

                  </View>


                  {/* ACTIONS */}

                  <View
                    style={
                      styles.sheetActionRow
                    }
                  >

                    <Pressable
                      style={[
                        styles.sheetBtnSecondary,
                        {
                          borderColor:
                            colors.border,
                        },
                      ]}
                      onPress={() =>
                        setSettingsMode(
                          'MAIN'
                        )
                      }
                    >

                      <Text
                        style={[
                          styles.sheetBtnSecondaryText,
                          {
                            color:
                              colors.textSecondary,
                          },
                        ]}
                      >
                        Cancel
                      </Text>

                    </Pressable>


                    <Pressable
                      style={styles.sheetBtnPrimary}
                      onPress={() => {

                        setShowSettingsMenu(
                          false
                        );

                        showToast(
                          'Chat history preference updated successfully.'
                        );
                      }}
                    >

                      <LinearGradient
                        colors={[
                          accent,
                          accentDark,
                        ]}
                        start={{
                          x: 0,
                          y: 0,
                        }}
                        end={{
                          x: 1,
                          y: 1,
                        }}
                        style={
                          styles.sheetPrimaryGradient
                        }
                      >

                        <Ionicons
                          name="checkmark-circle-outline"
                          size={18}
                          color="#FFFFFF"
                        />

                        <Text
                          style={
                            styles.sheetBtnPrimaryText
                          }
                        >
                          Save Preference
                        </Text>

                      </LinearGradient>

                    </Pressable>

                  </View>

                </View>

              </>
            )}

          </View>

        </View>

      </Modal>


      {/* =====================================================
          TOAST
      ===================================================== */}

      {toastMessage && (

        <View
          style={[
            styles.toastContainer,
            {
              backgroundColor:
                isDarkMode
                  ? '#1B1830'
                  : '#172033',

              borderColor:
                isDarkMode
                  ? colors.borderStrong
                  : 'transparent',
            },
          ]}
        >

          <View
            style={[
              styles.toastIcon,
              {
                backgroundColor:
                  `${accent}25`,
              },
            ]}
          >

            <Ionicons
              name="checkmark"
              size={15}
              color={accentLight}
            />

          </View>


          <Text
            style={styles.toastText}
          >
            {toastMessage}
          </Text>

        </View>

      )}

    </SafeAreaView>
  );
}


// =========================================================
// STYLES
// =========================================================

const styles = StyleSheet.create({

  safeArea: {
    flex: 1,
  },

  container: {
    flex: 1,
  },


  // -------------------------------------------------------
  // HEADER
  // -------------------------------------------------------

  header: {
    flexDirection: 'row',
    alignItems: 'center',

    minHeight: 72,

    paddingHorizontal: 14,
    paddingVertical: 10,

    borderBottomWidth: 1,

    zIndex: 10,
  },

  backBtn: {
    width: 42,
    height: 42,

    borderRadius: 14,

    justifyContent: 'center',
    alignItems: 'center',

    borderWidth: 1,
  },

  headerProfileContainer: {
    flex: 1,

    flexDirection: 'row',
    alignItems: 'center',

    marginLeft: 12,
    marginRight: 8,
  },

  headerAvatarWrap: {
    width: 43,
    height: 43,

    borderRadius: 15,

    justifyContent: 'center',
    alignItems: 'center',

    position: 'relative',

    marginRight: 11,

    shadowOffset: {
      width: 0,
      height: 4,
    },

    shadowOpacity: 0.22,
    shadowRadius: 7,

    elevation: 4,
  },

  headerAvatarText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },

  onlineBadge: {
    position: 'absolute',

    width: 12,
    height: 12,

    borderRadius: 6,

    right: -2,
    bottom: -2,

    backgroundColor: '#22C55E',

    borderWidth: 2,
  },

  headerTitleContainer: {
    flex: 1,
  },

  headerTitle: {
    fontSize: 17,
    fontWeight: '750',

    maxWidth: '100%',
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',

    marginTop: 4,
  },

  statusDot: {
    width: 7,
    height: 7,

    borderRadius: 4,

    marginRight: 6,
  },

  headerSubtitle: {
    fontSize: 12.5,
    fontWeight: '500',
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  headerActionBtn: {
    width: 40,
    height: 40,

    borderRadius: 13,

    justifyContent: 'center',
    alignItems: 'center',

    borderWidth: 1,
  },


  // -------------------------------------------------------
  // CHAT
  // -------------------------------------------------------

  chatBackground: {
    flex: 1,
  },

  listContent: {
    paddingHorizontal: 14,
    paddingTop: 8,

    flexGrow: 1,

    justifyContent: 'flex-end',
  },

  loaderContainer: {
    flex: 1,

    justifyContent: 'center',
    alignItems: 'center',
  },

  loaderCircle: {
    width: 52,
    height: 52,

    borderRadius: 18,

    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    fontSize: 13,
    fontWeight: '500',

    marginTop: 10,
  },


  // -------------------------------------------------------
  // MESSAGE
  // -------------------------------------------------------

  msgWrapper: {
    flexDirection: 'row',

    marginBottom: 2,

    alignItems: 'flex-end',
  },

  msgWrapperMe: {
    justifyContent: 'flex-end',
  },

  msgWrapperOther: {
    justifyContent: 'flex-start',
  },

  msgContentCol: {
    maxWidth: '84%',
  },

  senderNameRow: {
    flexDirection: 'row',
    alignItems: 'center',

    marginBottom: 5,
    marginLeft: 4,
  },

  senderNameText: {
    fontSize: 12,

    fontWeight: '650',
  },

  tinyAvatar: {
    width: 19,
    height: 19,

    borderRadius: 7,

    justifyContent: 'center',
    alignItems: 'center',

    marginRight: 6,
  },

  tinyAvatarText: {
    color: '#FFFFFF',

    fontSize: 9,
    fontWeight: '800',
  },

  msgBubble: {
    paddingHorizontal: 13,
    paddingVertical: 9,

    borderRadius: 18,

    borderWidth: 1,
  },

  msgBubbleMe: {
    borderColor: 'rgba(255,255,255,0.08)',

    borderBottomRightRadius: 5,
  },

  msgBubbleOther: {
    borderBottomLeftRadius: 5,
  },

  textBubbleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',

    flexWrap: 'wrap',
  },

  msgText: {
    fontSize: 15,

    lineHeight: 21.5,

    flexShrink: 1,
  },

  msgTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',

    marginTop: 3,

    alignSelf: 'flex-end',
  },

  msgTime: {
    fontSize: 9.5,

    marginLeft: 7,
  },


  // -------------------------------------------------------
  // IMAGE
  // -------------------------------------------------------

  imageBubbleContainer: {
    position: 'relative',
  },

  messageImage: {
    width: 225,
    height: 225,

    borderRadius: 15,

    backgroundColor: '#1E293B',

    borderWidth: 1,
  },

  imageTimeOverlay: {
    position: 'absolute',

    bottom: 7,
    right: 7,

    flexDirection: 'row',
    alignItems: 'center',

    paddingHorizontal: 7,
    paddingVertical: 4,

    borderRadius: 10,
  },

  imageTimeText: {
    fontSize: 10,
    color: '#FFFFFF',
  },


  // -------------------------------------------------------
  // DOCUMENT
  // -------------------------------------------------------

  documentCard: {
    width: 215,

    flexDirection: 'row',
    alignItems: 'center',

    padding: 9,

    borderRadius: 14,

    borderWidth: 1,
  },

  documentIconWrap: {
    width: 40,
    height: 40,

    borderRadius: 11,

    justifyContent: 'center',
    alignItems: 'center',

    marginRight: 10,
  },

  documentName: {
    fontSize: 13.5,

    fontWeight: '650',
  },

  documentOpenText: {
    fontSize: 11,

    fontWeight: '550',

    marginTop: 3,
  },


  // -------------------------------------------------------
  // SYSTEM MESSAGE
  // -------------------------------------------------------

  systemMsgContainer: {
    flexDirection: 'row',
    alignItems: 'center',

    alignSelf: 'center',

    maxWidth: '92%',

    paddingHorizontal: 12,
    paddingVertical: 8,

    borderRadius: 13,

    marginVertical: 12,

    borderWidth: 1,
  },

  systemMsgText: {
    fontSize: 11.5,

    lineHeight: 17,

    textAlign: 'center',

    marginLeft: 6,

    flex: 1,
  },


  // -------------------------------------------------------
  // SMART ACTIONS
  // -------------------------------------------------------

  smartActionsContainer: {
    flexDirection: 'row',

    flexWrap: 'wrap',

    marginTop: 8,

    gap: 7,
  },

  smartChip: {
    flexDirection: 'row',
    alignItems: 'center',

    paddingHorizontal: 11,
    paddingVertical: 7,

    borderRadius: 15,

    borderWidth: 1,

    gap: 5,
  },

  smartChipText: {
    fontSize: 11.5,

    fontWeight: '650',
  },


  // -------------------------------------------------------
  // DATE
  // -------------------------------------------------------

  dateSeparator: {
    alignSelf: 'center',

    flexDirection: 'row',
    alignItems: 'center',

    paddingHorizontal: 11,
    paddingVertical: 5,

    borderRadius: 13,

    marginVertical: 12,

    borderWidth: 1,

    gap: 5,
  },

  dateSeparatorText: {
    fontSize: 11,

    fontWeight: '650',
  },


  // -------------------------------------------------------
  // ATTACHMENT MENU
  // -------------------------------------------------------

  attachMenu: {
    flexDirection: 'row',

    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 13,

    justifyContent: 'flex-start',

    gap: 38,

    borderTopWidth: 1,
    borderBottomWidth: 1,
  },

  attachOption: {
    alignItems: 'center',

    minWidth: 80,
  },

  attachIconWrap: {
    width: 48,
    height: 48,

    borderRadius: 15,

    justifyContent: 'center',
    alignItems: 'center',

    marginBottom: 6,
  },

  attachOptionText: {
    fontSize: 11.5,

    fontWeight: '550',

    textAlign: 'center',
  },


  // -------------------------------------------------------
  // INPUT
  // -------------------------------------------------------

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',

    paddingHorizontal: 10,
    paddingTop: 9,

    borderTopWidth: 1,
  },

  attachBtn: {
    width: 42,
    height: 42,

    borderRadius: 14,

    justifyContent: 'center',
    alignItems: 'center',

    borderWidth: 1,

    marginRight: 7,
    marginBottom: 1,
  },

  inputWrapper: {
    flex: 1,

    minHeight: 43,
    maxHeight: 120,

    borderRadius: 17,

    borderWidth: 1,

    justifyContent: 'center',
  },

  input: {
    minHeight: 43,
    maxHeight: 120,

    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,

    fontSize: 15,

    textAlignVertical: 'center',
  },

  sendBtn: {
    marginLeft: 7,
    marginBottom: 1,
  },

  sendButton: {
    width: 43,
    height: 43,

    borderRadius: 15,

    justifyContent: 'center',
    alignItems: 'center',

    borderWidth: 1,
  },


  // -------------------------------------------------------
  // MODAL
  // -------------------------------------------------------

  modalOverlay: {
    flex: 1,

    justifyContent: 'flex-end',
  },

  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },

  bottomSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,

    borderWidth: 1,

    borderBottomWidth: 0,

    paddingHorizontal: 16,
    paddingTop: 9,

    paddingBottom:
      Platform.OS === 'ios'
        ? 32
        : 22,

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: -8,
    },

    shadowOpacity: 0.22,

    shadowRadius: 20,

    elevation: 18,
  },

  sheetHandle: {
    alignItems: 'center',

    marginBottom: 10,
  },

  sheetHandleBar: {
    width: 38,
    height: 4,

    borderRadius: 3,
  },

  sheetHeader: {
    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',

    marginBottom: 15,

    paddingHorizontal: 2,
  },

  sheetTitle: {
    fontSize: 20,

    fontWeight: '750',
  },

  sheetSubtitleSmall: {
    fontSize: 11.5,

    marginTop: 3,
  },

  sheetCloseBtn: {
    width: 38,
    height: 38,

    borderRadius: 13,

    justifyContent: 'center',
    alignItems: 'center',

    borderWidth: 1,
  },

  sheetContent: {
    marginTop: 2,
  },


  // -------------------------------------------------------
  // SHEET OPTIONS
  // -------------------------------------------------------

  sheetOption: {
    minHeight: 68,

    flexDirection: 'row',

    alignItems: 'center',

    paddingHorizontal: 10,
    paddingVertical: 10,

    borderRadius: 16,

    borderWidth: 1,

    marginBottom: 8,
  },

  sheetOptionIcon: {
    width: 40,
    height: 40,

    borderRadius: 13,

    justifyContent: 'center',
    alignItems: 'center',

    marginRight: 11,
  },

  sheetOptionTextWrap: {
    flex: 1,
  },

  sheetOptionText: {
    fontSize: 14.5,

    fontWeight: '650',
  },

  sheetOptionDescription: {
    fontSize: 11.5,

    marginTop: 3,

    lineHeight: 16,
  },


  // -------------------------------------------------------
  // HISTORY
  // -------------------------------------------------------

  historyHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  historyBackBtn: {
    width: 38,
    height: 38,

    borderRadius: 12,

    justifyContent: 'center',
    alignItems: 'center',

    borderWidth: 1,

    marginRight: 10,
  },

  historyDescription: {
    fontSize: 13.5,

    lineHeight: 20,

    marginBottom: 15,

    paddingHorizontal: 2,
  },

  retentionOptions: {
    marginBottom: 8,
  },

  radioOption: {
    flexDirection: 'row',

    alignItems: 'flex-start',

    minHeight: 62,

    paddingHorizontal: 9,
    paddingVertical: 9,

    borderRadius: 15,

    borderWidth: 1,

    marginBottom: 5,
  },

  radioCircle: {
    width: 21,
    height: 21,

    borderRadius: 11,

    borderWidth: 2,

    alignItems: 'center',
    justifyContent: 'center',

    marginRight: 10,

    marginTop: 1,
  },

  radioInner: {
    width: 10,
    height: 10,

    borderRadius: 5,
  },

  radioTextWrap: {
    flex: 1,
  },

  radioTitle: {
    fontSize: 14.5,

    fontWeight: '650',

    marginBottom: 3,
  },

  radioDesc: {
    fontSize: 11.5,

    lineHeight: 16,
  },

  recommendedBadge: {
    flexDirection: 'row',

    alignItems: 'center',

    paddingHorizontal: 7,
    paddingVertical: 5,

    borderRadius: 9,

    borderWidth: 1,

    marginLeft: 6,

    gap: 3,
  },

  recommendedBadgeText: {
    fontSize: 9.5,

    fontWeight: '750',
  },


  // -------------------------------------------------------
  // INFO CARD
  // -------------------------------------------------------

  infoCard: {
    flexDirection: 'row',

    padding: 12,

    borderRadius: 15,

    borderWidth: 1,

    marginTop: 7,
    marginBottom: 15,
  },

  infoIconWrap: {
    width: 32,
    height: 32,

    borderRadius: 10,

    justifyContent: 'center',
    alignItems: 'center',

    marginRight: 9,
  },

  infoCardText: {
    flex: 1,

    fontSize: 11.5,

    lineHeight: 17,
  },


  // -------------------------------------------------------
  // SHEET BUTTONS
  // -------------------------------------------------------

  sheetActionRow: {
    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'flex-end',
  },

  sheetBtnSecondary: {
    minHeight: 47,

    paddingHorizontal: 16,

    borderRadius: 14,

    justifyContent: 'center',
    alignItems: 'center',

    borderWidth: 1,

    marginRight: 8,
  },

  sheetBtnSecondaryText: {
    fontSize: 14,

    fontWeight: '650',
  },

  sheetBtnPrimary: {
    minHeight: 47,

    borderRadius: 14,

    overflow: 'hidden',

    minWidth: 155,
  },

  sheetPrimaryGradient: {
    flex: 1,

    minHeight: 47,

    flexDirection: 'row',

    justifyContent: 'center',
    alignItems: 'center',

    paddingHorizontal: 16,

    gap: 7,
  },

  sheetBtnPrimaryText: {
    color: '#FFFFFF',

    fontSize: 13.5,

    fontWeight: '700',
  },


  // -------------------------------------------------------
  // TOAST
  // -------------------------------------------------------

  toastContainer: {
    position: 'absolute',

    bottom:
      Platform.OS === 'ios'
        ? 105
        : 82,

    left: 16,
    right: 16,

    minHeight: 50,

    borderRadius: 16,

    paddingHorizontal: 12,

    flexDirection: 'row',
    alignItems: 'center',

    borderWidth: 1,

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: 5,
    },

    shadowOpacity: 0.22,

    shadowRadius: 10,

    elevation: 8,
  },

  toastIcon: {
    width: 30,
    height: 30,

    borderRadius: 10,

    justifyContent: 'center',
    alignItems: 'center',

    marginRight: 9,
  },

  toastText: {
    color: '#FFFFFF',

    fontSize: 13,

    fontWeight: '550',

    flex: 1,
  },
});