type Props = {
  value: number; // 0-100
  color?: string;
  height?: number;
};

export default function ProgressBar({ value, color = 'var(--amber)', height = 4 }: Props) {
  return (
    <div
      style={{
        width: '100%',
        height,
        backgroundColor: 'var(--bg3)',
        borderRadius: height / 2,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${Math.min(100, Math.max(0, value))}%`,
          height: '100%',
          backgroundColor: color,
          borderRadius: height / 2,
          transition: 'width 0.4s ease',
        }}
      />
    </div>
  );
}
