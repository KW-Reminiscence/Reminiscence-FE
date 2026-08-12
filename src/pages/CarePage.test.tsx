import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { CarePage } from './CarePage'

describe('CarePage', () => {
  it('renders an accessible action and calls it once', () => {
    const onAction = vi.fn()

    render(
      <MemoryRouter>
        <CarePage
          page={{
            path: '/',
            navLabel: '홈',
            title: '가족사진 홈',
            description: '오늘도 함께 이야기해요.',
            actionLabel: '대화 시작하기',
            tone: 'action',
          }}
          imageUrl="data:image/svg+xml,%3Csvg/%3E"
          onAction={onAction}
        />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: '대화 시작하기' }))

    expect(screen.getByRole('heading', { name: '가족사진 홈' })).toBeVisible()
    expect(onAction).toHaveBeenCalledOnce()
  })
})
