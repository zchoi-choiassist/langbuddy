import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TopikSelector } from '@/components/TopikSelector'

const refreshMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}))

describe('TopikSelector', () => {
  beforeEach(() => {
    refreshMock.mockReset()
  })

  it('refreshes the route after persisting TOPIK level', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    render(<TopikSelector initial={2} />)

    await userEvent.selectOptions(screen.getByRole('combobox'), '4')

    expect(fetchMock).toHaveBeenCalledWith('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topikLevel: 4 }),
    })
    expect(refreshMock).toHaveBeenCalledTimes(1)

    vi.unstubAllGlobals()
  })
})
