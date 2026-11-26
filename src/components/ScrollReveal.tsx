import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  yOffset?: number;
  hoverLift?: boolean;
}

/**
 * Bi-directional GPU-composited scroll reveal & optional hover float.
 * Re-triggers smoothly when scrolling both down AND up (`once: false`),
 * while respecting `prefers-reduced-motion`.
 */
export function ScrollReveal({
  children,
  className = '',
  delay = 0,
  yOffset = 22,
  hoverLift = false,
}: ScrollRevealProps) {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: yOffset, scale: 0.985 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={hoverLift ? { y: -4 } : undefined}
      viewport={{ once: false, amount: 0.14 }}
      transition={{
        duration: 0.48,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
