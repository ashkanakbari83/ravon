import { lazy, Suspense, useEffect } from 'react'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import Layout from './components/Layout.jsx'
import { useApp } from './context/AppContext.jsx'
import { useRoute } from './hooks/useRoute.js'
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
  const { db, t, closeSheet, storageError } = useApp()
  const route = useRoute()
  const Page = PAGES[route.name] || NotFound
  const pageKey = `${route.name}/${route.id || ''}`

  // با عوض‌شدن صفحه: برگه بسته می‌شه و اسکرول برمی‌گرده بالا
  useEffect(() => {
    closeSheet()
    window.scrollTo(0, 0)
  }, [pageKey])

  // اگه ذخیره‌ی قبلی خونده نشده، خوش‌آمد نشون نمی‌دیم تا هشدارش دیده بشه
  if (!db.meta.onboarded && !db.projects.length && !storageError) return <Welcome />
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
