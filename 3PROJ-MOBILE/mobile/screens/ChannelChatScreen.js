import React, { useEffect, useState, useContext, useRef } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Image, Linking, Alert, Modal
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { API_URL } from '../config';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { createStyles } from '../components/channelChatStyles';
import { useNavigation } from '@react-navigation/native';
import  socket  from '../socket'
import { formatContent } from '../utils/formatContent';
  const fixFileUrl = (url) => {
    if (!url) return '';
    return url
      .replace('http://localhost:5051', API_URL)
      .replace('http://127.0.0.1:5051', API_URL)
      .replace('localhost', API_URL.replace(/^https?:\/\//, ''))
      .replace('127.0.0.1', API_URL.replace(/^https?:\/\//, ''));
  };


const emojiOptions = ['❤️', '😂', '😮', '😢', '👍', '👎'];

const ChannelChatScreen = () => {
  const { params } = useRoute();
  const { channelId } = params;
  const { token, user } = useContext(AuthContext);
  const { dark } = useContext(ThemeContext);
  const navigation = useNavigation();
  const styles = createStyles(dark);
  const flatListRef = useRef();
  const [knownMentions, setKnownMentions] = useState(new Set());
  const [channelMap, setChannelMap] = useState({});


  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [channelName, setChannelName] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [showReactionsFor, setShowReactionsFor] = useState(null);
  const [reactionDetail, setReactionDetail] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [channel, setChannel] = useState(null);




  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/channels/${channelId}/messages`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMessages(res.data);
      } catch (err) {
        console.error('Erreur chargement messages :', err.response?.data || err.message);
      }
    };

    const fetchChannel = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/channels/${channelId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setChannelName(res.data.name || '(canal)');
        setIsCreator(res.data.isCreator || false);
        setIsMember(res.data.isMember || false);
        setChannel(res.data);

        // ✅ Construction dynamique du channelMap (hashtag #channel)
        if (res.data.workspace?.channels?.length > 0) {
          const map = {};
          res.data.workspace.channels.forEach(ch => {
            if (ch?.name && ch?._id) {
              map[ch.name.toLowerCase()] = ch._id;
            }
          });
          setChannelMap(map);
        }

        // ✅ Génération dynamique du Set de mentions connues
        const mentionsSet = new Set();

        if (res.data.members && Array.isArray(res.data.members)) {
          res.data.members.forEach(member => {
            const prenom = member?.prenom?.toLowerCase();
            const nom = member?.nom?.toLowerCase();

            if (prenom && nom) {
              mentionsSet.add(`@${prenom} ${nom}`);
              mentionsSet.add(`@${prenom}.${nom}`);
            }
          });
        }

        setKnownMentions(mentionsSet); // à déclarer dans ton useState()
      } catch (err) {
        console.error('Erreur chargement canal :', err.response?.data || err.message);
      }
    };

    if (channelId && token) {
      fetchMessages();
      fetchChannel();
    }
  }, [channelId]);

  useEffect(() => {
    if (!socket || !channelId) return;

    // 1. Rejoindre la room du canal
    socket.emit('join_channel', channelId);
    socket.emit('join', user._id);

    const handleKick = ({ channelId: removedChannelId }) => {
      if (removedChannelId === channelId) {
        Alert.alert(
          '⛔ Accès retiré',
          'Vous avez été retiré de ce canal.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    };

    socket.on('removed_from_channel', handleKick);

    // 🟡 ➕ AJOUTE ICI LES LISTENERS TEMPS RÉEL (messages & réactions)
    // 👇👇👇 à coller juste après `socket.on('removed_from_channel', handleKick);`

    socket.on('new_channel_message', (msg) => {
      console.log('📨 Nouveau message reçu en live', msg); // << ASTUCE LOG
      if (msg.channel === channelId) {
        setMessages(prev => {
          const exists = prev.some(m => m._id === msg._id);
          return exists ? prev : [...prev, msg];
        });
      }
    });

   socket.on('channel_reaction_updated', ({ messageId, emoji, user }) => {
     setMessages(prev =>
       prev.map(msg =>
         msg._id === messageId
           ? {
               ...msg,
               reactions: [
                 ...(msg.reactions || []).filter(r => r.user?._id !== user._id),
                 { user, emoji }
               ]
             }
           : msg
       )
     );
   });

   socket.on('channel_reaction_removed', ({ messageId, userId }) => {
     setMessages(prev =>
       prev.map(msg =>
         msg._id === messageId
           ? {
               ...msg,
               reactions: (msg.reactions || []).filter(r =>
                 (r.user?._id || r.userId?.toString()) !== userId.toString()
               )
             }
           : msg
       )
     );
   });


    // 🧹 Nettoyage
    return () => {
      socket.off('removed_from_channel', handleKick);
      socket.off('new_channel_message');
      socket.off('channel_reaction_updated');
      socket.off('channel_reaction_removed');
    };
  }, [channelId]);

  const handleSend = () => {
    if (!input.trim() || !user?._id || !channelId) return;

    const msg = {
      channelId,
      senderId: user._id,
      content: input,
      type: 'text',
      createdAt: new Date().toISOString(),
    };

    socket.emit('channel_message', msg);
    setInput('');
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        console.log('⚠️ Sélection annulée ou vide');
        return;
      }

      const file = result.assets[0];

      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/octet-stream',
      });

      const res = await axios.post(`${API_URL}/api/channels/upload/channel/${channelId}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });


      flatListRef.current?.scrollToEnd({ animated: true });

    } catch (err) {
      console.error('❌ Erreur upload fichier :', err.message, err.response?.data);
      Alert.alert('Erreur', 'Échec de l’envoi');
    }
  };



  const toggleReaction = async (messageId, currentReaction, emoji) => {
    try {
      if (currentReaction) {
        await axios.request({
          url: `${API_URL}/api/channels/reaction/${messageId}`,
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
          data: { userId: user._id }, // attention : pas params
        });
      }else {
        await axios.post(`${API_URL}/api/channels/reaction/${messageId}`, {
          emoji,
        }, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }


    } catch (err) {
      console.error('Erreur réaction emoji :', err.response?.data || err.message);
    }
  };

  const renderItem = ({ item }) => {

    const senderId = typeof item.senderId === 'object' ? item.senderId._id : item.senderId;
    const isMine = senderId === user._id;
    const sender = typeof item.senderId === 'object' ? item.senderId : null;
    const senderName = isMine ? user.prenom : sender?.prenom || 'Utilisateur';

    const imageUrl = fixFileUrl(item.attachmentUrl);


    const messageTextStyle = isMine ? styles.messageText : styles.messageTextReceiver;
    const senderTextStyle = isMine ? styles.senderText : styles.senderTextReceiver;

    return (
      <View style={{ marginVertical: 4 }}>
        <View style={[styles.messageBubble, isMine ? styles.myMessage : styles.otherMessage]}>
         <Text style={senderTextStyle}>{senderName} :</Text>



          {item.content && (
            <TouchableOpacity onLongPress={() => setShowReactionsFor(item._id)}>
              {formatContent(item.content, channelMap, channel?.workspace?._id, navigation, knownMentions)}
            </TouchableOpacity>
          )}

          {item.attachmentUrl && (
            item.attachmentUrl.match(/\.(jpg|jpeg|png|gif)$/i) ? (
              <TouchableOpacity onPress={() => {
                setSelectedImage(imageUrl);
                setIsModalVisible(true);
              }} onLongPress={() => setShowReactionsFor(item._id)}>
                <Image source={{ uri: imageUrl }} style={{ width: 180, height: 180, borderRadius: 10, marginTop: 5 }} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => Linking.openURL(item.attachmentUrl)} onLongPress={() => setShowReactionsFor(item._id)}>
                <Text style={styles.fileLink}>📄 {item.attachmentUrl.split('/').pop()}</Text>
              </TouchableOpacity>
            )
          )}

          <Text style={styles.timestamp}>
            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>

        {item.reactions?.length > 0 && (
          <View style={{ flexDirection: 'row', marginTop: 4, marginLeft: isMine ? 'auto' : 10 }}>
            {item.reactions.map((r, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => setReactionDetail({ emoji: r.emoji, users: item.reactions.filter(e => e.emoji === r.emoji) })}
              >
                <Text style={{ fontSize: 12, backgroundColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 6, marginRight: 4 }}>{r.emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {showReactionsFor === item._id && (
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 4 }}>
            <TouchableOpacity
              onPress={async () => {
                try {
                  await axios.request({
                    url: `${API_URL}/api/channels/reaction/${item._id}`,
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` },
                    data: { userId: user._id },
                  });

                  const res = await axios.get(`${API_URL}/api/channels/${channelId}/messages`, {
                    headers: { Authorization: `Bearer ${token}` },
                  });
                  setMessages(res.data);
                } catch (err) {
                  console.error('Erreur suppression réaction via croix :', err.response?.data || err.message);
                } finally {
                  setShowReactionsFor(null);
                }
              }}
              style={{ marginHorizontal: 4 }}
            >
              <Ionicons name="close-circle-outline" size={18} color="#888" />
            </TouchableOpacity>


            {emojiOptions.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                onPress={() => {
                  toggleReaction(item._id, null, emoji);
                  setShowReactionsFor(null);
                }}
              >
                <Text style={{ fontSize: 22, marginHorizontal: 4 }}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

      </View>
    );
  };
const filteredMessages = messages.filter(msg =>
  (msg.content && msg.content.toLowerCase().includes(searchQuery.toLowerCase())) ||
  (msg.senderId?.prenom && msg.senderId.prenom.toLowerCase().includes(searchQuery.toLowerCase())) ||
  (msg.attachmentUrl && msg.attachmentUrl.toLowerCase().includes(searchQuery.toLowerCase()))
);
  return (

    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.navigate('ChannelDetail', { channelId })}>
          <Text style={styles.channelTitle}>#{channelName}</Text>
        </TouchableOpacity>


        {showSearchInput && (
          <TextInput
            placeholder="Rechercher..."
            placeholderTextColor="#999"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        )}

        <TouchableOpacity onPress={() => setShowSearchInput(!showSearchInput)} style={styles.searchIconContainer}>
          <Ionicons name="search" size={22} color={dark ? '#fff' : '#000'} />
        </TouchableOpacity>
      </View>



      <FlatList
        ref={flatListRef}
       data={filteredMessages}
        keyExtractor={(item, index) => item._id ? item._id.toString() : `key-${index}`}
        renderItem={renderItem}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {isMember || isCreator ?(
        <View style={styles.footerBar}>
          <View style={styles.inputContainer}>
            <TextInput
              value={input}
              onChangeText={setInput}
              style={styles.inputWebStyle}
              placeholder="Message..."
              placeholderTextColor="#999"
            />
          </View>
          <TouchableOpacity onPress={handlePickFile}>
            <Ionicons name="add" size={24} color="#999" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
            <Ionicons name="arrow-up" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ padding: 12, backgroundColor: '#f3f4f6', alignItems: 'center' }}>
          <Text style={{ color: '#999' }}>Vous devez être membre de ce canal pour envoyer un message.</Text>
        </View>
      )}


      <Modal visible={isModalVisible} transparent>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }}
          onPress={() => setIsModalVisible(false)}
        >
          <Image
            source={{ uri: selectedImage }}
            style={{ width: '90%', height: '80%', resizeMode: 'contain' }}
          />
        </TouchableOpacity>
      </Modal>
      <Modal visible={!!reactionDetail} transparent animationType="fade">
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}
          onPress={() => setReactionDetail(null)}
        >
          <View style={{ backgroundColor: '#fff', padding: 20, borderRadius: 10 }}>
            <Text style={{ fontWeight: 'bold', marginBottom: 10 }}>Réactions {reactionDetail?.emoji}</Text>
            {reactionDetail?.users?.map((r, i) => (
              <Text key={i}>{r.user?.prenom || 'Utilisateur inconnu'}</Text>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

    </KeyboardAvoidingView>
  );

};



export default ChannelChatScreen;
