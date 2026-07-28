import { Link } from 'react-router-dom'
import { publicAssetPath } from '../config/paths'
import type { CarePageDefinition } from './carePages'

interface CarePageProps {
  page: CarePageDefinition
  dateLabel?: string
  dateTime?: string
  secondaryDateLabel?: string | null
  imageUrl?: string
  imageAlt?: string
  actionPending?: boolean
  onAction?: () => void
  utilityLabel?: string
  onUtilityAction?: () => void
  utilityPending?: boolean
}

export function CarePage({
  page,
  dateLabel = '2026년 7월 21일',
  dateTime = '2026-07-21',
  secondaryDateLabel = '음력 2026년 7월 21일',
  imageUrl = publicAssetPath('family-photo.png'),
  imageAlt = '한자리에 모여 웃고 있는 가족',
  actionPending = false,
  onAction,
  utilityLabel,
  onUtilityAction,
  utilityPending = false,
}: CarePageProps) {
  const isComplete = page.tone === 'complete'
  const actionDisabled = page.tone === 'disabled' || actionPending

  return (
    <main className={`care-page care-page--${page.tone}`}>
      <div className="care-page__date" aria-label="오늘 날짜">
        <time dateTime={dateTime}>{dateLabel}</time>
        {secondaryDateLabel ? <span>{secondaryDateLabel}</span> : null}
      </div>

      <figure className="care-page__photo">
        <img src={imageUrl} alt={imageAlt} />
      </figure>

      <section className="care-page__message" aria-live={isComplete ? 'polite' : 'off'}>
        <h1>{page.title}</h1>

        {page.actionLabel && onAction ? (
          <button
            className="care-page__action"
            type="button"
            disabled={actionDisabled}
            aria-busy={actionPending}
            onClick={onAction}
          >
            {actionPending ? '처리하고 있어요' : page.actionLabel}
          </button>
        ) : page.actionLabel && page.actionTo ? (
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

        {utilityLabel && onUtilityAction ? (
          <button
            className="care-page__utility"
            type="button"
            disabled={utilityPending}
            aria-busy={utilityPending}
            onClick={onUtilityAction}
          >
            {utilityLabel}
          </button>
        ) : null}
      </section>
    </main>
  )
}
