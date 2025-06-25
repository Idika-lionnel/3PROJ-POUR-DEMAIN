import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const AvatarWithStatus = ({ name, status }) => {
  const statusColor = {
    online: 'green',
    busy: 'red',
    offline: 'gray'
  }[status] || 'gray';

  return (
    <View style={styles.row}>
      <Text style={styles.name}>{name}</Text>
      <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
});

export default AvatarWithStatus;
