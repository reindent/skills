// boards — the parser. ~70 lines, zero dependencies, no markdown library.
//
// A "board" is a plain markdown file that is the single source of truth for a
// stream of work. This turns it into sections + items your UI can render. The
// contract is deliberately narrow, so line-by-line regex covers it — and
// because everything downstream renders as text (never dangerouslySetInnerHTML),
// a hostile board file is inert: no markdown-library supply chain, no XSS.
//
// Format:
//   ## <Section title>
//   Optional prose before the first item becomes the section's note.
//   - [ ] **T-01 · Item title** — body, wrapped onto
//         indented continuation lines (joined with spaces)
//   - [~] **T-02 · In progress** — the [~] glyph means "doing"
//   - [x] **T-03 · Done** — shipped 2026-06-10 (abc1234)
// File-level intro prose (before the first ##) is ignored. The leading ticket
// id (T-xx / M-xx) is optional and stable — never renumbered.

export type Status = 'todo' | 'doing' | 'done'
export interface BoardItem { id: string; title: string; body: string; status: Status }
export interface BoardSection { title: string; note: string; items: BoardItem[] }

const HEADING = /^##\s+(.+)$/
const ITEM = /^- \[( |x|X|~)\]\s+(.*)$/
const BOLD_TITLE = /^\*\*(.+?)\*\*\s*(?:—|–|-)?\s*(.*)$/
const TICKET_ID = /^([A-Z]{1,3}-\d{1,4})\s*·\s*/

const STATUS: Record<string, Status> = { ' ': 'todo', '~': 'doing', x: 'done', X: 'done' }

function splitTitle(text: string): { id: string; title: string; body: string } {
  const m = BOLD_TITLE.exec(text)
  const { title, body } = m ? { title: m[1], body: m[2] } : { title: text, body: '' }
  const idm = TICKET_ID.exec(title)
  return idm ? { id: idm[1], title: title.slice(idm[0].length), body } : { id: '', title, body }
}

export function parseBoardMarkdown(md: string): BoardSection[] {
  const sections: BoardSection[] = []
  let section: BoardSection | null = null
  let item: BoardItem | null = null

  for (const raw of md.split('\n')) {
    const line = raw.trimEnd()

    const h = HEADING.exec(line)
    if (h) {
      section = { title: h[1].trim(), note: '', items: [] }
      sections.push(section)
      item = null
      continue
    }

    const it = ITEM.exec(line)
    if (it && section) {
      item = { status: STATUS[it[1]] ?? 'todo', ...splitTitle(it[2].trim()) }
      section.items.push(item)
      continue
    }

    // indented continuation lines extend the current item's body
    if (item && /^\s+\S/.test(raw)) {
      const extra = line.trim()
      item.body = item.body ? `${item.body} ${extra}` : extra
      continue
    }

    item = null // prose / blank line ends the item
    // prose before a section's first item becomes the section note
    if (section && section.items.length === 0 && line.trim() && !line.startsWith('#')) {
      const extra = line.trim()
      section.note = section.note ? `${section.note} ${extra}` : extra
    }
  }

  return sections.filter((s) => s.items.length > 0 || s.note)
}

export function progress(sections: BoardSection[]): { done: number; total: number } {
  const all = sections.flatMap((s) => s.items)
  return { done: all.filter((i) => i.status === 'done').length, total: all.length }
}

// Visual accent per section, keyed on the leading token ("P0 — …", "Done").
export function sectionKey(title: string): 'p0' | 'p1' | 'p2' | 'backlog' | 'done' | 'other' {
  const t = title.toLowerCase()
  if (t.startsWith('p0')) return 'p0'
  if (t.startsWith('p1')) return 'p1'
  if (t.startsWith('p2')) return 'p2'
  if (t.startsWith('backlog')) return 'backlog'
  if (t.startsWith('done')) return 'done'
  return 'other'
}
