// تازه‌های هر نسخه، جدیدترین اول. با هر به‌روزرسانی یه مورد این‌جا اضافه کن؛
// تست، نسخه‌ی package.json رو با اولین مورد می‌سنجه. توضیحش: docs/releases.md
export const RELEASES = [
  { id: 3, version: '0.3.0', date: '2026-11-26', items: ['news.v3.due', 'news.v3.colors', 'news.v3.mobile', 'news.v3.news'] },
  { id: 2, version: '0.2.0', date: '2026-11-26', items: ['news.v2.undo', 'news.v2.quick', 'news.v2.lists', 'news.v2.back'] },
  { id: 1, version: '0.1.0', date: '2026-11-25', items: ['news.v1.first'] },
]
export const LATEST_RELEASE = RELEASES[0].id
