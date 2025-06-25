import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  StyleSheet
} from 'react-native';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { API_URL } from '../config';
import socket from '../socket';

const ConversationListMobile = ({ onSelect, selectedId }) => {
  const { token } = useContext(AuthContext);
  const [conversations, setConversations] = useState([]);
  const [search, setSearch] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);

  const fetchConversations = async () => {
    try {
      console.log('📲 fetchConversations() lancé');
      const userRes = await axios.get(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const user = userRes.data.user;
      setCurrentUserId(user._id);
      console.log('👤 Utilisateur actuel :', user._id);

      const res = await axios.get(`${API_URL}/api/conversations/${user._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setConversations(res.data);
      console.log('🗂️ Conversations reçues :', res.data);
    } catch (err) {
      console.error('❌ Erreur chargement conversations :', err);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    socket.on('new_direct_message', (msg) => {
      console.log('📩 Nouveau message reçu via socket :', msg);
      fetchConversations();
    });

    return () => {
      socket.off('new_direct_message');
    };
  }, []);

  const filtered = conversations.filter(c => {
    const full = `${c.otherUser?.prenom || ''} ${c.otherUser?.nom || ''}`.toLowerCase();
    return full.includes(search.toLowerCase());
  });

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Rechercher..."
        value={search}
        onChangeText={setSearch}
      />
      <FlatList
        data={filtered}
        keyExtractor={item => item._id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.contact, item._id === selectedId ? styles.selected : null]}
            onPress={() => onSelect(item.otherUser)}
          >
            <View style={styles.row}>
              <Text style={styles.name}>
                {item.otherUser?.prenom} {item.otherUser?.nom}
              </Text>
              {item.lastHour && <Text style={styles.hour}>{item.lastHour}</Text>}
            </View>
            <View style={styles.row}>
              <Text style={styles.message}>
                {item.lastMessage ? item.lastMessage : 'Nouveau message'}
              </Text>
              {item.unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.unreadCount}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  search: {
    backgroundColor: '#f3f4f6',
    padding: 10,
    margin: 10,
    borderRadius: 6
  },
  contact: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: '#ddd'
  },
  selected: {
    backgroundColor: '#e0e7ff'
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#111'
  },
  hour: {
    fontSize: 12,
    color: '#666'
  },
  message: {
    fontSize: 14,
    color: '#444',
    marginTop: 4
  },
  badge: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold'
  }
});

export default ConversationListMobile;
