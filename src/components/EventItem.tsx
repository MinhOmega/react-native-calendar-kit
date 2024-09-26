import isEqual from 'lodash.isequal';
import React, { FC, useCallback, useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';
import { MILLISECONDS_IN_DAY } from '../constants';
import { useBody } from '../context/BodyContext';
import { useTheme } from '../context/ThemeProvider';
import { OnEventResponse, PackedEvent, SizeAnimation } from '../types';
import Text from './Text';

interface EventItemProps {
  event: PackedEvent;
  startUnix: number;
  renderEvent?: (event: PackedEvent, size: SizeAnimation) => React.ReactNode;
  onPressEvent?: (event: OnEventResponse) => void;
  onLongPressEvent?: (event: PackedEvent) => void;
  isDragging?: boolean;
  visibleDates: Record<string, { diffDays: number; unix: number }>;
}

const EventItem: FC<EventItemProps> = ({
  event: eventInput,
  startUnix,
  renderEvent,
  onPressEvent,
  onLongPressEvent,
  isDragging,
  visibleDates,
}) => {
  const theme = useTheme(
    useCallback((state) => {
      return {
        eventContainerStyle: state.eventContainerStyle,
        eventTitleStyle: state.eventTitleStyle,
      };
    }, [])
  );

  const {
    minuteHeight,
    columnWidthAnim,
    start,
    end,
    rightEdgeSpacing,
    overlapEventsSpacing,
    eventOverlapMethod,
  } = useBody();
  const { _internal, ...event } = eventInput;
  const {
    duration,
    startMinutes = 0,
    total,
    index,
    columnSpan,
    startUnix: eventStartUnix,
  } = _internal;

  const data = useMemo(() => {
    const maxDuration = end - start;
    let newStart = startMinutes - start;
    let totalDuration = Math.min(duration, maxDuration);
    if (newStart < 0) {
      totalDuration += newStart;
      newStart = 0;
    }

    let diffDays = Math.floor(
      (eventStartUnix - startUnix) / MILLISECONDS_IN_DAY
    );

    if (eventStartUnix < startUnix) {
      for (let i = eventStartUnix; i < startUnix; i += MILLISECONDS_IN_DAY) {
        if (!visibleDates[i]) {
          diffDays++;
        }
      }
    } else {
      for (let i = startUnix; i < eventStartUnix; i += MILLISECONDS_IN_DAY) {
        if (!visibleDates[i]) {
          diffDays--;
        }
      }
    }

    return {
      totalDuration,
      startMinutes: newStart,
      diffDays,
    };
  }, [
    duration,
    end,
    eventStartUnix,
    start,
    startMinutes,
    startUnix,
    visibleDates,
  ]);

  const eventHeight = useDerivedValue(
    () => data.totalDuration * minuteHeight.value,
    [data.totalDuration]
  );

  const eventWidth = useDerivedValue(() => {
    const fullWidth = columnWidthAnim.value - rightEdgeSpacing;

    switch (eventOverlapMethod) {
      case 'lane':
        const totalColumns = total - columnSpan;
        const totalOverlap = totalColumns * overlapEventsSpacing;
        const totalWidth = fullWidth - totalOverlap;
        return withTiming((totalWidth / total) * columnSpan, { duration: 150 });
      case 'stack':
        return withTiming(fullWidth / (index + 1), { duration: 150 });
      case 'ignore':
        return withTiming(fullWidth, { duration: 150 });
      default:
        return withTiming(fullWidth, { duration: 150 });
    }
  }, [
    columnSpan,
    rightEdgeSpacing,
    overlapEventsSpacing,
    total,
    eventOverlapMethod,
    index,
  ]);

  const eventPosX = useDerivedValue(() => {
    let left = data.diffDays * columnWidthAnim.value;

    switch (eventOverlapMethod) {
      case 'lane':
        left +=
          (eventWidth.value + overlapEventsSpacing) * (index / columnSpan);
        break;
      case 'stack':
        left += columnWidthAnim.value - rightEdgeSpacing - eventWidth.value;
        break;
      case 'ignore':
        break;
    }

    return withTiming(left, { duration: 150 });
  }, [
    data.diffDays,
    overlapEventsSpacing,
    index,
    columnSpan,
    eventOverlapMethod,
    eventWidth.value,
    columnWidthAnim.value,
    rightEdgeSpacing,
  ]);

  const top = useDerivedValue(() => {
    return data.startMinutes * minuteHeight.value;
  }, [data.startMinutes]);

  const animView = useAnimatedStyle(() => {
    return {
      height: eventHeight.value,
      width: eventWidth.value,
      left: eventPosX.value + 1,
      top: top.value,
      zIndex: eventPosX.value + 1,
    };
  });

  const _onPressEvent = () => {
    if (onPressEvent) {
      onPressEvent(eventInput);
    }
  };

  const _onLongPressEvent = () => {
    onLongPressEvent!(eventInput);
  };

  const opacity = isDragging ? 0.5 : 1;

  return (
    <Animated.View style={[styles.container, animView]}>
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={0.6}
        disabled={!onPressEvent && !onLongPressEvent}
        onPress={onPressEvent ? _onPressEvent : undefined}
        onLongPress={onLongPressEvent ? _onLongPressEvent : undefined}
      >
        <View
          style={[
            styles.contentContainer,
            { backgroundColor: event.color },
            theme.eventContainerStyle,
            { opacity },
          ]}
        >
          {renderEvent ? (
            renderEvent(eventInput, {
              width: eventWidth,
              height: eventHeight,
            })
          ) : (
            <Text style={[styles.title, theme.eventTitleStyle]}>
              {event.title}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default React.memo(EventItem, (prev, next) => {
  return (
    isEqual(prev.event, next.event) &&
    isEqual(prev.visibleDates, next.visibleDates) &&
    prev.startUnix === next.startUnix &&
    prev.renderEvent === next.renderEvent &&
    prev.isDragging === next.isDragging &&
    prev.onPressEvent === next.onPressEvent &&
    prev.onLongPressEvent === next.onLongPressEvent
  );
});

const styles = StyleSheet.create({
  container: { position: 'absolute', overflow: 'hidden' },
  title: { fontSize: 12, paddingHorizontal: 2 },
  contentContainer: { borderRadius: 2, width: '100%', height: '100%' },
});
