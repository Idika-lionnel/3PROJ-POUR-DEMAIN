import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext'; // ✅ AJOUT
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import DashboardScreen from './screens/DashboardScreen';
import ProfileScreen from './screens/ProfileScreen';
import ChatHomeScreen from './screens/ChatHomeScreen';
import DirectChatScreen from './screens/DirectChatScreen';
import WorkspacesScreen from './screens/WorkspacesScreen';
import CreateWorkspaceScreen from './screens/CreateWorkspaceScreen';
import WorkspaceDetailScreen from './screens/WorkspaceDetailScreen';
import CreateChannelScreen from './screens/CreateChannelScreen';
import ChannelChatScreen from './screens/ChannelChatScreen';
import { ActivityIndicator, View } from 'react-native';
import ChannelDetailScreen from './screens/ChannelDetailScreen';
import MyDocumentsScreen from './screens/MyDocumentsScreen';
import MyMentionsScreen from './screens/MyMentionsScreen';
import SocketStatusManager from './components/SocketStatusManager';

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { token, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
    <SocketStatusManager />
      <Stack.Navigator initialRouteName={token ? 'Dashboard' : 'Login'}>
        {token ? (
          <>
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="ChatHome" component={ChatHomeScreen} />
          <Stack.Screen name="DirectChat" component={DirectChatScreen} />
          <Stack.Screen name="Workspaces" component={WorkspacesScreen} />
          <Stack.Screen name="CreateWorkspace" component={CreateWorkspaceScreen} />
          <Stack.Screen name="WorkspaceDetail" component={WorkspaceDetailScreen} /> 
          <Stack.Screen name="CreateChannel" component={CreateChannelScreen} />
          <Stack.Screen name="ChannelChat" component={ChannelChatScreen} />
          <Stack.Screen name="ChannelDetail" component={ChannelDetailScreen} options={{ title: 'Détails du canal' }} />
          <Stack.Screen name="MyDocuments" component={MyDocumentsScreen} />
          <Stack.Screen name="MyMentions" component={MyMentionsScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
}