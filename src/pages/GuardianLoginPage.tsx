import { FormEvent, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ApiError, guardianLogin } from '../api/client'
import { BrandMark } from '../components/BrandMark'

interface LoginLocationState {
  from?: string
}

export function GuardianLoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!password || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await guardianLogin(password)
      setPassword('')
      const destination = (location.state as LoginLocationState | null)?.from
      navigate(destination?.startsWith('/dashboard') ? destination : '/dashboard', {
        replace: true,
      })
    } catch (cause) {
      setError(
        cause instanceof ApiError && [401, 423, 429].includes(cause.status)
          ? '비밀번호가 올바르지 않거나 잠시 로그인이 제한됐어요.'
          : '로그인 서버에 연결하지 못했어요. 잠시 후 다시 시도해주세요.',
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
          <h1>보호자 로그인</h1>
          <p>돌봄 기록은 보호자 비밀번호 확인 후 볼 수 있어요.</p>
        </div>
        <form onSubmit={handleSubmit}>
          <label htmlFor="guardian-password">보호자 비밀번호</label>
          <input
            id="guardian-password"
            autoComplete="current-password"
            minLength={8}
            required
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {error ? <p className="auth-error" role="alert">{error}</p> : null}
          <button disabled={submitting || !password} type="submit">
            {submitting ? '확인하고 있어요' : '로그인'}
          </button>
        </form>
      </section>
    </main>
  )
}
