import { FormEvent, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ApiError, pairTablet } from '../api/client'
import { BrandMark } from '../components/BrandMark'

interface PairingLocationState {
  from?: string
}

export function TabletPairingPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [pairingCode, setPairingCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!pairingCode || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await pairTablet(pairingCode)
      setPairingCode('')
      const destination = (location.state as PairingLocationState | null)?.from
      navigate(destination === '/conversation' ? destination : '/tablet', {
        replace: true,
      })
    } catch (cause) {
      setError(
        cause instanceof ApiError && [401, 423, 429].includes(cause.status)
          ? 'pairing code가 올바르지 않거나 잠시 입력이 제한됐어요.'
          : '등록 서버에 연결하지 못했어요. 잠시 후 다시 시도해주세요.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <BrandMark />
        <div>
          <h1>태블릿 등록</h1>
          <p>서버 관리자가 제공한 pairing code를 한 번 입력해주세요.</p>
        </div>
        <form onSubmit={handleSubmit}>
          <label htmlFor="tablet-pairing-code">pairing code</label>
          <input
            id="tablet-pairing-code"
            autoComplete="one-time-code"
            required
            type="password"
            value={pairingCode}
            onChange={(event) => setPairingCode(event.target.value)}
          />
          {error ? <p className="auth-error" role="alert">{error}</p> : null}
          <button disabled={submitting || !pairingCode} type="submit">
            {submitting ? '등록하고 있어요' : '태블릿 등록'}
          </button>
        </form>
      </section>
    </main>
  )
}
