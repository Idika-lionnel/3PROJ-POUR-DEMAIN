import { format } from 'date-fns';
import React, { useEffect, useRef, useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Image,
  Linking,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import socket from '../socket';
import axios from 'axios';
import * as DocumentPicker from 'expo-document-picker';
import { AuthContext } from '../context/AuthContext';
import { API_URL } from '../config';
import { ThemeContext } from '../context/ThemeContext';
import AvatarWithStatus from './AvatarWithStatus';

const fixFileUrl = (url) => {
  if (!url) return '';
  return url
    .replace('http://localhost:5051', API_URL)
    .replace('http://127.0.0.1:5051', API_URL)
    .replace('localhost', API_URL.replace(/^https?:\/\//, ''))
    .replace('127.0.0.1', API_URL.replace(/^https?:\/\//, ''));
};

const emojiOptions = ['❤️', '😂', '😮', '😢', '👍', '👎'];

const DirectChatBox = ({ receiver, contacts, currentUserId: propUserId }) => {
  const { user } = useContext(AuthContext);
  const currentUserId = propUserId || user?._id;
  const [receiverStatus, setReceiverStatus] = useState(receiver?.status || 'offline');

  const [log, setLog] = useState([]);
  const [searchVisible, setSearchVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  //const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [reactionPickerVisible, setReactionPickerVisible] = useState(null);
  const [selectedEmoji, setSelectedEmoji] = useState(null);
  const [showReactionsFor, setShowReactionsFor] = useState(null);
  const flatRef = useRef();

  const fetchMessages = async () => {
    if (!receiver?._id || !currentUserId) return;
    const res = await axios.get(`${API_URL}/api/messages/${receiver._id}?currentUserId=${currentUserId}`);
    setLog(res.data);
    await axios.patch(`${API_URL}/api/messages/read/${receiver._id}/${currentUserId}`);
  };

  useEffect(() => {
    if (receiver?._id && currentUserId) {
      fetchMessages();
    }
  }, [receiver]);

  useEffect(() => {
    flatRef.current?.scrollToEnd({ animated: true });
  }, [log]);

  useEffect(() => {
    if (!currentUserId) return;
    socket.emit('join', currentUserId);

    const handler = async (msg) => {
      const isForThisChat =
        (msg.senderId === receiver._id && msg.receiverId === currentUserId) ||
        (msg.receiverId === receiver._id && msg.senderId === currentUserId);

      const alreadyExists = log.some((m) =>
        (m._id && msg._id && m._id === msg._id) ||
        (m.tempId && msg.tempId && m.tempId === msg.tempId)
      );
      if (isForThisChat && !alreadyExists) {
        setLog((prev) => [...prev, msg]);

        if (msg.senderId === receiver._id) {
          await axios.patch(`${API_URL}/api/messages/read/${receiver._id}/${currentUserId}`);
        }
      }
    };

    const handleReactionUpdate = ({ messageId, userId, emoji }) => {
      setLog(prev =>
        prev.map(msg =>
          msg._id === messageId
            ? {
                ...msg,
                reactions: [
                  ...(msg.reactions || []).filter(r => r.userId !== userId),
                  { userId, emoji },
                ],
              }
            : msg
        )
      );
    };

    const handleReactionRemove = ({ messageId, userId }) => {
      setLog(prev =>
        prev.map(msg =>
          msg._id === messageId
            ? {
                ...msg,
                reactions: (msg.reactions || []).filter(r => r.userId !== userId),
              }
            : msg
        )
      );
    };

    socket.on('new_direct_message', handler);
    socket.on('reaction_updated', handleReactionUpdate);
    socket.on('reaction_removed', handleReactionRemove);

    return () => {
      socket.off('new_direct_message', handler);
      socket.off('reaction_updated', handleReactionUpdate);
      socket.off('reaction_removed', handleReactionRemove);
    };
  }, [receiver, currentUserId, log]);
  useEffect(() => {
    const handleStatusUpdate = ({ userId, newStatus }) => {
      if (receiver && receiver._id === userId) {
        setReceiverStatus(newStatus);
      }
    };

    socket.on('user_status_updated', handleStatusUpdate);
    return () => socket.off('user_status_updated', handleStatusUpdate);
  }, [receiver]);

  const sendMessage = () => {
    if (!message.trim() || !currentUserId || !receiver?._id) return;
    const msg = {
      senderId: currentUserId,
      receiverId: receiver._id,
      message,
      type: 'text',
      timestamp: new Date().toISOString(),
    };
    socket.emit('direct_message', msg);
    setMessage('');
  };

  const sendFile = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: '*/*' });
    if (res.canceled) return;

    const file = res.assets[0];
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.mimeType || 'application/octet-stream',
    });
    formData.append('senderId', currentUserId);
    formData.append('receiverId', receiver._id);
    formData.append('type', 'file');

    try {
      const result = await axios.post(`${API_URL}/api/messages/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const tempId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      const finalMsg = { ...result.data, tempId };
      socket.emit('direct_message', finalMsg);
    } catch (err) {
      console.error('Erreur envoi fichier :', err.response?.data || err.message);
    }
  };

  const toggleReaction = async (messageId, currentReaction, emoji) => {
    try {
      if (currentReaction) {
        await axios.delete(`${API_URL}/api/messages/reaction/${messageId}`, {
          data: { userId: currentUserId },
        });
      } else {
        await axios.post(`${API_URL}/api/messages/reaction/${messageId}`, {
          userId: currentUserId,
          emoji,
        });
      }
    } catch (err) {
      console.error('Erreur réaction :', err.response?.data || err.message);
    }
  };

  const filteredMessages = log.filter((msg) => {
    if (!searchTerm) return true;
    const lower = searchTerm.toLowerCase();
    return (
      msg.message?.toLowerCase().includes(lower) ||
      msg.content?.toLowerCase().includes(lower) ||
      msg.attachmentUrl?.toLowerCase().includes(lower)
    );
  });

  const renderItem = ({ item }) => {
    const isMe = item.senderId === currentUserId;
    const fullUrl = fixFileUrl(item.attachmentUrl);


    const timestamp = item.timestamp ? format(new Date(item.timestamp), 'HH:mm') : '';
    const timestampStyle = isMe ? styles.timestampRight : styles.timestampLeft;

    const currentUserReaction = (item.reactions || []).find(r => r.userId === currentUserId);
    const showEmojiBar = showReactionsFor === item._id;

    const handleLongPress = () => setShowReactionsFor(item._id);

    if (item.attachmentUrl && /\.(jpg|jpeg|png|gif)$/i.test(item.attachmentUrl)) {
      return (
        <View style={styles.messageBlock}>
          <TouchableOpacity
            onPress={() => {
              setSelectedImage(fullUrl);
              setIsModalVisible(true);
            }}
            style={{ alignSelf: isMe ? 'flex-end' : 'flex-start' }}
            onLongPress={handleLongPress}
          >
            <Image source={{ uri: fullUrl }} style={styles.image} />
          </TouchableOpacity>
          {showEmojiBar && (
            <View style={styles.emojiBar}>
              {emojiOptions.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  onPress={() => {
                    setSelectedEmoji(emoji);
                    toggleReaction(item._id, currentUserReaction, emoji);
                    setShowReactionsFor(null);
                  }}
                >
                  <Text style={styles.emoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <Text style={timestampStyle}>{timestamp}</Text>
          {item.reactions?.length > 0 && (
            <View
              style={[
                styles.reactionRow,
                { alignSelf: isMe ? 'flex-end' : 'flex-start' },
              ]}
            >
              {item.reactions.map((r, i) => (
                <Text key={i} style={styles.reactionEmoji}>{r.emoji}</Text>
              ))}
            </View>
          )}
        </View>
      );
    }

    if (item.attachmentUrl) {
      const isMeStyle = isMe ? styles.bubbleMe : styles.bubbleYou;
      return (
        <View style={styles.messageBlock}>
          <TouchableOpacity
            style={isMeStyle}
            onPress={() => Linking.openURL(fullUrl)}
            onLongPress={handleLongPress}
          >
            <Text style={{ color: isMe ? '#fff' : '#224262' }}>
              📎 {item.attachmentUrl.split('/').pop()}
            </Text>
          </TouchableOpacity>
          {showEmojiBar && (
            <View style={styles.emojiBar}>
              {emojiOptions.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  onPress={() => {
                    setSelectedEmoji(emoji);
                    toggleReaction(item._id, currentUserReaction, emoji);
                    setShowReactionsFor(null);
                  }}
                >
                  <Text style={styles.emoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <Text style={timestampStyle}>{timestamp}</Text>
          {item.reactions?.length > 0 && (
            <View
              style={[
                styles.reactionRow,
                { alignSelf: isMe ? 'flex-end' : 'flex-start' },
              ]}
            >
              {item.reactions.map((r, i) => (
                <Text key={i} style={styles.reactionEmoji}>{r.emoji}</Text>
              ))}
            </View>
          )}
        </View>
      );
    }

    const isMeStyle = isMe ? styles.bubbleMe : styles.bubbleYou;

    return (

      <View style={styles.messageBlock}>
        <TouchableOpacity style={isMeStyle} onLongPress={handleLongPress}>
        <Text style={isMe ? styles.text : styles.textYou}>{item.message || item.content}</Text>
        </TouchableOpacity>
        {showEmojiBar && (
          <View style={styles.emojiBar}>
            {emojiOptions.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                onPress={() => {
                  setSelectedEmoji(emoji);
                  toggleReaction(item._id, currentUserReaction, emoji);
                  setShowReactionsFor(null);
                }}
              >
                <Text style={styles.emoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <Text style={timestampStyle}>{timestamp}</Text>
        {item.reactions?.length > 0 && (
          <View
            style={[
              styles.reactionRow,
              { alignSelf: isMe ? 'flex-end' : 'flex-start' },
            ]}
          >
            {item.reactions.map((r, i) => (
              <Text key={i} style={styles.reactionEmoji}>{r.emoji}</Text>
            ))}
          </View>
        )}
      </View>
    );
  };
const { dark } = useContext(ThemeContext);
const styles = createStyles(dark);
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <View style={styles.headerRow}>
          <View style={styles.nameWithStatus}>
            <Text style={styles.channelTitle}>
              {receiver?.prenom} {receiver?.nom}
            </Text>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    receiverStatus === 'online'
                      ? 'green'
                      : receiverStatus === 'busy'
                      ? 'orange'
                      : 'gray',
                },
              ]}
            />
          </View>


          {searchVisible && (
            <TextInput
              placeholder="Rechercher..."
              placeholderTextColor="#999"
              value={searchTerm}
              onChangeText={setSearchTerm}
              style={styles.searchInput}
            />
          )}

          <TouchableOpacity onPress={() => setSearchVisible(!searchVisible)} style={styles.searchIconContainer}>
            <Ionicons name="search" size={22} color={dark ? '#fff' : '#000'} />
          </TouchableOpacity>
        </View>

        <FlatList
          ref={flatRef}
          data={filteredMessages}
          renderItem={renderItem}
          keyExtractor={(item, index) =>
  item._id?.toString() || item.tempId || `msg-${index}`
}
          onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: true })}
          style={{ flex: 1 }}
        />

        <View style={styles.footerBar}>
          <View style={styles.inputContainer}>
            <TextInput
              value={message}
              onChangeText={setMessage}
              style={styles.inputWebStyle}
              placeholder="Message..."
              placeholderTextColor="#999"
            />
          </View>
          <TouchableOpacity onPress={sendFile}>
            <Ionicons name="add" size={24} color="#999" />
          </TouchableOpacity>
          <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
            <Ionicons name="arrow-up" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <Modal visible={isModalVisible} transparent>
          <Pressable style={styles.modalOverlay} onPress={() => setIsModalVisible(false)}>
            <Image source={{ uri: selectedImage }} style={styles.fullImage} resizeMode="contain" />
          </Pressable>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const createStyles = (dark) => StyleSheet.create({
  container: { flex: 1 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingBottom: 8,
    backgroundColor: '#fff',
    gap: 8,
     paddingTop: 4,     // Ajouté
      paddingBottom: 4,  // Réduit
      marginTop: -4,     // Ajouté pour coller à l'entête
  },
    nameWithStatus: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    statusDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      borderWidth: 1.5,
      borderColor: '#fff',
      marginLeft: 6,
    },
  searchInput: {
    flex: 1,
    backgroundColor: '#f1f1f1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    color: dark ? '#fff' : '#000',
    marginRight: 8,
  },
  footerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
    gap: 10,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f1f1f1',
    borderRadius: 20,
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 6,
  },
  inputWebStyle: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 6,
    color: '#000',
  },
  sendButton: {
    backgroundColor: '#1877F2',
    borderRadius: 14,
    padding: 10,
  },
  messageBlock: {
    marginVertical: 6,
    paddingHorizontal: 10,
  },
  bubbleMe: {
    alignSelf: 'flex-end',
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 10,
    maxWidth: '70%',
  },
  bubbleYou: {
    alignSelf: 'flex-start',
    backgroundColor: '#e3f1ff',
    borderRadius: 12,
    padding: 10,
    maxWidth: '70%',
  },
  text: {
    color: '#fff',
    fontSize: 16,
  },
  textYou: {
    color: '#224262',
    fontSize: 16,
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  timestampLeft: {
    fontSize: 10,
    color: '#888',
    alignSelf: 'flex-start',
    marginTop: 2,
    marginLeft: 10,
  },
  timestampRight: {
    fontSize: 10,
    color: '#888',
    alignSelf: 'flex-end',
    marginTop: 2,
    marginRight: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '90%',
    height: '80%',
  },
  emojiBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 4,
    marginTop: 2,
  },
  emoji: {
    fontSize: 22,
    marginHorizontal: 5,
  },
  reactionRow: {
    flexDirection: 'row',
    marginTop: 4,
    paddingHorizontal: 10,
  },
  reactionEmoji: {
    fontSize: 10,
    marginRight: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: '#f1f1f1',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingTop: 0,
    backgroundColor: dark ? '#0f172a' : '#fff',
  },
  channelTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: dark ? '#fff' : '#111',
    marginRight: 8,
  },
  searchIconContainer: {
    padding: 4,
  },

});

export default DirectChatBox;
