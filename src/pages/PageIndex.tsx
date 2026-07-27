import { Link } from 'react-router-dom'
import { ArrowIcon } from '../components/ArrowIcon'
import { BrandMark } from '../components/BrandMark'
import { carePages } from './carePages'

interface PageIndexProps {
  notFound?: boolean
}

export function PageIndex({ notFound = false }: PageIndexProps) {
  return (
    <main className="index-page">
      <header className="index-header">
        <BrandMark />
        <Link className="index-header__dashboard" to="/tablet">
          태블릿 실행
          <ArrowIcon />
        </Link>
      </header>

      <section className="index-intro">
        <div>
          <h1>{notFound ? '페이지를 찾을 수 없어요' : '돌봄의 모든 순간을 한곳에'}</h1>
          <p>
            {notFound
              ? '아래 화면 목록에서 이동할 페이지를 선택해주세요.'
              : '큰 글씨와 간단한 동작으로 식사, 복약, 대화를 편안하게 기록해요.'}
          </p>
        </div>
        <span className="index-intro__count">
          {carePages.length + 1}
          <small>개의 화면</small>
        </span>
      </section>

      <nav className="page-list" aria-label="케어 앱 화면">
        <ol>
          {carePages.map((page, index) => (
            <li key={page.path}>
              <Link to={page.path}>
                <span className="page-list__number">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="page-list__copy">
                  <strong>{page.navLabel}</strong>
                  <small>{page.title}</small>
                </span>
                <ArrowIcon />
              </Link>
            </li>
          ))}
          <li>
            <Link to="/dashboard">
              <span className="page-list__number">
                {String(carePages.length + 1).padStart(2, '0')}
              </span>
              <span className="page-list__copy">
                <strong>웹 대시보드</strong>
                <small>돌봄 기록 카드 모아보기</small>
              </span>
              <ArrowIcon />
            </Link>
          </li>
        </ol>
      </nav>
    </main>
  )
}
