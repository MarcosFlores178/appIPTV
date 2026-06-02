import React, { useMemo } from 'react';
import { FlatList, View, StyleSheet, Text } from 'react-native';
import ChannelCard from './ChannelCard';
import { IPTVChannel } from '../types/iptv';

const GRID_COLUMNS = 6;
// 1. Definí las alturas estimadas afuera del componente (ajustalas a tu diseño real si es necesario)
const ALTURA_HEADER = 60; // Lo que mide el contenedor de la categoría
const ALTURA_ROW = 160;   // Lo que mide la fila con las tarjetas de canales + sus márgenes
interface ChannelGridProps {
  channels: IPTVChannel[];
  selectedChannelId?: string;
  onChannelPress: (channel: IPTVChannel) => void;
  emptyMessage?: string;
  groupByCategory?: boolean;
}

type GridItem =
  | {
      type: 'header';
      id: string;
      title: string;
    }
  | {
      type: 'row';
      id: string;
      channels: IPTVChannel[];
    };

const chunkChannels = (channels: IPTVChannel[]): IPTVChannel[][] => {
  const rows: IPTVChannel[][] = [];

  for (let index = 0; index < channels.length; index += GRID_COLUMNS) {
    rows.push(channels.slice(index, index + GRID_COLUMNS));
  }

  return rows;
};

const buildGroupedGridItems = (channels: IPTVChannel[]): GridItem[] => {
  const groups = new Map<string, IPTVChannel[]>();

  for (const channel of channels) {
    const groupName = channel.group || 'Sin categoria';
    const groupChannels = groups.get(groupName) ?? [];

    groupChannels.push(channel);
    groups.set(groupName, groupChannels);
  }

  return Array.from(groups.entries()).flatMap(([groupName, groupChannels]) => [
    {
      type: 'header' as const,
      id: `header-${groupName}`,
      title: groupName,
    },
    ...chunkChannels(groupChannels).map((rowChannels, rowIndex) => ({
      type: 'row' as const,
      id: `row-${groupName}-${rowIndex}`,
      channels: rowChannels,
    })),
  ]);
};

const buildFlatGridItems = (channels: IPTVChannel[]): GridItem[] =>
  chunkChannels(channels).map((rowChannels, rowIndex) => ({
    type: 'row',
    id: `row-${rowIndex}`,
    channels: rowChannels,
  }));

export default function ChannelGrid({
  channels,
  selectedChannelId,
  onChannelPress,
  emptyMessage,
  groupByCategory = false,
}: ChannelGridProps) {
  const gridItems = useMemo(
    () =>
      groupByCategory
        ? buildGroupedGridItems(channels)
        : buildFlatGridItems(channels),
    [channels, groupByCategory],
  );

  if (channels.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No hay canales para mostrar</Text>
        <Text style={styles.emptyCopy}>
          {emptyMessage || 'Proba otra categoria o carga una playlist distinta.'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
  data={gridItems}
  keyExtractor={item => item.id}
  style={styles.list}
  contentContainerStyle={styles.listContent}
  renderItem={({ item }) => (
    item.type === 'header' ? (
      <View style={styles.categoryHeader}>
        <Text style={styles.categoryTitle}>{item.title}</Text>
        <View style={styles.categoryDivider} />
      </View>
    ) : (
      <View style={styles.row}>
        {item.channels.map(channel => (
          <ChannelCard
            key={channel.id}
            channel={channel}
            isSelected={channel.id === selectedChannelId}
            onPress={onChannelPress}
          />
        ))}
      </View>
    )
  )}
  
  // SOLUCIÓN AL CRASH: Desactivamos el clipping agresivo de Android
  removeClippedSubviews={false}

  // OPTIMIZACIÓN DE RENDIMIENTO: Cálculo matemático exacto de posiciones mixtas
  getItemLayout={(data, index) => {
    if (!data) return { length: 0, offset: 0, index };

    let offset = 0;
    for (let i = 0; i < index; i++) {
      const item = data[i];
      offset += item?.type === 'header' ? ALTURA_HEADER : ALTURA_ROW;
    }

    const currentItem = data[index];
    const length = currentItem?.type === 'header' ? ALTURA_HEADER : ALTURA_ROW;

    return { length, offset, index };
  }}

  // Ajustes de ráfaga para microprocesadores de TV (un poco más conservadores)
  initialNumToRender={8}      // 8 elementos (filas/headers) ya cubren más de una pantalla entera de TV
  maxToRenderPerBatch={4}     // Renderiza de a 4 filas por vez para que el hilo de JS respire al scrollear rápido
  windowSize={5}              // Mantiene un buffer sano sin devorarse la RAM de la tele
/>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
    paddingHorizontal: 24,
    paddingTop: 20,
  },

  listContent: {
    paddingBottom: 40,
  },

  list: {
    width: "100%"
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },

  categoryHeader: {
    paddingTop: 18,
    paddingBottom: 8,
  },

  categoryTitle: {
    color: '#f2f2f2',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'left',
  },

  categoryDivider: {
    height: 1,
    backgroundColor: '#3a3a3a',
    marginTop: 8,
    width: '100%',
  },

  emptyContainer: {
    flex: 1,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  emptyTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
  },

  emptyCopy: {
    color: '#bdbdbd',
    fontSize: 16,
    textAlign: 'center',
    maxWidth: 420,
    lineHeight: 24,
  },
});
