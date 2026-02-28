'use client'

import { useState } from 'react'
import { TOPIK_LEVELS } from '@/lib/constants'

export function TopikSelector({ initial }: { initial: number }) {
  const [level, setLevel] = useState(initial)

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newLevel = Number(e.target.value)
    setLevel(newLevel)
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topikLevel: newLevel }),
    })
  }

  return (
    <select
      value={level}
      onChange={handleChange}
      className="text-sm border border-gray-200 rounded px-2 py-1"
    >
      {TOPIK_LEVELS.map(l => (
        <option key={l} value={l}>TOPIK {l}</option>
      ))}
    </select>
  )
}
