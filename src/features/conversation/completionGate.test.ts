import { describe, expect, it, vi } from 'vitest'
import { ConversationCompletionGate } from './completionGate'

describe('ConversationCompletionGate', () => {
  it('defers finish until an upload settles', () => {
    const gate = new ConversationCompletionGate()
    gate.beginUpload()

    expect(gate.requestFinish()).toBe(false)
    expect(gate.endUpload()).toBe(true)
  })

  it('deduplicates concurrent completion and stays completed', async () => {
    let release: (() => void) | undefined
    const task = vi.fn(() => new Promise<void>((resolve) => {
      release = resolve
    }))
    const gate = new ConversationCompletionGate()

    const first = gate.run(task)
    const second = gate.run(task)
    release?.()
    await Promise.all([first, second])
    await gate.run(task)

    expect(task).toHaveBeenCalledOnce()
  })

  it('allows retry after completion fails', async () => {
    const gate = new ConversationCompletionGate()
    const task = vi.fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(undefined)

    await expect(gate.run(task)).rejects.toThrow('offline')
    await expect(gate.run(task)).resolves.toBeUndefined()

    expect(task).toHaveBeenCalledTimes(2)
  })
})
