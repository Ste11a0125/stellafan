import { useEffect, useRef } from 'react';

type Props = {
  x: number;
  y: number;
  onDone: () => void;
};

const PARTICLE_COLORS = ['#f5a623', '#2affa0', '#ff5c1a', '#ffffff'];

export default function CompletionBurst({ x, y, onDone }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(onDone, 700);
    return () => clearTimeout(timer);
  }, [onDone]);

  const particles = Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * Math.PI * 2;
    const distance = 40 + Math.random() * 20;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance;
    const color = PARTICLE_COLORS[i % PARTICLE_COLORS.length];

    return { dx, dy, color };
  });

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        left: x,
        top: y,
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    >
      {particles.map((p, i) => (
        <div
          key={i}
          className="particle"
          style={{
            position: 'absolute',
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: p.color,
            left: -3,
            top: -3,
            '--dx': `${p.dx}px`,
            '--dy': `${p.dy}px`,
            animationDelay: `${i * 20}ms`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
