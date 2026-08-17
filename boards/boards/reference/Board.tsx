import { useCallback, useEffect, useState } from 'react'
import { parseBoardMarkdown, progress, sectionKey, type BoardSection } from './parse'

// Zip-packaged assets can carry normalized (epoch-ish) mtimes — treat anything
// implausibly old as "no date" rather than showing 1980.
const fmtDate = (iso: string): string => {
  try {
    const d = new Date(iso)
    if (!iso || isNaN(d.getTime())) return '' // empty / unparseable → no date
    if (d.getFullYear() < 2020) return ''
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  } catch { return '' }
}

const tick = (s: string) => (s === 'done' ? '✓' : s === 'doing' ? '◐' : '')

function SectionCard({ section }: { section: BoardSection }) {
  const kind = sectionKey(section.title)
  const done = section.items.filter((i) => i.status === 'done').length
  const hasItems = section.items.length > 0
  return (
    <div className={`board-section board-sec-${kind}`}>
      <div className="board-section-head">
        <h2>{section.title}</h2>
        {hasItems ? <span className="board-count">{done}/{section.items.length}</span> : null}
      </div>
      {section.note ? <p className="board-note">{section.note}</p> : null}
      {hasItems ? (
        <>
          <div className="board-bar">
            <div className="board-bar-fill" style={{ width: `${(done / section.items.length) * 100}%` }} />
          </div>
          <ul className="board-items">
            {section.items.map((item, i) => (
              <li key={i} className={`is-${item.status}`}>
                <span className="board-tick" aria-hidden="true">{tick(item.status)}</span>
                <div>
                  <div className="board-item-title">
                    {item.id ? <span className="board-id">{item.id}</span> : null}
                    {item.title}
                  </div>
                  {item.body ? <div className="board-item-body">{item.body}</div> : null}
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  )
}

// A read-only board view: renders a repo markdown file (PROJECT.md, MARKETING.md
// — the single sources of truth). Read-only by design: edits happen in commits,
// not here. `endpoint` is your dev-only, auth-gated API route.
export function Board({ title, file, endpoint, onAuthLost }: {
  title: string
  file: string
  endpoint: string
  onAuthLost?: () => void
}) {
  const [state, setState] = useState<'loading' | 'error' | 'ok'>('loading')
  const [sections, setSections] = useState<BoardSection[]>([])
  const [updatedAt, setUpdatedAt] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch(endpoint, { headers: { Accept: 'application/json' } })
      if (res.status === 401) { onAuthLost?.(); return }
      if (!res.ok) { setState('error'); return }
      const data = await res.json()
      setSections(parseBoardMarkdown(data.markdown || ''))
      setUpdatedAt(data.updatedAt || '')
      setState('ok')
    } catch {
      setState('error')
    }
  }, [endpoint, onAuthLost])

  useEffect(() => { load() }, [load])
  const refresh = async () => { setRefreshing(true); try { await load() } finally { setRefreshing(false) } }

  const { done, total } = progress(sections)

  return (
    <section className="board">
      <header className="board-head">
        <div>
          <h1>{title}</h1>
          <div className="board-meta">
            {state === 'ok'
              ? <>{done} of {total} done · {file}{fmtDate(updatedAt) ? <> · updated {fmtDate(updatedAt)}</> : null}</>
              : `the live ${file}, rendered`}
          </div>
        </div>
        <button onClick={refresh} disabled={refreshing}>
          {refreshing ? 'Loading…' : '↻ Refresh'}
        </button>
      </header>

      {state === 'loading' && <div className="board-empty">Loading the board…</div>}
      {state === 'error' && <div className="board-empty">Couldn’t load {file} — try a refresh.</div>}
      {state === 'ok' && (
        sections.length === 0
          ? <div className="board-empty">{file} has no items yet.</div>
          : <div className="board-grid">{sections.map((s) => <SectionCard key={s.title} section={s} />)}</div>
      )}
    </section>
  )
}
