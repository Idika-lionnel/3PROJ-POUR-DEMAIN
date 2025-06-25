import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { API_URL } from '../config';


const CreateChannelScreen = () => {
  const { token } = useContext(AuthContext);
  const { dark } = useContext(ThemeContext);
  const navigation = useNavigation();
  const { params } = useRoute();

  const workspaceId = params?.workspaceId || params?.id;
  const onChannelCreated = params?.onChannelCreated;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const styles = createStyles(dark);
  const [isPrivate, setIsPrivate] = useState(false);


  const handleCreateChannel = async () => {
    if (!name.trim()) return Alert.alert('Erreur', 'Le nom du canal est requis');

    try {
      const res = await axios.post(
        `${API_URL}/api/workspaces/${workspaceId}/channels`,
        { name, description, isPrivate},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (onChannelCreated) {
        onChannelCreated(res.data); // ✅ mise à jour immédiate côté parent
      }

      navigation.goBack();
    } catch (err) {
      Alert.alert('Erreur', "Impossible de créer le canal.");
      console.error('Erreur axios :', err?.response?.data || err.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Créer un canal</Text>

      <TextInput
        style={styles.input}
        placeholder="Nom du canal"
        placeholderTextColor={dark ? '#aaa' : '#555'}
        value={name}
        onChangeText={setName}
      />

      <TextInput
        style={styles.input}
        placeholder="Description (optionnelle)"
        placeholderTextColor={dark ? '#aaa' : '#555'}
        value={description}
        onChangeText={setDescription}
      />
      <View style={styles.switchContainer}>
        <Text style={[styles.switchLabel, { color: dark ? '#fff' : '#111' }]}>
          {isPrivate ? 'Canal privé' : 'Canal public'}
        </Text>
        <TouchableOpacity onPress={() => setIsPrivate(!isPrivate)} style={styles.switchBox}>
          <View style={[styles.switchToggle, isPrivate && styles.switchToggleActive]} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={handleCreateChannel} style={styles.button}>
        <Text style={styles.buttonText}>Créer</Text>
      </TouchableOpacity>
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
    title: {
      fontSize: 22,
      fontWeight: 'bold',
      color: dark ? '#fff' : '#111',
      marginBottom: 20,
    },
    input: {
      backgroundColor: dark ? '#1e293b' : '#fff',
      color: dark ? '#fff' : '#000',
      borderWidth: 1,
      borderColor: '#ccc',
      borderRadius: 6,
      paddingHorizontal: 10,
      paddingVertical: 8,
      marginBottom: 12,
    },
    button: {
      backgroundColor: '#2563eb',
      padding: 12,
      borderRadius: 6,
      alignItems: 'center',
    },
    buttonText: {
      color: '#fff',
      fontWeight: '600',
    },
    switchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20,
    },
    switchLabel: {
      fontSize: 16,
      fontWeight: '500',
    },
    switchBox: {
      width: 50,
      height: 28,
      borderRadius: 14,
      backgroundColor: '#ccc',
      justifyContent: 'center',
    },
    switchToggle: {
      width: 20,
      height: 20,
      backgroundColor: '#fff',
      borderRadius: 10,
      marginLeft: 4,
    },
    switchToggleActive: {
      marginLeft: 26,
      backgroundColor: '#2563eb',
    },
  });

export default CreateChannelScreen;