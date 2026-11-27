const PATHS = {
  home: 'M4 11.5 12 5l8 6.5M6 10v9h12v-9M10 19v-5h4v5',
  projects: 'M4 6h16M4 12h11M4 18h14',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  clients: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 9c0-3.3 2.7-6 6-6s6 2.700 6 6M16 4.5a3.500 3.500 0 0 1 0 6.600M17 14.500c2.400.700 4 2.800 4 5.500',
  reports: 'M5 20V11M12 20V4M19 20v-6',
  settings: 'M4 7h10M18 7h2M4 17h2M10 17h10M16 4.500v5M8 14.500v5',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5-2 4 4',
  back: 'm9 5 7 7-7 7',
  chevron: 'm6 9 6 6 6-6',
  prev: 'm9 5 7 7-7 7',
  next: 'm15 5-7 7 7 7',
  close: 'M6 6l12 12M18 6 6 18',
  check: 'm5 12.500 4.500 4.500L19 7.500',
  trash: 'M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12',
  copy: 'M9 9h10v10H9zM5 15V5h10',
  archive: 'M4 5h16v4H4zM6 9v10h12V9M10 13h4',
  play: 'M8 5.500v13l11-6.500z',
  stop: 'M7 7h10v10H7z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-14v5l3.500 2',
  download: 'M12 4v11m-5-4.500 5 5 5-5M5 20h14',
  upload: 'M12 16V5m-5 4.500 5-5 5 5M5 20h14',
  edit: 'M5 19h3.500L19 8.500 15.500 5 5 15.500zM13.500 7l3.500 3.500',
  calendar: 'M5 6h14v14H5zM5 10h14M9 4v4M15 4v4',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 2.500v2M12 19.500v2M2.500 12h2M19.500 12h2M5.300 5.300l1.400 1.400M17.300 17.300l1.400 1.400M18.700 5.300l-1.400 1.400M6.700 17.300l-1.400 1.400',
  moon: 'M20 14.500A8 8 0 0 1 9.500 4a8 8 0 1 0 10.500 10.500Z',
  wallet: 'M4 7h14v3M4 7v12h16v-9H6a2 2 0 0 1-2-3ZM16 14.500h.500',
}

// فلش‌ها برای RTL کشیده شدن و در LTR آینه می‌شن
const DIRECTIONAL = new Set(['back', 'prev', 'next'])

export default function Icon({ name, size = 20 }) {
  return (
    <svg className={DIRECTIONAL.has(name) ? 'icon icon--dir' : 'icon'} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={PATHS[name]} />
    </svg>
  )
}
