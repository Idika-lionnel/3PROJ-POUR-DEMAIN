import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  TextInput,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { API_URL } from '../config';
import socket from '../socket';
import axios from 'axios';

const ChatHomeScreen = () => {
  const navigation = useNavigation();
  const { token } = useContext(AuthContext);
  const { dark } = useContext(ThemeContext);
  const [userId, setUserId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [selectedTab, setSelectedTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchUserId = async () => {
      const res = await axios.get(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUserId(res.data.user._id);
    };
    fetchUserId();
  }, []);

  const fetchConversations = async (uid) => {
    const res = await axios.get(`${API_URL}/api/conversations/${uid}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setConversations(res.data);
  };

  useFocusEffect(
    React.useCallback(() => {
      if (!userId) return;

      fetchConversations(userId);

      axios
        .get(`${API_URL}/users/all`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => {
          const filtered = (res.data?.users || []).filter((u) => u._id !== userId);;
          setContacts(filtered);
        });

      const handler = (msg) => {
        if (msg.receiverId === userId || msg.senderId === userId) {
          fetchConversations(userId);
        }
      };

      socket.on('new_direct_message', handler);
      return () => socket.off('new_direct_message', handler);
    }, [userId])
  );

  const getFilteredData = () => {
    let baseData;

    if (selectedTab === 'unread') {
      baseData = conversations
        .filter((conv) => conv.unreadCount > 0)
        .map((conv) => ({
          ...conv.otherUser,
          lastMessage: conv.lastMessage,
          lastHour: conv.lastHour,
          unreadCount: conv.unreadCount,
        }));
    } else if (selectedTab === 'contacts') {
      baseData = contacts;
    } else {
      baseData = conversations.map((conv) => ({
        ...conv.otherUser,
        lastMessage: conv.lastMessage,
        lastHour: conv.lastHour,
        unreadCount: conv.unreadCount || 0,
      }));
    }

    if (!searchQuery.trim()) return baseData;

    return baseData.filter((item) => {
      const name = `${item.prenom || ''} ${item.nom || ''}`.toLowerCase();
      return name.includes(searchQuery.toLowerCase());
    });
  };

  const styles = createStyles(dark);

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {['all', 'unread', 'contacts'].map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setSelectedTab(tab)}
            style={[styles.tab, selectedTab === tab && styles.tabSelected]}
          >
            <Text style={styles.tabText}>{tab.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TextInput
        style={styles.searchBar}
        placeholder="Rechercher..."
        placeholderTextColor="#999"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      <FlatList
        data={getFilteredData()}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.item}
            onPress={() => navigation.navigate('DirectChat', { receiver: item })}
          >
            <View style={styles.row}>
              <View>
                <Text style={styles.name}>
                  {item.prenom} {item.nom}
                </Text>
                {selectedTab === 'contacts' && (
                  <Text style={styles.email}>{item.email}</Text>
                )}
              </View>
              {item.lastHour && <Text style={styles.hour}>{item.lastHour}</Text>}
            </View>

            {selectedTab !== 'contacts' && (
              <View style={styles.row}>
                <Text style={styles.last}>{item.lastMessage}</Text>
                {item.unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.unreadCount}</Text>
                  </View>
                )}
              </View>
            )}
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const createStyles = (dark) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: dark ? '#111827' : '#f9fafb',
      padding: 10,
    },
    tabBar: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: 10,
    },
    tab: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: '#e5e7eb',
    },
    tabSelected: {
      backgroundColor: '#3b82f6',
    },
    tabText: {
      color: '#111827',
      fontWeight: 'bold',
    },
    searchBar: {
      backgroundColor: '#f1f1f1',
      borderRadius: 10,
      padding: 10,
      marginBottom: 10,
      color: dark ? '#fff' : '#000',
    },
    item: {
      backgroundColor: dark ? '#1f2937' : '#fff',
      padding: 12,
      borderRadius: 8,
      marginBottom: 8,
    },
    name: {
      color: dark ? '#fff' : '#111827',
      fontWeight: 'bold',
      fontSize: 16,
    },
    email: {
      color: dark ? '#d1d5db' : '#6b7280',
      fontSize: 12,
      marginTop: 2,
    },
    last: {
      color: dark ? '#d1d5db' : '#6b7280',
      fontSize: 12,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    hour: {
      fontSize: 12,
      color: '#888',
    },
    badge: {
      backgroundColor: '#FF3B30',
      borderRadius: 10,
      minWidth: 20,
      paddingHorizontal: 6,
      paddingVertical: 2,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 6,
    },
    badgeText: {
      color: 'white',
      fontSize: 12,
      fontWeight: 'bold',
    },
  });

export default ChatHomeScreen;
