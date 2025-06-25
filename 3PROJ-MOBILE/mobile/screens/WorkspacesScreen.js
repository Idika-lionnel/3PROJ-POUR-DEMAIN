import React, { useEffect, useState, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Button } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import axios from 'axios';
import { API_URL } from '../config';

import { Ionicons } from '@expo/vector-icons';
//const API_URL = 'http://192.168.30.125:5050';


const WorkspacesScreen = () => {
  const [visibilityFilter, setVisibilityFilter] = useState(null); // "private", "public", ou null
  const { token } = useContext(AuthContext);
  const { dark } = useContext(ThemeContext);
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  const styles = createStyles(dark);

  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/workspaces`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setWorkspaces(res.data);
      } catch (err) {
        console.error('Erreur chargement workspaces :', err?.response?.data || err.message);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchWorkspaces();
  }, [token]);

   const filteredWorkspaces = workspaces.filter(ws =>
                 visibilityFilter === null ? true :
                 visibilityFilter === 'private' ? ws.isPrivate :
                 !ws.isPrivate
               );
  if (loading) return <ActivityIndicator style={{ marginTop: 50 }} size="large" />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mes Espaces de Travail</Text>
        <TouchableOpacity onPress={() => navigation.navigate('CreateWorkspace')}>
          <Text style={styles.createButton}>+ Créer</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            visibilityFilter === 'private' && styles.toggleSelected
          ]}
          onPress={() => setVisibilityFilter('private')}
        >
          <Text style={[
            styles.toggleText,
            visibilityFilter === 'private' && styles.toggleTextSelected
          ]}>Private</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            visibilityFilter === 'public' && styles.toggleSelected
          ]}
          onPress={() => setVisibilityFilter('public')}
        >
          <Text style={[
            styles.toggleText,
            visibilityFilter === 'public' && styles.toggleTextSelected
          ]}>Public</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            visibilityFilter === null && styles.toggleSelected
          ]}
          onPress={() => setVisibilityFilter(null)}
        >
          <Text style={[
            styles.toggleText,
            visibilityFilter === null && styles.toggleTextSelected
          ]}>Tous</Text>
        </TouchableOpacity>
      </View>


      {workspaces.length === 0 ? (
        <Text style={styles.empty}>Aucun espace disponible.</Text>
      ) : (

        <FlatList
          data={filteredWorkspaces}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('WorkspaceDetail', { id: item._id })}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons
                  name={item.isPrivate ? 'lock-closed' : 'earth'}
                  size={20}
                  color="#fff"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.cardText}>{item.name}</Text>
              </View>
            </TouchableOpacity>
          )}
        />



      )}
    </View>
  );
};

const createStyles = (dark) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: dark ? '#000' : '#f9f9f9',
      padding: 20,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    title: {
      fontSize: 22,
      fontWeight: 'bold',
      color: dark ? '#fff' : '#111',
    },
    createButton: {
      fontSize: 16,
      color: '#2563eb',
      fontWeight: 'bold',
    },
    empty: {
      color: dark ? '#ccc' : '#555',
      textAlign: 'center',
      marginTop: 20,
    },
    card: {
      backgroundColor: '#2563eb',
      padding: 16,
      borderRadius: 10,
      marginBottom: 12,
    },
    cardText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 16,
    },
    toggleContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginBottom: 10,
    },
    toggleButton: {
      paddingVertical: 6,
      paddingHorizontal: 14,
      borderRadius: 20,
      backgroundColor: '#e5e7eb',
      marginHorizontal: 4,
    },
    toggleSelected: {
      backgroundColor: '#334155',
    },
    toggleText: {
      fontSize: 14,
      color: '#1f2937',
    },
    toggleTextSelected: {
      color: '#fff',
      fontWeight: 'bold',
    },

  });

export default WorkspacesScreen;