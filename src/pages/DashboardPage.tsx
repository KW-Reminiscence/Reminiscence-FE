import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowIcon } from '../components/ArrowIcon'
import { BrandMark } from '../components/BrandMark'
import {
  buildDashboardRecords,
  dashboardMetrics,
} from '../features/dashboard/dashboardView'
import { useDashboardData } from '../features/dashboard/useDashboardData'

export function DashboardPage() {
  const dashboard = useDashboardData()
  const records = useMemo(
    () =>
      buildDashboardRecords(
        dashboard.routines,
        dashboard.conversations,
      ).slice(0, 15),
    [dashboard.conversations, dashboard.routines],
  )
  const metrics = useMemo(
    () =>
      dashboardMetrics(
        dashboard.routines,
        dashboard.conversations,
        dashboard.personalState,
      ),
    [
      dashboard.conversations,
      dashboard.personalState,
      dashboard.routines,
    ],
  )
  const monthLabel = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'long',
  }).format(new Date())

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <BrandMark />
        <div>
          <p>{monthLabel}</p>
          <Link to="/tablet">
            태블릿 화면
            <ArrowIcon />
          </Link>
        </div>
      </header>

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
    </main>
  )
}
