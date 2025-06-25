import React from 'react';

export function highlightMentions(text, knownMentionsSet) {
    const mentionRegex = /@([\wÀ-ÿ]+)[\s.]+([\wÀ-ÿ]+)/g;

    const parts = [];
    let lastIndex = 0;

    for (const match of text.matchAll(mentionRegex)) {
        const full = match[0];
        const prenom = match[1];
        const nom = match[2];
        const start = match.index;

        parts.push(text.slice(lastIndex, start));

        const mention1 = `${prenom} ${nom}`.toLowerCase();
        const mention2 = `${prenom}.${nom}`.toLowerCase();

        if (knownMentionsSet.has(mention1) || knownMentionsSet.has(mention2)) {
            parts.push(
                <strong key={start} className="text-yellow-400 dark:text-yellow-400 font-semibold">
                    {full}
                </strong>
            );
        } else {
            parts.push(full); // pas reconnu, on laisse normal
        }

        lastIndex = start + full.length;
    }

    parts.push(text.slice(lastIndex));
    return parts;
}
