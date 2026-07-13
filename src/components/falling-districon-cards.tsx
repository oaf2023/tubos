'use client'

import type { CSSProperties } from 'react'

type FallingCard = {
  left: number
  width: number
  duration: number
  delay: number
  drift: number
  rotation: number
  variant: 'yellow' | 'gold' | 'cream' | 'black'
}

const cards: FallingCard[] = [
  { left: 2, width: 122, duration: 10.4, delay: -7.3, drift: 34, rotation: 9, variant: 'yellow' },
  { left: 10, width: 148, duration: 12.8, delay: -1.4, drift: -42, rotation: -7, variant: 'yellow' },
  { left: 19, width: 108, duration: 9.7, delay: -4.6, drift: 58, rotation: 13, variant: 'gold' },
  { left: 28, width: 136, duration: 13.5, delay: -10.2, drift: -30, rotation: -12, variant: 'yellow' },
  { left: 38, width: 118, duration: 11.3, delay: -2.9, drift: 40, rotation: 8, variant: 'cream' },
  { left: 47, width: 154, duration: 14.1, delay: -8.8, drift: -55, rotation: -6, variant: 'yellow' },
  { left: 57, width: 112, duration: 10.1, delay: -5.7, drift: 28, rotation: 14, variant: 'black' },
  { left: 66, width: 142, duration: 12.2, delay: -11.5, drift: 48, rotation: -10, variant: 'yellow' },
  { left: 76, width: 126, duration: 9.9, delay: -3.8, drift: -38, rotation: 11, variant: 'gold' },
  { left: 84, width: 150, duration: 13.2, delay: -6.5, drift: 32, rotation: -8, variant: 'yellow' },
  { left: 92, width: 110, duration: 11.7, delay: -9.6, drift: -54, rotation: 12, variant: 'yellow' },
  { left: 97, width: 134, duration: 14.6, delay: -0.8, drift: -70, rotation: -13, variant: 'cream' },
]

export default function FallingDistriconCards() {
  return (
    <div className="districon-rain" aria-hidden="true">
      {cards.map((card, index) => (
        <div
          key={index}
          className={`districon-rain-card districon-rain-card--${card.variant}`}
          style={{
            left: `${card.left}%`,
            width: `${card.width}px`,
            animationDuration: `${card.duration}s`,
            animationDelay: `${card.delay}s`,
            '--card-drift': `${card.drift}px`,
            '--card-rotation': `${card.rotation}deg`,
            '--card-rotation-start': `${card.rotation * -0.45}deg`,
            '--card-rotation-end': `${card.rotation * -1.6}deg`,
          } as CSSProperties}
        >
          <span className="districon-rain-card__shine" />
          <img src="/logo-distri.png" alt="" draggable={false} />
          <span className="districon-rain-card__edge" />
        </div>
      ))}
    </div>
  )
}
