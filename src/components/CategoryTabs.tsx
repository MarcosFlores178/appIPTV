import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

interface CategoryTabsProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

export default function CategoryTabs({
  categories,
  selectedCategory,
  onSelectCategory,
}: CategoryTabsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      style={styles.scrollView}
    >
      {categories.map(category => {
        const isSelected = category === selectedCategory;

        return (
          <Pressable
            key={category}
            onPress={() => onSelectCategory(category)}
            style={({ pressed, focused }) => [
              styles.tab,
              isSelected && styles.tabSelected,
              focused && styles.tabFocused,
              pressed && styles.tabPressed,
            ]}
          >
            <Text style={[styles.label, isSelected && styles.labelSelected]}>
              {category}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 4,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 12,
  },

  tab: {
    minHeight: 46,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2f2f2f',
    justifyContent: 'center',
    alignItems: 'center',
  },

  tabSelected: {
    backgroundColor: '#f0f0f0',
    borderColor: '#f0f0f0',
  },

  tabFocused: {
    borderColor: '#ffffff',
    transform: [{ scale: 1.08 }],
  },

  tabPressed: {
    opacity: 0.85,
  },

  label: {
    color: '#e0e0e0',
    fontSize: 15,
    fontWeight: '600',
  },

  labelSelected: {
    color: '#141414',
  },

  scrollView: {
    marginHorizontal: -4,
  },
});
