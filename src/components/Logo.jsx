/** سه ترک تدوین و یک پلی‌هد */
export default function Logo({ size = 32 }) {
  return (
    <svg className="logo" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect className="logo__bg" width="32" height="32" rx="9" />
      <path className="logo__tracks" d="M16 10h9M9 16h13M13 22h12" />
      <path className="logo__head" d="M19 6v20" />
    </svg>
  )
}
