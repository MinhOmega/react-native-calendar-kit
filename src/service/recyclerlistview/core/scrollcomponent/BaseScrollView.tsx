import * as React from 'react';
import { CSSProperties } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { Dimension } from '../LayoutProvider';

export interface ScrollViewDefaultProps {
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  horizontal: boolean;
  style?: CSSProperties | null;
}
export interface ScrollEvent {
  nativeEvent: {
    contentOffset: {
      x: number;
      y: number;
    };
    layoutMeasurement?: Dimension;
    contentSize?: Dimension;
  };
}
export default abstract class BaseScrollView extends React.Component<
  ScrollViewDefaultProps,
  {}
> {
  constructor(props: ScrollViewDefaultProps) {
    super(props);
  }

  public abstract scrollTo(scrollInput: {
    x: number;
    y: number;
    animated: boolean;
  }): void;
}
