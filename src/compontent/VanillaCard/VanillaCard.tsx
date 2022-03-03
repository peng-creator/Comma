import React, { useEffect, useRef, CSSProperties } from 'react';
import VanillaTilt from 'vanilla-tilt';

export const VanillaCard = ({
  style,
  children,
}: {
  style?: CSSProperties;
  children?: any;
}) => {
  const divRef = useRef(null);

  useEffect(() => {
    if (divRef.current !== null) {
      const divEl = divRef.current;
      VanillaTilt.init(divEl);
    }
  }, [divRef]);

  return (
    <div
      style={{
        transformStyle: 'preserve-3d',
        transform: 'perspective(1000px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #2d4263 , #1c2431)',
        borderRadius: '5px',
        width: '150px',
        height: '150px',
        cursor: 'pointer',
        overflow: 'hidden',
      }}
      ref={divRef}
      data-tilt-glare
      data-tilt-max-glare="0.1"
      data-tilt-reverse="true"
      data-tilt-scale="0.9"
    >
      <div style={{ transform: 'translateZ(20px)', ...style }}>{children}</div>
    </div>
  );
};

VanillaCard.defaultProps = {
  style: {},
  children: [],
};
