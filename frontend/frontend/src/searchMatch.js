// Matching + highlighting logic for the global navigation search.

export const isEntryVisible = (entry, isAdmin) =>
  !entry.adminOnly || isAdmin;

const findMatchRange = (text, query) => {
  if (!query) return null;

  const haystack = text.toLowerCase();
  const needle = query.toLowerCase();
  const start = haystack.indexOf(needle);

  if (start === -1) return null;

  return { start, end: start + needle.length };
};

export const splitForHighlight = (text, query) => {
  const range = findMatchRange(text, query);

  if (!range) {
    return [{ text, matched: false }];
  }

  const segments = [];

  if (range.start > 0) {
    segments.push({ text: text.slice(0, range.start), matched: false });
  }

  segments.push({ text: text.slice(range.start, range.end), matched: true });

  if (range.end < text.length) {
    segments.push({ text: text.slice(range.end), matched: false });
  }

  return segments;
};

const scoreEntry = (entry, query) => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return 0;

  const title = entry.title.toLowerCase();

  if (title === normalizedQuery) return 100;
  if (title.startsWith(normalizedQuery)) return 90;
  if (title.includes(normalizedQuery)) return 70;

  const keywordHit = (entry.keywords || []).some((keyword) =>
    keyword.toLowerCase().includes(normalizedQuery)
  );
  if (keywordHit) return 50;

  if (entry.group.toLowerCase().includes(normalizedQuery)) return 30;

  return 0;
};

export const searchEntries = (index, query, isAdmin) => {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) return [];

  return index
    .filter((entry) => isEntryVisible(entry, isAdmin))
    .map((entry) => ({ entry, score: scoreEntry(entry, normalizedQuery) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ entry }) => entry);
};

export const groupEntries = (entries) => {
  const order = [];
  const byGroup = new Map();

  entries.forEach((entry) => {
    if (!byGroup.has(entry.group)) {
      byGroup.set(entry.group, []);
      order.push(entry.group);
    }
    byGroup.get(entry.group).push(entry);
  });

  return order.map((group) => ({ group, items: byGroup.get(group) }));
};