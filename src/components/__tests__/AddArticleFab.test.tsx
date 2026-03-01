import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AddArticleFab } from '@/components/AddArticleFab'

const push = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}))

describe('AddArticleFab', () => {
  const readText = vi.fn<() => Promise<string>>()

  beforeEach(() => {
    readText.mockReset()
    readText.mockResolvedValue('')
    push.mockReset()
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: { readText },
    })
  })

  it('renders a floating action button', () => {
    render(<AddArticleFab />)

    const button = screen.getByRole('button', { name: 'Add article' })
    expect(button).toBeInTheDocument()
    expect(button).toHaveClass('fixed', 'bottom-6', 'right-6', 'z-40', 'w-14', 'h-14', 'rounded-full', 'bg-accent-celadon', 'shadow-lg')
  })

  it('opens modal shell when button is clicked', () => {
    render(<AddArticleFab />)

    fireEvent.click(screen.getByRole('button', { name: 'Add article' }))

    expect(screen.getByText('Add Article')).toBeInTheDocument()
  })

  it('renders bottom-sheet fields and keeps submit disabled for invalid input', () => {
    render(<AddArticleFab />)
    fireEvent.click(screen.getByRole('button', { name: 'Add article' }))

    const input = screen.getByPlaceholderText('Paste article or Reddit link')
    const submit = screen.getByRole('button', { name: 'Adapt to Korean →' })

    expect(input).toBeInTheDocument()
    expect(submit).toBeDisabled()

    fireEvent.change(input, { target: { value: 'not-a-url' } })
    expect(submit).toBeDisabled()

    fireEvent.change(input, { target: { value: 'https://example.com/article' } })
    expect(submit).toBeEnabled()
  })

  it('closes the modal when backdrop is clicked', () => {
    render(<AddArticleFab />)
    fireEvent.click(screen.getByRole('button', { name: 'Add article' }))

    fireEvent.click(screen.getByLabelText('Close add article modal'))

    expect(screen.queryByText('Add Article')).not.toBeInTheDocument()
  })

  it('autofills from clipboard when modal opens with a valid URL', async () => {
    readText.mockResolvedValue(' https://example.com/story ')
    render(<AddArticleFab />)

    fireEvent.click(screen.getByRole('button', { name: 'Add article' }))

    await waitFor(() => {
      expect(readText).toHaveBeenCalledTimes(1)
      expect(screen.getByPlaceholderText('Paste article or Reddit link')).toHaveValue('https://example.com/story')
    })
  })

  it('ignores non-url clipboard text', async () => {
    readText.mockResolvedValue('hello world')
    render(<AddArticleFab />)

    fireEvent.click(screen.getByRole('button', { name: 'Add article' }))

    await waitFor(() => {
      expect(readText).toHaveBeenCalledTimes(1)
      expect(screen.getByPlaceholderText('Paste article or Reddit link')).toHaveValue('')
    })
  })

  it('resets url when modal closes and handles clipboard denial silently', async () => {
    readText
      .mockRejectedValueOnce(new Error('Denied'))
      .mockResolvedValueOnce('not-a-url')

    render(<AddArticleFab />)
    fireEvent.click(screen.getByRole('button', { name: 'Add article' }))

    await waitFor(() => {
      expect(readText).toHaveBeenCalledTimes(1)
    })

    const input = screen.getByPlaceholderText('Paste article or Reddit link')
    fireEvent.change(input, { target: { value: 'https://manual-entry.com' } })
    expect(input).toHaveValue('https://manual-entry.com')

    fireEvent.click(screen.getByLabelText('Close add article modal'))
    expect(screen.queryByText('Add Article')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Add article' }))
    await waitFor(() => {
      expect(readText).toHaveBeenCalledTimes(2)
      expect(screen.getByPlaceholderText('Paste article or Reddit link')).toHaveValue('')
    })
  })

  it('submits valid URL and navigates to article processing flow', async () => {
    readText.mockResolvedValue('not-a-url')
    render(<AddArticleFab />)

    fireEvent.click(screen.getByRole('button', { name: 'Add article' }))
    const input = screen.getByPlaceholderText('Paste article or Reddit link')
    fireEvent.change(input, { target: { value: 'https://news.ycombinator.com/item?id=123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Adapt to Korean →' }))

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/articles/new?url=https%3A%2F%2Fnews.ycombinator.com%2Fitem%3Fid%3D123')
      expect(screen.queryByText('Add Article')).not.toBeInTheDocument()
    })
  })

  it('submits on Enter key inside URL input', async () => {
    readText.mockResolvedValue('not-a-url')
    render(<AddArticleFab />)

    fireEvent.click(screen.getByRole('button', { name: 'Add article' }))
    const input = screen.getByPlaceholderText('Paste article or Reddit link')
    fireEvent.change(input, { target: { value: 'https://www.reddit.com/r/korea/comments/abc/title' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/articles/new?url=https%3A%2F%2Fwww.reddit.com%2Fr%2Fkorea%2Fcomments%2Fabc%2Ftitle')
      expect(screen.queryByText('Add Article')).not.toBeInTheDocument()
    })
  })
})
