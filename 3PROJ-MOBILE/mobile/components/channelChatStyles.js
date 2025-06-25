// channelChatStyles.js
import { StyleSheet } from 'react-native';

export const createStyles = (dark) =>
  StyleSheet.create({

    container: {
      flex: 1,
      backgroundColor: dark ? '#0f172a' : '#fff',
      padding: 10,
      paddingBottom: 20,
    },
    channelTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: dark ? '#fff' : '#111',
      marginBottom: 10,
    },

    messagesList: {
      paddingBottom: 20,
    },
    messageBubble: {
      marginVertical: 6,
      paddingHorizontal: 10,
    },
    myMessage: {
      alignSelf: 'flex-end',
      backgroundColor: '#3b82f6',
      borderRadius: 12,
      padding: 10,
      maxWidth: '70%',
    },
    otherMessage: {
      alignSelf: 'flex-start',
      backgroundColor: '#e3f1ff',
      borderRadius: 12,
      padding: 10,
      maxWidth: '70%',
    },
    messageTextReceiver: {
      color: '#224262', // ✅ Couleur texte récepteur
      fontSize: 16,
    },
    messageText: {
      color: '#fff',
      fontSize: 16,
    },
    fileLink: {
      color: '#fff',
      textDecorationLine: 'underline',
      marginTop: 5,
    },
    timestamp: {
      fontSize: 10,
      color: '#fff',
      alignSelf: 'flex-end',
      marginTop: 4,
    },
    image: {
      width: 200,
      height: 200,
      borderRadius: 12,
    },
    footerBar: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 10,
      backgroundColor: dark ? '#0f172a' : '#fff',
      gap: 10,
    },
    inputContainer: {
      flex: 1,
      flexDirection: 'row',
      backgroundColor: '#f1f1f1',
      borderRadius: 20,
      alignItems: 'center',
      paddingHorizontal: 15,
      paddingVertical: 6,
    },
    inputWebStyle: {
      flex: 1,
      fontSize: 16,
      paddingVertical: 6,
      color: dark ? '#fff' : '#000',
    },
    sendButton: {
      backgroundColor: '#1877F2',
      borderRadius: 14,
      padding: 10,
    },
    emojiBar: {
      flexDirection: 'row',
      justifyContent: 'center',
      paddingVertical: 4,
      marginTop: 2,
    },
    emoji: {
      fontSize: 22,
      marginHorizontal: 5,
    },
    reactionRow: {
      flexDirection: 'row',
      marginTop: 4,
      paddingHorizontal: 10,
    },
    reactionEmoji: {
      fontSize: 10,
      marginRight: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 12,
      backgroundColor: '#f1f1f1',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.9)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    fullImage: {
      width: '90%',
      height: '80%',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      marginBottom: 10,
      gap: 8,
    },
    searchIconContainer: {
      padding: 6,
    },
    searchInput: {
      flex: 1,
      backgroundColor: '#f1f1f1',
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
      fontSize: 14,
      color: dark ? '#fff' : '#000',
    },
    channelTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: dark ? '#fff' : '#111',
      marginLeft: 'auto',
    },headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
      },
      channelTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: dark ? '#fff' : '#111',
        marginRight: 8,
      },
      searchInput: {
        flex: 1,
        backgroundColor: '#f1f1f1',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        fontSize: 14,
        color: dark ? '#fff' : '#000',
        marginRight: 8,
      },
      searchIconContainer: {
        padding: 4,
      },
      senderTextReceiver: {
        fontWeight: 'bold',
        color: '#224262',
        marginBottom: 2,
      },
      senderText: {
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 2,
      },


  });
