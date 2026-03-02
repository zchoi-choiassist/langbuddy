import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { WordLookupCard } from '@/components/WordLookupCard'

describe('WordLookupCard', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('disables add button when a variation is already in custom words', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      if (url.includes('/api/words/lookup')) {
        return {
          ok: true,
          json: async () => ({
            korean: '간격은',
            english: 'spacing',
            romanization: 'gangyeogeun',
            topikLevel: 2,
          }),
        } as Response
      }
      throw new Error(`Unexpected fetch: ${url}`)
    }))

    render(
      <WordLookupCard
        korean="간격은"
        existingCustomWords={new Set(['간격'])}
        onClose={vi.fn()}
      />
    )

    await screen.findByText('spacing')
    const button = screen.getByRole('button', { name: 'Already in Word Bank' })
    expect(button).toBeDisabled()
  })

  it('calls onWordSaved so reading view can update highlights immediately', async () => {
    const onWordSaved = vi.fn()

    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      if (url.includes('/api/words/lookup')) {
        return {
          ok: true,
          json: async () => ({
            korean: '간격이',
            english: 'spacing',
            romanization: 'gangyeogi',
            topikLevel: 2,
          }),
        } as Response
      }
      if (url.includes('/api/words/custom')) {
        return {
          ok: true,
          status: 201,
          json: async () => ({
            id: 1,
            korean: '간격',
          }),
        } as Response
      }
      throw new Error(`Unexpected fetch: ${url}`)
    }))

    render(
      <WordLookupCard
        korean="간격이"
        existingCustomWords={new Set()}
        onWordSaved={onWordSaved}
        onClose={vi.fn()}
      />
    )

    await screen.findByText('spacing')
    fireEvent.click(screen.getByRole('button', { name: 'Add to Word Bank' }))

    await waitFor(() => {
      expect(onWordSaved).toHaveBeenCalledWith('간격')
    })
  })
})
