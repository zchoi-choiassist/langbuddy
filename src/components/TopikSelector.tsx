'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TOPIK_LEVELS } from '@/lib/constants'

export function TopikSelector({ initial }: { initial: number }) {
  const router = useRouter()
  const [level, setLevel] = useState(initial)

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newLevel = Number(e.target.value)
    const prevLevel = level
    setLevel(newLevel)
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topikLevel: newLevel }),
      })
      if (!res.ok) throw new Error('Failed to update TOPIK level')
      router.refresh()
    } catch {
      setLevel(prevLevel)
    }
  }

  return (
    <select
      value={level}
      onChange={handleChange}
      className="rounded-md border border-border-light bg-bg-surface px-2 py-1 text-sm text-text-secondary"
    >
      {TOPIK_LEVELS.map(l => (
        <option key={l} value={l}>TOPIK {l}</option>
      ))}
    </select>
  )
}
