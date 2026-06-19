/**
 * SearchBar.js — debounced search input with a clear button.
 * Calls `onChange(text)` after the user stops typing for `debounceMs`.
 */
import React, {useState, useEffect, useRef} from 'react';
import {View, TextInput, Pressable, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {colors, radius, spacing} from '../theme/theme';

export default function SearchBar({
  placeholder = 'Search transactions…',
  onChange,
  initialValue = '',
  debounceMs = 200,
}) {
  const [text, setText] = useState(initialValue);
  const timer = useRef(null);

  useEffect(() => {
    if (timer.current) {
      clearTimeout(timer.current);
    }
    timer.current = setTimeout(() => {
      if (onChange) {
        onChange(text);
      }
    }, debounceMs);
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    };
  }, [text, debounceMs, onChange]);

  return (
    <View style={styles.container}>
      <Icon name="magnify" size={20} color={colors.textMuted} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        value={text}
        onChangeText={setText}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
      />
      {text.length > 0 ? (
        <Pressable
          onPress={() => setText('')}
          hitSlop={10}
          android_ripple={{color: colors.ripple, borderless: true, radius: 16}}>
          <Icon name="close-circle" size={18} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    marginLeft: spacing.sm,
    color: colors.text,
    fontSize: 16,
    padding: 0,
  },
});
