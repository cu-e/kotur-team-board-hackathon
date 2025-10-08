import React, { type ReactNode } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { Gapped } from '@skbkontur/react-ui';

interface LottieBuilderProps {
  name: string;
  loop?: boolean;
  autoplay?: boolean;
  style?: React.CSSProperties;
  width?: number | string;
  height?: number | string;
  title?: {
    header: ReactNode;
    description?: ReactNode;
  };
  children?: ReactNode;
  className?: string;
}

export const LottieBuilder: React.FC<LottieBuilderProps> = ({
  name,
  loop = true,
  autoplay = true,
  style,
  width = '100%',
  height,
  title,
  children,
  className,
}) => {
  const src = `/lotties/${name}.lottie`;

  const lottieStyle: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: height ? (typeof height === 'number' ? `${height}px` : height) : 'auto',
    objectFit: 'contain',
    display: 'block',
  };

  return (
    <div
      className={className}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', ...style }}
    >
      <DotLottieReact src={src} loop={loop} autoplay={autoplay} style={lottieStyle} />

      {(title?.header || title?.description) && (
        <Gapped vertical gap={6} style={{ marginTop: 8, textAlign: 'center' }}>
          {title?.header && (
            <p style={{ fontWeight: 500, fontSize: 14, margin: 0 }}>{title.header}</p>
          )}
          {title?.description && (
            <p style={{ color: '#808080', fontSize: 12, margin: 0 }}>{title.description}</p>
          )}
        </Gapped>
      )}

      {children && <div style={{ marginTop: 8 }}>{children}</div>}
    </div>
  );
};
