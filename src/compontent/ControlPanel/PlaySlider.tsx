import React, {
  useEffect,
  useRef,
  useState,
  MouseEvent as ReactMouseEvent,
} from 'react';
import { BehaviorSubject } from 'rxjs';
import { skip } from 'rxjs/operators';
import styles from './PlaySlider.css';

type ClipRange = [number, number];
type PlaySliderProps = {
  max: number;
  value: number;
  range: ClipRange;
  width: number;
  onRangeChange: (range: ClipRange) => void;
};

const getDragLeft$ = (
  div: HTMLDivElement,
  ev: ReactMouseEvent<HTMLDivElement, MouseEvent>,
  min: number,
  max: number
) => {
  const left$ = new BehaviorSubject<number>(0);
  let disX = ev.clientX - div.offsetLeft;
  document.onmousemove = (ev) => {
    let l = ev.clientX - disX;
    if (l <= min || l >= max) {
      return;
    }
    div.style.left = `${l}px`;
    left$.next(l);
  };
  document.onmouseup = () => {
    document.onmousemove = null;
    document.onmouseup = null;
  };
  return left$.pipe(skip(1));
};

const updateRangEl = (
  rangeDiv: HTMLDivElement,
  lengthPerPX: number,
  range: ClipRange
) => {
  if (rangeDiv !== null) {
    const [s, e] = range;
    rangeDiv.style.left = `${s / lengthPerPX + 2}px`;
    rangeDiv.style.width = `${e / lengthPerPX - s / lengthPerPX + 2}px`;
  }
};

export const PlaySlider = ({
  max,
  value,
  range,
  width,
  onRangeChange,
}: PlaySliderProps) => {
  const dragger1 = useRef<HTMLDivElement>(null);
  const dragger2 = useRef<HTMLDivElement>(null);
  const rangeRef = useRef<HTMLDivElement>(null);

  const maxLength = width;
  let [clipStart, clipEnd] = range;
  console.log('max:', max);
  console.log('maxLength:', maxLength);
  console.log('range:', range);
  let lengthPerPX = max / maxLength || 1;
  console.log('lengthPerPX:', lengthPerPX);
  let clipStartPX = clipStart / lengthPerPX;
  let clipEndPX = clipEnd / lengthPerPX;
  let indicatorPX = value / lengthPerPX;
  if (indicatorPX > clipEndPX) {
    indicatorPX = clipEndPX;
  }
  if (indicatorPX < clipStartPX) {
    indicatorPX = clipStartPX;
  }
  const withDragging = (
    dragger: HTMLDivElement,
    ev: ReactMouseEvent<HTMLDivElement, MouseEvent>,
    theOtherDragger: HTMLDivElement
  ) => {
    getDragLeft$(dragger, ev, 0, maxLength).subscribe({
      next: (left) => {
        let nextRange = [
          left * lengthPerPX,
          theOtherDragger.offsetLeft * lengthPerPX,
        ].sort((a, b) => a - b) as ClipRange;
        let [nextStart, nextEnd] = nextRange;
        onRangeChange([
          (nextStart / lengthPerPX - 1) * lengthPerPX,
          (nextEnd / lengthPerPX + 1) * lengthPerPX,
        ]);
        if (rangeRef.current !== null) {
          updateRangEl(rangeRef.current, lengthPerPX, nextRange);
        }
      },
    });
  };
  return (
    <div className={styles.Slider} style={{ width: `${width + 4}px` }}>
      <div
        className={styles.Range}
        ref={rangeRef}
        style={{
          left: `${clipStartPX}px`,
          width: `${clipEndPX - clipStartPX}px`,
        }}
      />
      <div
        className={styles.RangeDragger}
        ref={dragger1}
        onMouseDown={(ev) => {
          if (dragger1.current === null || dragger2.current === null) {
            return;
          }
          withDragging(dragger1.current, ev, dragger2.current);
        }}
        style={{ left: `${clipStartPX}px` }}
      />
      <div
        className={styles.RangeDragger}
        ref={dragger2}
        style={{ left: `${clipEndPX}px` }}
        onMouseDown={(ev) => {
          if (dragger1.current === null || dragger2.current === null) {
            return;
          }
          withDragging(dragger2.current, ev, dragger1.current);
        }}
      />
      <div className={styles.Indicator} style={{ left: `${indicatorPX}px` }} />
    </div>
  );
};
