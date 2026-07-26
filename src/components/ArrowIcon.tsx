interface ArrowIconProps {
  direction?: 'left' | 'right'
}

export function ArrowIcon({ direction = 'right' }: ArrowIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={direction === 'left' ? 'arrow-icon arrow-icon--left' : 'arrow-icon'}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}
