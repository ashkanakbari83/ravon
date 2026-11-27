import { lazy, Suspense, useCallback, useEffect } from 'react'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import Layout from './components/Layout.jsx'
import { useApp } from './context/AppContext.jsx'
import { LATEST_RELEASE } from './data/releases.js'
import { usePersistentStorage } from './hooks/usePersistentStorage.js'
import { replaceRoute, scrollTarget, useRoute } from './hooks/useRoute.js'
import { useShortcuts } from './hooks/useShortcuts.js'
import Sheets from './modals/Sheets.jsx'
import Dashboard from './pages/Dashboard.jsx'
import NotFound from './pages/NotFound.jsx'
import Welcome from './pages/Welcome.jsx'

const PAGES = {
  home: Dashboard,
  projects: lazy(() => import('./pages/Projects.jsx')),
  project: lazy(() => import('./pages/ProjectDetail.jsx')),
  clients: lazy(() => import('./pages/Clients.jsx')),
  client: lazy(() => import('./pages/ClientDetail.jsx')),
  reports: lazy(() => import('./pages/Reports.jsx')),
  settings: lazy(() => import('./pages/Settings.jsx')),
}

export default function App() {
  const { db, t, openSheet, closeSheet, storageError } = useApp()
  const address = useRoute()
  // میان‌بُرِ آیکن برنامه (#/new): همون خانه، با فرم ثبتِ باز
  const shortcut = address.name === 'new'
  const route = shortcut ? { ...address, name: 'home' } : address
  const Page = PAGES[route.name] || NotFound
  const pageKey = `${route.name}/${route.id || ''}`

  // با عوض‌شدن صفحه برگه بسته می‌شه؛ صفحه‌ی تازه از بالا شروع می‌شه و «برگشت» از همون‌جای قبلی
  useEffect(() => {
    closeSheet()
    window.scrollTo(0, scrollTarget())
  }, [pageKey])

  // اگه ذخیره‌ی قبلی خونده نشده، خوش‌آمد نشون نمی‌دیم تا هشدارش دیده بشه
  const welcome = !db.meta.onboarded && !db.projects.length && !storageError
  const quickAdd = useCallback(() => openSheet('quickAdd'), [openSheet])
  useShortcuts({ enabled: !welcome, onNew: quickAdd })

  // بعد از به‌روزرسانی، یک بار موقع باز شدن (باید بعد از افکتِ بستنِ برگه بمونه)
  useEffect(() => {
    if (!welcome && !storageError && db.meta.seenRelease < LATEST_RELEASE) openSheet('whatsNew')
  }, [])

  // بعد از دو افکتِ بالا، تا «ثبت» جای «تازه‌ها» رو بگیره (تازه‌ها دفعه‌ی بعد میاد)
  useEffect(() => {
    if (!shortcut || welcome) return
    replaceRoute('')
    openSheet('quickAdd')
  }, [shortcut, welcome])

  usePersistentStorage(db.projects.some((p) => !p.demo))

  if (welcome) return <Welcome />
  return (
    <>
      <Layout route={route}>
        <ErrorBoundary key={pageKey}>
          <Suspense fallback={<div className="loading" role="status"><span className="loading__bar" />{t('common.loading')}</div>}>
            <Page id={route.id} query={route.query} />
          </Suspense>
        </ErrorBoundary>
      </Layout>
      <Sheets />
    </>
  )
}
