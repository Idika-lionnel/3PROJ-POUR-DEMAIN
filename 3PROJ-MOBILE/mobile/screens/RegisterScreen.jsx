import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import api from '../services/api';
import { ThemeContext } from '../context/ThemeContext'; // 👈 Import du contexte thème

export default function RegisterScreen({ navigation }) {
  const { dark } = useContext(ThemeContext); // 👈 Accès au thème
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const styles = createStyles(dark); // 👈 Génération dynamique des styles

  const handleRegister = async () => {
    if (!prenom || !nom || !email || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    try {
      const res = await api.post('/auth/register', {
        prenom,
        nom,
        email,
        password,
      });
      Alert.alert('Succès', 'Inscription réussie ! Vous pouvez maintenant vous connecter.');
      navigation.navigate('Login');
    } catch (err) {
      console.error(err.response?.data || err.message);
      Alert.alert('Erreur', err.response?.data?.message || 'Erreur lors de l’inscription');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.box}>
        <Text style={styles.title}>Inscription à SUPCHAT</Text>

        <TextInput
          placeholder="Prénom"
          placeholderTextColor={dark ? '#aaa' : '#999'}
          style={styles.input}
          value={prenom}
          onChangeText={setPrenom}
        />
        <TextInput
          placeholder="Nom"
          placeholderTextColor={dark ? '#aaa' : '#999'}
          style={styles.input}
          value={nom}
          onChangeText={setNom}
        />
        <TextInput
          placeholder="Email"
          placeholderTextColor={dark ? '#aaa' : '#999'}
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          placeholder="Mot de passe"
          placeholderTextColor={dark ? '#aaa' : '#999'}
          secureTextEntry
          style={styles.input}
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity style={styles.button} onPress={handleRegister}>
          <Text style={styles.buttonText}>S'inscrire</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>
          Déjà inscrit ?{' '}
          <Text style={styles.link} onPress={() => navigation.navigate('Login')}>
            Se connecter
          </Text>
        </Text>
      </View>
    </View>
  );
}

const createStyles = (dark) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: dark ? '#000' : '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  box: {
    backgroundColor: dark ? '#1e293b' : '#fff',
    padding: 25,
    borderRadius: 12,
    width: '85%',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
    color: dark ? '#fff' : '#111',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 15,
    color: dark ? '#fff' : '#000',
    backgroundColor: dark ? '#334155' : '#fff',
  },
  button: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  footer: {
    textAlign: 'center',
    color: dark ? '#ccc' : '#333',
    marginTop: 5,
  },
  link: {
    color: '#2563eb',
    fontWeight: '500',
  },
});