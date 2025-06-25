import React, { useContext } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ThemeContext } from '../context/ThemeContext';
import DirectChatBox from '../components/DirectChatBox';

const DirectChatScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { dark } = useContext(ThemeContext);
  const { receiver, currentUserId } = route.params;

  const styles = createStyles(dark);

  return (
    <View style={styles.container}>
      <DirectChatBox receiver={receiver} contacts={[]} currentUserId={currentUserId} />
    </View>
  );
};

const createStyles = (dark) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: dark ? '#111827' : '#fff',
  },

});

export default DirectChatScreen;
