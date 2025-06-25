import React, { useContext, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import SidebarMobile from '../components/SidebarMobile';
import axios from 'axios';
import { API_URL } from '../config';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const ProfileScreen = () => {
  const { user, token, updateUser, logout } = useContext(AuthContext);
  const { dark } = useContext(ThemeContext);
  const [formData, setFormData] = useState({
    prenom: user?.prenom || '',
    nom: user?.nom || '',
    email: user?.email || '',
    password: '',
  });
  const [status, setStatus] = useState(user?.status || 'online');
  const [loading, setLoading] = useState(false);

  const styles = createStyles(dark);

  const handleChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const dataToSend = { ...formData };
      if (!dataToSend.password) delete dataToSend.password;

      const res = await axios.put(`${API_URL}/users/update`, dataToSend, {
        headers: { Authorization: `Bearer ${token}` }
      });

      updateUser(res.data); // Mise à jour immédiate de l'interface
      alert('Profil mis à jour avec succès');
    } catch (err) {
      alert("Erreur lors de la mise à jour du profil");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      setStatus(newStatus);
      await axios.put(`${API_URL}/users/status`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      alert('Erreur lors du changement de statut');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Confirmation',
      'Es-tu sûr de vouloir supprimer ton compte ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          onPress: async () => {
            try {
              await axios.delete(`${API_URL}/users/delete`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              alert('Compte supprimé');
              logout();
            } catch (err) {
              alert("Erreur lors de la suppression du compte");
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleExport = async () => {
    try {
      const res = await axios.get(`${API_URL}/users/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const fileUri = FileSystem.documentDirectory + 'mes_donnees.json';
      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(res.data, null, 2));

      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Partage indisponible', 'Le partage de fichier n’est pas supporté sur cet appareil.');
        return;
      }

      await Sharing.shareAsync(fileUri);
    } catch (err) {
      console.error('Export error', err);
      Alert.alert("Erreur", "Erreur lors de l'export des données");
    }
  };

  return (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      <SidebarMobile />
      <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
        <Text style={styles.title}>Profil de {user?.prenom}</Text>
        <Text style={styles.role}>Rôle : {user?.role}</Text>

        <View style={styles.field}><Text style={styles.label}>Statut :</Text>
          <View style={styles.statusRow}>
            {['online', 'busy', 'offline'].map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.statusBtn, status === s && styles.selected]}
                onPress={() => handleStatusChange(s)}>
                <Text style={styles.statusText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {['prenom', 'nom', 'email', 'password'].map((field) => (
          <View style={styles.field} key={field}>
            <Text style={styles.label}>{field.charAt(0).toUpperCase() + field.slice(1)} :</Text>
            <TextInput
              style={styles.input}
              value={formData[field]}
              onChangeText={(text) => handleChange(field, text)}
              placeholder={field === 'password' ? 'Nouveau mot de passe (facultatif)' : ''}
              secureTextEntry={field === 'password'}
              autoCapitalize={field === 'email' ? 'none' : 'words'}
            />
          </View>
        ))}

        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Enregistrer</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.exportBtn} onPress={handleExport}>
          <Text style={styles.exportText}>Exporter mes données</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Text style={styles.deleteText}>Supprimer mon compte</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const createStyles = (dark) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: dark ? '#000' : '#f3f4f6',
  },
  inner: {
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: dark ? '#fff' : '#111',
    marginBottom: 10,
  },
  role: {
    fontSize: 14,
    color: dark ? '#ccc' : '#666',
    marginBottom: 20,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontWeight: '600',
    color: dark ? '#ccc' : '#333',
    marginBottom: 6,
  },
  input: {
    backgroundColor: dark ? '#1e293b' : '#fff',
    color: dark ? '#fff' : '#000',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: dark ? '#555' : '#ccc',
  },
  saveButton: {
    backgroundColor: '#2563eb',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 20,
  },
  saveText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  statusRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statusBtn: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  selected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  statusText: {
    color: dark ? '#fff' : '#000',
  },
  exportBtn: {
    backgroundColor: '#10b981',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 20,
  },
  exportText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  deleteBtn: {
    backgroundColor: '#ef4444',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 20,
  },
  deleteText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default ProfileScreen;