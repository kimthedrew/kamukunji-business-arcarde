import React from 'react';

interface SkeletonProps {
  variant?: 'text' | 'title' | 'image' | 'btn' | 'rect';
  width?: string | number;
  height?: string | number;
  count?: number;
  style?: React.CSSProperties;
}

const Skeleton: React.FC<SkeletonProps> = ({ variant = 'text', width, height, count = 1, style }) => {
  const cls = `skeleton skeleton-${variant}`;
  const inlineStyle: React.CSSProperties = { ...style };
  if (width)  inlineStyle.width  = width;
  if (height) inlineStyle.height = height;

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={cls} style={inlineStyle} />
      ))}
    </>
  );
};

export const ProductCardSkeleton: React.FC = () => (
  <div className="skeleton-card">
    <Skeleton variant="image" />
    <Skeleton variant="title" />
    <Skeleton variant="text" width="40%" />
    <Skeleton variant="text" width="70%" />
    <Skeleton variant="btn" />
  </div>
);

export const TableRowSkeleton: React.FC<{ cols?: number }> = ({ cols = 4 }) => (
  <tr>
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} style={{ padding: '12px 8px' }}>
        <Skeleton variant="text" height={16} />
      </td>
    ))}
  </tr>
);

export default Skeleton;
