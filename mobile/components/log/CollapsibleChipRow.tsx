import { useState, useRef, useCallback, useEffect, Fragment } from 'react';
import { View, Text, TouchableOpacity, LayoutChangeEvent, ViewStyle } from 'react-native';
import { spacing, radii } from '@/constants/tokens';
import { useColors } from '@/lib/theme';

interface Props {
  items: string[];
  renderChip: (item: string, index: number) => React.ReactNode;
  gap?: number;
  style?: ViewStyle;
}

/**
 * Renders chips in a wrapping row and collapses to 2 rows with a "+N more" toggle.
 * Uses onLayout measurement to calculate the exact cutoff — works with variable chip widths.
 */
export function CollapsibleChipRow({ items, renderChip, gap = 8, style }: Props) {
  const colors = useColors();
  const [showAll, setShowAll] = useState(false);
  const [cutoff, setCutoff] = useState<number | null>(null);
  const layouts = useRef<Array<{ y: number; height: number } | null>>([]);
  const settled = useRef(false);

  // Reset measurement when the item list changes size
  useEffect(() => {
    layouts.current = new Array(items.length).fill(null);
    settled.current = false;
    setCutoff(null);
    setShowAll(false);
  }, [items.length]);

  const onChipLayout = useCallback((i: number, e: LayoutChangeEvent) => {
    if (settled.current) return;
    const { y, height } = e.nativeEvent.layout;
    layouts.current[i] = { y, height };

    if (layouts.current.some(l => l === null)) return; // not all measured yet

    settled.current = true;
    const first = layouts.current[0]!;
    // y threshold for the start of row 3
    const row3Y = first.y + first.height + gap + first.height;

    let cut = items.length;
    for (let j = 0; j < items.length; j++) {
      if (layouts.current[j]!.y >= row3Y - 2) {
        cut = j;
        break;
      }
    }
    // Only set cutoff when actual truncation is needed
    if (cut < items.length) setCutoff(cut);
  }, [items.length, gap]);

  const hidden = cutoff !== null ? items.length - cutoff : 0;
  const visible = (!showAll && cutoff !== null) ? items.slice(0, cutoff) : items;

  const moreChip = (
    <TouchableOpacity
      style={{
        paddingHorizontal: spacing[3],
        paddingVertical: spacing[1.5],
        borderRadius: radii.pill,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface2,
      }}
      activeOpacity={0.7}
      onPress={() => setShowAll(v => !v)}
    >
      <Text style={{ fontFamily: 'InterTight-Medium', fontSize: 13, color: colors.sky }}>
        {showAll ? 'Show less' : `+${hidden} more`}
      </Text>
    </TouchableOpacity>
  );

  // Measurement phase: render everything (one frame), record y positions
  if (cutoff === null) {
    return (
      <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap }, style]}>
        {items.map((item, i) => (
          <View key={i} onLayout={e => onChipLayout(i, e)}>
            {renderChip(item, i)}
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap }, style]}>
      {visible.map((item, i) => <Fragment key={i}>{renderChip(item, i)}</Fragment>)}
      {hidden > 0 && moreChip}
    </View>
  );
}
