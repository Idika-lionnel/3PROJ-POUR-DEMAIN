import React, { useEffect, useState, useContext } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { formatContent } from '../utils/formatContent';
import { API_URL } from '../config';

const MyMentionsScreen = () => {
  const { token } = useContext(AuthContext);
  const [mentions, setMentions] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  // Fonction pour extraire toutes les mentions d’un message
  function extractMentionsFromContent(content = '') {
    const mentionRegex = /@([\wÀ-ÿ]+)[\s.]+([\wÀ-ÿ]+)/g;
    const mentions = new Set();
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      const full1 = `@${match[1]} ${match[2]}`.toLowerCase();
      const full2 = `@${match[1]}.${match[2]}`.toLowerCase();
      mentions.add(full1);
      mentions.add(full2);
    }

    return mentions;
  }

  useEffect(() => {
    const fetchMentions = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/mentions/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMentions(res.data);
      } catch (err) {
        console.error('Erreur chargement mentions mobile :', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMentions();
  }, []);

  const filteredMentions = mentions.filter((m) =>
    (m.content || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleRedirect = (mention) => {
    const { workspaceId, channelId, messageId } = mention;
    if (!workspaceId || !channelId || !messageId) {
      console.warn("Mention invalide :", mention);
      return;
    }

    navigation.navigate('ChannelChat', {
      workspaceId,
      channelId,
      scrollTo: messageId,
    });
  };

  const renderMention = ({ item }) => {
    const knownMentions = extractMentionsFromContent(item.content);

    return (
      <TouchableOpacity style={styles.card} onPress={() => handleRedirect(item)}>
        <Text style={styles.channelName}>
          📢 Canal : {item.channelName || 'Inconnu'}
        </Text>
        <Text style={styles.timestamp}>
          {item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Date inconnue'}
        </Text>
        <View style={styles.content}>
          {item.workspaceId
            ? formatContent(item.content, {}, item.workspaceId, navigation, knownMentions)
            : <Text>{item.content}</Text>
          }
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔔 Mes mentions</Text>

      <TextInput
        style={styles.input}
        placeholder="Rechercher une mention..."
        value={search}
        onChangeText={setSearch}
      />

      {loading ? (
        <Text style={styles.info}>Chargement...</Text>
      ) : filteredMentions.length === 0 ? (
        <Text style={styles.info}>Aucune mention trouvée</Text>
      ) : (
        <FlatList
          data={filteredMentions}
          keyExtractor={(item) => item._id}
          renderItem={renderMention}
        />
      )}
    </View>
  );
};

export default MyMentionsScreen;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  info: { textAlign: 'center', color: '#888' },
  card: {
    backgroundColor: '#f7f7f7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  channelName: { fontWeight: 'bold', color: '#0F71D3' },
  timestamp: { fontSize: 12, color: '#666' },
  content: { marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  link: { marginTop: 10, color: 'red', fontWeight: 'bold' },
});
