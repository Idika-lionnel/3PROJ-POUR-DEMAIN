import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, useColorScheme } from 'react-native';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { API_URL } from '../config';
//const API_URL = 'http://192.168.30.125:5050'; // adapte ton IP si besoin

export default function CreateWorkspaceScreen() {
  const [name, setName] = useState('');
  const [visibility, setVisibility] = useState('public');
  const { token } = useContext(AuthContext);
  const navigation = useNavigation();
  const theme = useColorScheme();

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Erreur', 'Le nom est requis.');
      return;
    }

    try {
      await axios.post(
        `${API_URL}/api/workspaces`,
        {
          name,
          isPrivate: visibility === 'private',
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      navigation.navigate('Workspaces');
    } catch (error) {
      Alert.alert("Erreur", "Impossible de créer l'espace.");
    }
  };

  return (
    <View style={[styles.container, theme === 'dark' && styles.darkBg]}>
      <Text style={[styles.title, theme === 'dark' && styles.darkText]}>Créer un espace de travail</Text>

      <TextInput
        placeholder="Nom du workspace"
        placeholderTextColor={theme === 'dark' ? '#ccc' : '#666'}
        style={[styles.input, theme === 'dark' && styles.darkInput]}
        value={name}
        onChangeText={setName}
      />

      <TouchableOpacity
        onPress={() => setVisibility(visibility === 'public' ? 'private' : 'public')}
        style={[styles.toggle, theme === 'dark' && styles.darkToggle]}
      >
        <Text style={{ color: '#fff' }}>Visibilité : {visibility === 'public' ? 'Public' : 'Privé'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={handleCreate}>
        <Text style={styles.buttonText}>Créer</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#fff' },
  darkBg: { backgroundColor: '#000' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, color: '#111' },
  darkText: { color: '#fff' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#f9f9f9',
    padding: 10,
    marginBottom: 15,
    borderRadius: 8,
    color: '#000',
  },
  darkInput: {
    backgroundColor: '#1f1f1f',
    borderColor: '#555',
    color: '#fff',
  },
  toggle: {
    backgroundColor: '#4b5563',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 20,
  },
  darkToggle: {
    backgroundColor: '#374151',
  },
  button: {
    backgroundColor: '#2563eb',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: { color: 'white', fontWeight: 'bold' },
});