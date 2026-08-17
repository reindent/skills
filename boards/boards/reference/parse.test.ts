import { describe, it, expect } from 'vitest'
import { parseBoardMarkdown, progress } from './parse'

const md = `
# Project board

Intro prose that the parser ignores.

## P0 — now

The section note.

- [ ] **T-01 · Ship the thing** — do it well,
      across two lines
- [~] **T-02 · In progress** — being worked on
- [x] **T-03 · Done already** — shipped 2026-01-01

## Done

- [x] **T-00 · Older win** — shipped 2025-12-31
`

describe('parseBoardMarkdown', () => {
  const secs = parseBoardMarkdown(md)

  it('splits sections and ignores file-level intro', () => {
    expect(secs.map((s) => s.title)).toEqual(['P0 — now', 'Done'])
  })

  it('captures the section note', () => {
    expect(secs[0].note).toBe('The section note.')
  })

  it('parses ids, titles, statuses, and wrapped bodies', () => {
    const [a, b, c] = secs[0].items
    expect(a).toMatchObject({ id: 'T-01', title: 'Ship the thing', status: 'todo' })
    expect(a.body).toBe('do it well, across two lines')
    expect(b.status).toBe('doing')
    expect(c.status).toBe('done')
  })

  it('counts progress across all sections', () => {
    expect(progress(secs)).toEqual({ done: 2, total: 4 })
  })

  it('renders hostile content as inert text (the UI never interprets it as HTML)', () => {
    const [x] = parseBoardMarkdown('## S\n- [ ] **X** — <img src=x onerror=alert(1)>')[0].items
    expect(x.body).toBe('<img src=x onerror=alert(1)>') // stored as text; rendered as a text node
  })
})
