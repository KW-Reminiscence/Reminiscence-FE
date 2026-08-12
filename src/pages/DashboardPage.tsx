import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { guardianLogout } from '../api/client'
import { ArrowIcon } from '../components/ArrowIcon'
import { BrandMark } from '../components/BrandMark'
import {
  anomalyEvidence,
  buildDashboardRecords,
  dashboardMetrics,
  filterDashboardMonth,
} from '../features/dashboard/dashboardView'
import { useDashboardData } from '../features/dashboard/useDashboardData'

export function DashboardPage() {
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState<string | null>(null)
  const dashboard = useDashboardData()
  const referenceDate = useMemo(() => new Date(), [])
  const monthly = useMemo(
    () => filterDashboardMonth(
      dashboard.routines,
      dashboard.conversations,
      referenceDate,
    ),
    [dashboard.conversations, dashboard.routines, referenceDate],
  )
  const records = useMemo(
    () =>
      buildDashboardRecords(
        monthly.routines,
        monthly.conversations,
      ).slice(0, 15),
    [monthly.conversations, monthly.routines],
  )
  const metrics = useMemo(
    () =>
      dashboardMetrics(
        monthly.routines,
        monthly.conversations,
        dashboard.personalState,
      ),
    [
      monthly.conversations,
      dashboard.personalState,
      monthly.routines,
    ],
  )
  const monthLabel = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'long',
  }).format(referenceDate)
  const anomalyDomains = dashboard.personalState
    ? [
        anomalyEvidence('일상 루틴', dashboard.personalState.routine),
        anomalyEvidence('회상 대화', dashboard.personalState.conversation),
      ]
    : []

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <BrandMark />
        <div>
          <p>{monthLabel}</p>
          <Link to="/">
            태블릿 화면
            <ArrowIcon />
          </Link>
          <button
            disabled={loggingOut}
            type="button"
            onClick={() => {
              setLoggingOut(true)
              setLogoutError(null)
              void guardianLogout()
                .then(() => navigate('/dashboard/login', { replace: true }))
                .catch(() => {
                  setLogoutError('로그아웃하지 못했어요. 연결을 확인하고 다시 시도해주세요.')
                })
                .finally(() => setLoggingOut(false))
            }}
          >
            {loggingOut ? '로그아웃 중' : '로그아웃'}
          </button>
        </div>
      </header>

      {logoutError ? (
        <section className="dashboard-notice" role="alert">
          <p>{logoutError}</p>
        </section>
      ) : null}

      <section className="dashboard-title">
        <div>
          <h1>우리 가족의 돌봄 기록</h1>
          <p>일정과 대화 기록을 최신 순서로 확인할 수 있어요.</p>
        </div>
        <button
          type="button"
          disabled={dashboard.loading}
          onClick={dashboard.refresh}
        >
          {dashboard.loading ? '불러오는 중' : '새로고침'}
        </button>
      </section>

      {dashboard.failedSections.length > 0 ? (
        <section className="dashboard-notice" role="status">
          <p>
            {dashboard.failedSections.join(', ')} 항목을 불러오지 못했어요.
            표시된 다른 기록은 계속 확인할 수 있어요.
          </p>
          <button type="button" onClick={dashboard.refresh}>
            다시 시도
          </button>
        </section>
      ) : null}

      <section className="dashboard-metrics" aria-label="돌봄 기록 요약">
        {metrics.map((metric) => (
          <article key={metric.label}>
            <p>{metric.label}</p>
            <strong>
              {metric.value}
              {metric.unit ? <small>{metric.unit}</small> : null}
            </strong>
          </article>
        ))}
      </section>

      <section className="dashboard-records" aria-labelledby="record-title">
        <div className="dashboard-section-title">
          <h2 id="record-title">최근 기록</h2>
          <span>{records.length}개</span>
        </div>

        {dashboard.loading && records.length === 0 ? (
          <div className="dashboard-empty" role="status">
            기록을 불러오고 있어요.
          </div>
        ) : records.length === 0 ? (
          <div className="dashboard-empty">
            아직 저장된 돌봄 기록이 없어요.
          </div>
        ) : (
          <div className="dashboard-grid">
            {records.map((record) => (
              <article className="dashboard-card" key={record.id}>
                <span
                  className={`dashboard-card__kind dashboard-card__kind--${record.kind}`}
                >
                  {record.kind === 'routine' ? '일정' : '대화'}
                </span>
                <h3>{record.title}</h3>
                <div>
                  <time dateTime={record.timestamp}>{record.dateLabel}</time>
                  <strong>{record.statusLabel}</strong>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="dashboard-anomaly" aria-labelledby="anomaly-title">
        <div className="dashboard-section-title">
          <h2 id="anomaly-title">현재 관찰 상태</h2>
          <span>
            {dashboard.personalState
              ? new Intl.DateTimeFormat('ko-KR', {
                  timeZone: 'Asia/Seoul',
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }).format(new Date(dashboard.personalState.evaluated_at))
              : '평가 정보 없음'}
          </span>
        </div>
        {anomalyDomains.length ? (
          <div className="dashboard-anomaly__grid">
            {anomalyDomains.map((domain) => (
              <article key={domain.label}>
                <div>
                  <h3>{domain.label}</h3>
                  <strong>{domain.statusLabel}</strong>
                </div>
                <p>{domain.modeLabel}</p>
                <dl>
                  <dt>활성 신호</dt>
                  <dd>{domain.signals.join(', ') || '없음'}</dd>
                  <dt>관찰 근거</dt>
                  <dd>{domain.reasons.join(' · ') || '특이 근거 없음'}</dd>
                  <dt>관찰 단위</dt>
                  <dd>{domain.observationKey ?? '기준선 수집 중'}</dd>
                </dl>
              </article>
            ))}
          </div>
        ) : (
          <div className="dashboard-empty">아직 평가된 관찰 상태가 없어요.</div>
        )}
      </section>
    </main>
  )
}
