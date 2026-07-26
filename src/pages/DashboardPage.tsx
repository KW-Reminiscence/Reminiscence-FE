import { Link } from 'react-router-dom'
import { ArrowIcon } from '../components/ArrowIcon'
import { BrandMark } from '../components/BrandMark'

const cardSlots = Array.from({ length: 15 }, (_, index) => index + 1)

export function DashboardPage() {
  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <BrandMark />
        <div>
          <p>2026년 7월</p>
          <Link to="/">
            화면 목록
            <ArrowIcon />
          </Link>
        </div>
      </header>

      <section className="dashboard-title">
        <h1>우리 가족의 돌봄 기록</h1>
        <p>소중한 일상의 순간이 이곳에 차곡차곡 모여요.</p>
      </section>

      <section className="dashboard-grid" aria-label="돌봄 기록">
        {cardSlots.map((slot) => (
          <article className="dashboard-card" key={slot}>
            <div className="dashboard-card__placeholder" aria-hidden="true" />
            <div className="dashboard-card__line" aria-hidden="true">
              <span />
              <span />
            </div>
            <span className="sr-only">아직 등록되지 않은 돌봄 기록 {slot}</span>
          </article>
        ))}
      </section>
    </main>
  )
}
