import React, { useContext, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ThemeContext } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { fetchUserWorkspaces } from '../services/workspaceService';

const DashboardMobile = () => {
  const navigation = useNavigation();
  const { logout, token, user } = useContext(AuthContext);
  const { dark, toggleTheme } = useContext(ThemeContext);

  const [tasks, setTasks] = useState([

  ]);
  const [newTask, setNewTask] = useState('');
  const [workspaces, setWorkspaces] = useState([]);

  const styles = createStyles(dark);

  useEffect(() => {
    const loadWorkspaces = async () => {
      try {
        const data = await fetchUserWorkspaces(token);
        setWorkspaces(data);
      } catch (err) {
        console.error('Erreur chargement workspaces :', err.response?.data || err.message);
      }
    };
    loadWorkspaces();
  }, []);

  const handleAddTask = () => {
    if (!newTask.trim()) return;
    setTasks([...tasks, { id: Date.now(), label: newTask, done: false }]);
    setNewTask('');
  };

  const toggleTask = (id) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const removeTask = (id) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  return (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      {/* Sidebar */}
      <View style={styles.sidebar}>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.iconBtn}>
          <Ionicons name="person" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Dashboard')} style={styles.iconBtn}>
          <Ionicons name="home" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Workspaces')} style={styles.iconBtn}>
          <Ionicons name="grid" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('ChatHome')} style={styles.iconBtn}>
          <Ionicons name="chatbox" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={toggleTheme} style={styles.iconBtn}>
          <Ionicons name={dark ? 'moon' : 'sunny'} size={22} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={logout} style={styles.iconBtn}>
          <MaterialIcons name="logout" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <ScrollView style={styles.container} contentContainerStyle={styles.innerContainer}>
        {/* Profile */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Bonjour {user?.prenom} {user?.nom}</Text>
          <Text style={styles.role}>{user?.role}</Text>

          <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('MyDocuments')}>
            <Text style={styles.buttonText}>Mes documents</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('MyMentions')}>
            <Text style={styles.buttonText}>Mentions</Text>
          </TouchableOpacity>
        </View>

        {/* To-do List */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>To-do List</Text>
          {tasks.map(task => (
            <View key={task.id} style={styles.taskRow}>
              <TouchableOpacity onPress={() => toggleTask(task.id)}>
                <Text style={task.done ? styles.taskDone : styles.taskText}>- {task.label}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => removeTask(task.id)}>
                <Text style={styles.delete}>🗑️</Text>
              </TouchableOpacity>
            </View>
          ))}
          <View style={styles.addTaskRow}>
            <TextInput
              placeholder="Nouvelle tâche..."
              style={styles.input}
              placeholderTextColor={dark ? '#ccc' : '#666'}
              value={newTask}
              onChangeText={setNewTask}
            />
            <TouchableOpacity onPress={handleAddTask} style={styles.addBtn}>
              <Text style={styles.addText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Workspaces */}
        <View style={styles.cardBlue}>
          <Text style={styles.cardTitleWhite}>My workspaces</Text>
          {workspaces.length === 0 ? (
            <Text style={styles.noWorkspaces}>Aucun workspace trouvé.</Text>
          ) : (
            workspaces.map(ws => (
              <TouchableOpacity
                key={ws._id}
                style={styles.workspaceBox}
                onPress={() => navigation.navigate('WorkspaceDetail', { id: ws._id })}
              >
                <Text style={styles.workspaceText}>{ws.name}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const createStyles = (dark) => StyleSheet.create({
  sidebar: {
    width: 60,
    backgroundColor: '#2563eb',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
  },
  iconBtn: {
    marginVertical: 10,
  },
  container: {
    flex: 1,
    backgroundColor: dark ? '#000' : '#f1f1f1',
  },
  innerContainer: {
    padding: 20,
  },
  card: {
    backgroundColor: dark ? '#1e293b' : '#fff',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
  },
  cardBlue: {
    backgroundColor: dark ? '#1e293b' : 'white',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: dark ? '#fff' : '#111',
    marginBottom: 10,
  },
  cardTitleWhite: {
    fontSize: 18,
    fontWeight: '600',
    color: dark ? '#fff' : '#111',
    marginBottom: 10,
    textAlign: 'center',
  },
  role: {
    color: dark ? '#ccc' : '#666',
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#2563eb',
    padding: 10,
    borderRadius: 6,
    marginVertical: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  taskRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  taskText: {
    color: dark ? '#fff' : '#111',
  },
  taskDone: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  delete: {
    color: 'red',
  },
  addTaskRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  input: {
    flex: 1,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    color: dark ? '#fff' : '#000',
  },
  addBtn: {
    backgroundColor: '#2563eb',
    marginLeft: 10,
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderRadius: 6,
  },
  addText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  workspaceBox: {
    backgroundColor: '#2563eb',
    padding: 20,
    borderRadius: 10,
    marginVertical: 5,
    alignItems: 'center',
  },
  workspaceText: {
    color: '#fff',
    fontWeight: '600',
  },
  noWorkspaces: {
    color: '#ddd',
    textAlign: 'center',
  },
});

export default DashboardMobile;
