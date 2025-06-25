import React from 'react';
import { Link } from 'react-router-dom';

export function parseHashtags(text, channelMap, workspaceId) {
    const regex = /#([^\s#]+)/g;

    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
        const hashtag = match[1];
        const start = match.index;

        parts.push(text.slice(lastIndex, start)); // texte normal
        const channelId = channelMap[hashtag.toLowerCase()];

        if (channelId) {
            parts.push(
                <Link
                    key={start}
                    to={`/workspaces/${workspaceId}/channels/${channelId}`}
                    className="text-green-500 underline hover:text-green-700"
                >
                    #{hashtag}
                </Link>
            );
        } else {
            parts.push(`#${hashtag}`); // non existant
        }

        lastIndex = regex.lastIndex;
    }

    parts.push(text.slice(lastIndex)); // reste du texte
    return parts;
}
