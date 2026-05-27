import { IPTVChannel } from '../types/iptv';

export type ChannelSortMode = 'name' | 'group';

const normalizeSearchText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .toLocaleLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

export const getChannelCategories = (channels: IPTVChannel[]): string[] => {
  const categories = new Set<string>();

  for (const channel of channels) {
    categories.add(channel.group || 'Sin categoria');
  }

  return ['Todos', ...Array.from(categories).sort((a, b) => a.localeCompare(b))];
};

export const filterChannelsByCategory = (
  channels: IPTVChannel[],
  category: string,
): IPTVChannel[] => {
  if (category === 'Todos') {
    return channels;
  }

  return channels.filter(channel => channel.group === category);
};

export const searchChannels = (
  channels: IPTVChannel[],
  query: string,
): IPTVChannel[] => {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return channels;
  }

  return channels.filter(channel => {
    const searchableText = normalizeSearchText(
      `${channel.name} ${channel.group} ${channel.id}`,
    );

    return searchableText.includes(normalizedQuery);
  });
};

export const sortVisibleChannels = (
  channels: IPTVChannel[],
  sortMode: ChannelSortMode,
): IPTVChannel[] =>
  [...channels].sort((left, right) => {
    if (sortMode === 'group') {
      const groupCompare = left.group.localeCompare(right.group);

      if (groupCompare !== 0) {
        return groupCompare;
      }
    }

    return left.name.localeCompare(right.name);
  });

export const getChannelById = (
  channels: IPTVChannel[],
  channelId?: string,
): IPTVChannel | undefined =>
  channels.find(channel => channel.id === channelId);
