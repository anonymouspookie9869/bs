import React, { useRef, useState } from 'react';

interface InteractiveCardProps {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
  glowColor?: string;
  as?: 'div' | 'article';
}

/**
 * GPU-composited 3D pointer-tilt + directional cursor spotlight hover card.
 * Only animates `transform` and `opacity` for zero layout thrash and <= 200ms feel.
 */
export function InteractiveCard({
  children,
  className = '',
  maxTilt = 4.5,
  glowColor = 'rgba(229, 57, 53, 0.16)',
  as = 'div',
}: InteractiveCardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [transform, setTransform] = useState('perspective(900px) rotateX(0deg) rotateY(0deg) translate3d(0,0,0)');
  const [spotlight, setSpotlight] = useState({ x: 50, y: 50, active: false });

  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType !== 'mouse') return;
    const el = cardRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;

    const rotY = (px - 0.5) * maxTilt * 2;
    const rotX = (0.5 - py) * maxTilt * 2;

    setTransform(
      `perspective(900px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) translate3d(0, -4px, 0)`,
    );
    setSpotlight({
      x: Math.round(px * 100),
      y: Math.round(py * 100),
      active: true,
    });
  };

  const handlePointerLeave = () => {
    setTransform('perspective(900px) rotateX(0deg) rotateY(0deg) translate3d(0,0,0)');
    setSpotlight((prev) => ({ ...prev, active: false }));
  };

  const Tag = as;

  return (
    <Tag
      ref={cardRef as React.RefObject<HTMLDivElement>}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={{
        transform,
        transition: spotlight.active
          ? 'transform 120ms cubic-bezier(0.16, 1, 0.3, 1)'
          : 'transform 220ms cubic-bezier(0.16, 1, 0.3, 1)',
        willChange: 'transform',
      }}
      className={`relative ${className}`}
    >
      {/* Subtle directional hover sheen */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-200 z-10"
        style={{
          opacity: spotlight.active ? 1 : 0,
          background: `radial-gradient(360px circle at ${spotlight.x}% ${spotlight.y}%, ${glowColor}, transparent 70%)`,
        }}
      />
      {children}
    </Tag>
  );
}
