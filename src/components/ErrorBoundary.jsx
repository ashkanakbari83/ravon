import { Component } from 'react'
import { translate } from '../i18n/index.js'

export default class ErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (!this.state.failed) return this.props.children
    const t = (key) => translate(document.documentElement.lang || 'fa', key)
    return (
      <div className="empty" role="alert">
        <h2>{t('crash.title')}</h2>
        <p>{t('crash.text')}</p>
        <button type="button" className="btn btn--primary" onClick={() => window.location.reload()}>{t('crash.reload')}</button>
      </div>
    )
  }
}
