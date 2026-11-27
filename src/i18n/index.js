import { localizeDigits } from '../lib/format.js'
import common from './messages.js'
import follow from './messagesFollow.js'
import money from './messagesMoney.js'
import news from './messagesNews.js'
import projects from './messagesProjects.js'
import system from './messagesSystem.js'

export const bundles = [common, projects, money, system, news, follow]
export const messages = Object.assign({}, ...bundles)

export function translate(locale, key, vars) {
  const pair = messages[key]
  if (!pair) return key
  const text = pair[locale === 'en' ? 1 : 0]
  if (!vars) return text
  return text.replace(/\{(\w+)\}/g, (match, name) => {
    if (!(name in vars)) return match
    const v = vars[name]
    return typeof v === 'number' ? localizeDigits(v, locale) : v
  })
}
