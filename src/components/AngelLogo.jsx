export default function AngelLogo({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" fill="none" aria-hidden="true">
      <path
        d="M12 18 C12 6, 40 6, 40 18"
        stroke="#D4940A"
        strokeWidth="2"
        opacity="0.6"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M14 44 L26 14 L38 44"
        stroke="#CC6B2E"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <line
        x1="19"
        y1="34"
        x2="33"
        y2="34"
        stroke="#CC6B2E"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.7"
      />
      <circle cx="26" cy="14" r="2.5" fill="#D4940A" />
    </svg>
  )
}
