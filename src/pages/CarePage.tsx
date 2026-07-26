import { Link } from 'react-router-dom'
import type { CarePageDefinition } from './carePages'

interface CarePageProps {
  page: CarePageDefinition
}

export function CarePage({ page }: CarePageProps) {
  const isComplete = page.tone === 'complete'

  return (
    <main className={`care-page care-page--${page.tone}`}>
      <div className="care-page__date" aria-label="오늘 날짜">
        <time dateTime="2026-07-21">2026년 7월 21일</time>
        <span>음력 2026년 7월 21일</span>
      </div>

      <figure className="care-page__photo">
        <img
          src="/family-photo.png"
          alt="한자리에 모여 웃고 있는 가족"
        />
      </figure>

      <section className="care-page__message" aria-live={isComplete ? 'polite' : 'off'}>
        <h1>{page.title}</h1>

        {page.actionLabel && page.actionTo ? (
          <Link className="care-page__action" to={page.actionTo}>
            {page.actionLabel}
          </Link>
        ) : page.actionLabel ? (
          <button className="care-page__action" type="button" disabled>
            <span className="loading-dot" aria-hidden="true" />
            {page.actionLabel}
          </button>
        ) : null}

        <p>{page.description}</p>
      </section>
    </main>
  )
}
