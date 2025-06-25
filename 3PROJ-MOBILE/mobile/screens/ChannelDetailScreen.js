import React, { useEffect, useState, useContext } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput, Alert, StyleSheet
} from 'react-native';
import axios from 'axios';
import { useRoute } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { API_URL } from '../config';
import { Ionicons } from '@expo/vector-icons';
import { socket } from '../socket';
import moment from 'moment';
import { useNavigation } from '@react-navigation/native';


const ChannelDetailScreen = () => {

  const { params } = useRoute();
  const { channelId  } = params;
  const { workspaceId } = useRoute().params;
  const { token, user } = useContext(AuthContext);
  const { dark } = useContext(ThemeContext);
  const [channel, setChannel] = useState(null);
  const [email, setEmail] = useState('');
  const [isCreator, setIsCreator] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({ name: '', description: '', isPrivate: false });
const navigation = useNavigation();

  useEffect(() => {
    if (channel) {
      setEditData({
        name: channel.name || '',
        description: channel.description || '',
        isPrivate: channel.isPrivate || false,
      });
    }
  }, [channel]);
  const fetchChannel = async () => {
        try {
          const res = await axios.get(`${API_URL}/api/channels/${channelId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setChannel(res.data);
          setIsCreator(res.data.isCreator || false); // 🔧
          setIsMember(res.data.isMember || false);   // 🔧
        } catch (err) {
          console.error('Erreur récupération canal :', err.response?.data || err.message);
        }
      };

  const handleSaveEdit = async () => {
    try {
      await axios.patch(`${API_URL}/api/channels/${channelId}`, editData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEditMode(false);
      fetchChannel(); // recharge les données du canal
    } catch {
      Alert.alert('Erreur', 'Mise à jour échouée.');
    }
  };
  const handleDeleteChannel = async () => {
    Alert.alert(
      'Supprimer ce canal ?',
      'Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${API_URL}/api/channels/${channelId}`, {
                headers: { Authorization: `Bearer ${token}` },
              });

              // ✅ Redirection AVANT que la page n'essaie de recharger un canal supprimé
              navigation.navigate('Workspaces');
            } catch (err) {
              console.error('Erreur suppression canal :', err.response?.data || err.message);
              Alert.alert('Erreur', 'Impossible de supprimer ce canal.');
            }
          },
        },
      ]
    );
  };



  useEffect(() => {
    fetchChannel();
  }, [channelId]);

 const handleInvite = async () => {
   if (!email.trim()) return;

   try {
     const res = await axios.post(`${API_URL}/api/channels/${channelId}/invite`, {
       email: email.trim().toLowerCase(),
     }, {
       headers: { Authorization: `Bearer ${token}` },
     });

     // ✅ Succès : on arrête ici
     Alert.alert('✅ Invitation envoyée', `${email} a été ajouté`);
     setEmail('');
     setChannel((prev) => ({
       ...prev,
       members: [...prev.members, res.data],
     }));

     if (socket && socket.emit) {
       socket.emit('channel_member_added', {
         channelId,
         member: res.data,
       });
     }

     return; // <-- 🛑 Arrête ici
   } catch (err) {
     console.log('Erreur invitation :', err.response?.data || err.message);
     Alert.alert('Erreur', err.response?.data?.error || 'Échec de l’invitation');
   }
 };

  const handleRemove = async (userId) => {
    try {
      await axios.delete(`${API_URL}/api/channels/${channelId}/members/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setChannel((prev) => ({
        ...prev,
        members: prev.members.filter((u) => u._id !== userId),
      }));
      if (socket && socket.emit) {
        socket.emit('channel_member_removed', {
          channelId,
          userId,
        });
      }


    } catch (err) {
      console.error('Erreur suppression membre :', err.response?.data || err.message);
      Alert.alert('Erreur', err.response?.data?.error || 'Échec de la suppression');
    }
  };

  if (!channel) {
    return (
      <View style={[styles.container, { backgroundColor: dark ? '#000' : '#fff' }]}>
        <Text style={{ color: dark ? '#fff' : '#000' }}>Chargement...</Text>
      </View>
    );
  }

return (
    <View style={[styles.container, { backgroundColor: dark ? '#000' : '#fff' }]}>
      <Text style={[styles.title, { color: dark ? '#fff' : '#000' }]}>
        #{channel.name} {channel.isPrivate ? '🔒' : '🌐'}
      </Text>
      <Text style={{ color: dark ? '#aaa' : '#333', marginBottom: 5 }}>
        {channel.description || 'Pas de description'}
      </Text>
      {isCreator && !editMode && (
        <View style={styles.editBtns}>
          <TouchableOpacity onPress={() => setEditMode(true)} style={styles.saveBtn}>
            <Text style={styles.saveBtnText}>✏️ Modifier</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDeleteChannel} style={styles.cancelBtn}>
            <Text style={{ color: 'red' }}>🗑️ Supprimer</Text>
          </TouchableOpacity>
        </View>
      )}

      {editMode && (
        <>
          <TextInput
            value={editData.name}
            onChangeText={(val) => setEditData({ ...editData, name: val })}
            placeholder="Nom du canal"
            style={styles.input}
            placeholderTextColor={dark ? '#aaa' : '#444'}
          />
          <TextInput
            value={editData.description}
            onChangeText={(val) => setEditData({ ...editData, description: val })}
            placeholder="Description"
            style={[styles.input, { marginTop: 10 }]}
            placeholderTextColor={dark ? '#aaa' : '#444'}
          />
          <TouchableOpacity
            onPress={() => setEditData({ ...editData, isPrivate: !editData.isPrivate })}
            style={styles.toggleBtn}
          >
            <Text style={styles.toggleBtnText}>
              {editData.isPrivate ? '🔒 Privé' : '🌍 Public'}
            </Text>
          </TouchableOpacity>

          <View style={styles.editBtns}>
            <TouchableOpacity onPress={handleSaveEdit} style={styles.saveBtn}>
              <Text style={styles.saveBtnText}>💾 Enregistrer</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setEditMode(false)} style={styles.cancelBtn}>
              <Text style={{ color: dark ? '#fff' : '#111' }}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </>
      )}



      <Text style={[styles.subtitle, { color: dark ? '#fff' : '#000' }]}>👥 Membres</Text>

      {(isCreator || isMember) ? (
        <FlatList
          data={channel?.members || []}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <View style={styles.memberRow}>
              <Text style={[styles.memberText, { color: dark ? '#eee' : '#111' }]}>
                {item.prenom} {item.nom}
              </Text>
              {isCreator && item._id !== user._id && (
                <TouchableOpacity onPress={() => handleRemove(item._id)}>
                  <Ionicons name="close" size={22} color="red" />
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      ) : (
        <Text style={{ color: '#999', textAlign: 'center' }}>
          Vous n’avez pas accès à la liste des membres de ce canal.
        </Text>
      )}

      {isCreator && (
        <View style={styles.inviteBox}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: dark ? '#1e293b' : '#f2f2f2',
                color: dark ? '#fff' : '#000',
                borderColor: dark ? '#333' : '#ccc',
              }
            ]}
            placeholder="Email à inviter"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
          />
          <TouchableOpacity style={styles.button} onPress={handleInvite}>
            <Text style={styles.buttonText}>Inviter</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 5 },
  subtitle: { fontSize: 20, fontWeight: 'bold', marginVertical: 10 },
  memberRow: {
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberText: { fontSize: 16 },
  inviteBox: { marginTop: 20 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#2563eb',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  editBtns: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  saveBtn: {
    backgroundColor: '#2563eb',
    padding: 10,
    borderRadius: 6,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  cancelBtn: {
    backgroundColor: '#f3f4f6',
    padding: 10,
    borderRadius: 6,
  },
  toggleBtn: {
    backgroundColor: '#e5e7eb',
    padding: 10,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  toggleBtnText: {
    color: '#111',
    fontWeight: '600',
  },
});

export default ChannelDetailScreen;
