import React, { useEffect, useState, useContext } from 'react';
import { View, Text, FlatList, TouchableOpacity, Linking, ActivityIndicator, TextInput } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { API_URL } from '../config';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';

const getEmojiForFile = (url) => {
  const ext = (url || '').split('.').pop().toLowerCase();

  if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return '🖼️';
  if (['pdf'].includes(ext)) return '📕';
  if (['doc', 'docx'].includes(ext)) return '📄';
  if (['xls', 'xlsx'].includes(ext)) return '📊';
  if (['ppt', 'pptx'].includes(ext)) return '📽️';
  if (['zip', 'rar'].includes(ext)) return '🗜️';
  if (['mp4', 'mov', 'avi'].includes(ext)) return '🎥';
  if (['mp3', 'wav'].includes(ext)) return '🎵';
  return '📁'; // emoji par défaut
};

const MyDocumentsScreen = () => {
  const { token } = useContext(AuthContext);
  const { dark } = useContext(ThemeContext);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchDocuments = async () => {
    try {
      const res = await axios.get(`${API_URL}/users/documents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDocuments(res.data?.files || []);

    } catch (err) {
      console.error('Erreur chargement documents :', err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => Linking.openURL(item.attachmentUrl)}
      style={{
        backgroundColor: dark ? '#1e293b' : '#e5e7eb',
        padding: 14,
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
      }}
    >
      <Text style={{ fontSize: 24, marginRight: 14 }}>
  {getEmojiForFile(item.attachmentUrl)}
</Text>

      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: dark ? '#fff' : '#334155',
            fontSize: 16,
            fontWeight: '600',
            marginBottom: 4,
          }}
          numberOfLines={1}
        >
          {(item.attachmentUrl || '').split('/').pop()}
        </Text>

        {item.type === 'channel' && (
          <Text style={{ color: '#999', fontSize: 12 }}>📢 Canal : {item.channelName}</Text>
        )}
        {item.type === 'direct' && (
          <Text style={{ color: '#999', fontSize: 12 }}>💬 Message direct</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: dark ? '#111827' : '#fff' }}>
      <Text style={{
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        marginVertical: 16,
        color: dark ? '#fff' : '#000'
      }}>
        Mes documents
      </Text>
      <TextInput
        placeholder="Rechercher un document..."
        placeholderTextColor="#999"
        style={{
          marginHorizontal: 16,
          marginBottom: 10,
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 8,
          backgroundColor: dark ? '#1f2937' : '#f3f4f6',
          color: dark ? '#fff' : '#000',
        }}
        value={search}
        onChangeText={setSearch}
      />


      {loading ? (
        <ActivityIndicator size="large" color={dark ? '#fff' : '#000'} />
      ) : documents.length === 0 ? (
        <Text style={{ textAlign: 'center', color: '#999' }}>Aucun document trouvé</Text>
      ) : (

        <FlatList
          data={documents.filter(doc => {
            if (!doc || typeof doc !== 'object') return false;

            const url = typeof doc.attachmentUrl === 'string' ? doc.attachmentUrl.toLowerCase() : '';
            const name =
              doc.type === 'channel' && typeof doc.channelName === 'string'
                ? doc.channelName.toLowerCase()
                : '';

            const keyword = search.toLowerCase();
            return url.includes(keyword) || name.includes(keyword);
          })}
          keyExtractor={(item, index) =>
            item._id?.toString() || `${item.attachmentUrl}-${index}`
          }
          renderItem={renderItem}
        />

      )}
    </View>
  );
};

export default MyDocumentsScreen;
