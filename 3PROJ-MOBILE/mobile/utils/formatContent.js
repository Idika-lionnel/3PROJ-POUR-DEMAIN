import React from 'react';
import { Text } from 'react-native';

// 🛠️ formatContent.js
export function formatContent(text, channelMap = {}, workspaceId = null, navigation = null, knownMentionsSet = new Set()) {
  if (!text) return null;

  const mentionRegex = /@([\wÀ-ÿ]+)[\s.]+([\wÀ-ÿ]+)/g; // @prenom nom ou @prenom.nom
  const hashtagRegex = /#([\w-]+)/g; // #channel-name

  const elements = [];
  let lastIndex = 0;

  const matches = [...text.matchAll(new RegExp(`${mentionRegex.source}|${hashtagRegex.source}`, 'g'))];

  for (const match of matches) {
    const start = match.index;
    if (start > lastIndex) {
      elements.push(<Text key={lastIndex}>{text.slice(lastIndex, start)}</Text>);
    }

    if (match[0].startsWith('@')) {
      const prenom = match[1];
      const nom = match[2];
      const fullMention1 = `@${prenom} ${nom}`.toLowerCase();
      const fullMention2 = `@${prenom}.${nom}`.toLowerCase();

      if (knownMentionsSet.has(fullMention1) || knownMentionsSet.has(fullMention2)) {
        elements.push(
          <Text key={start} style={{ color: '#FBBF24', fontWeight: 'bold' }}>
            {match[0]}
          </Text>
        );
      } else {
        elements.push(<Text key={start}>{match[0]}</Text>);
      }
    }

    if (match[0].startsWith('#')) {
      const tag = match[3]?.toLowerCase(); // match[3] car index 3 dans matchAll

      const channelId = channelMap?.[tag];
      if (channelId && workspaceId && navigation) {
        elements.push(
          <Text
            key={start}
            style={{ color: '#10B981', textDecorationLine: 'underline' }}
            onPress={() => navigation.navigate('ChannelChat', { channelId, workspaceId })}
          >
            #{tag}
          </Text>
        );
      } else {
        elements.push(<Text key={start}>#{tag}</Text>);
      }
    }

    lastIndex = start + match[0].length;
  }

  // Texte restant après la dernière mention/hashtag
  if (lastIndex < text.length) {
    elements.push(<Text key={lastIndex}>{text.slice(lastIndex)}</Text>);
  }

  return <Text>{elements}</Text>;
}
