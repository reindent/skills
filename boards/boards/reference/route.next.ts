// boards — Next.js App Router route: app/api/boards/[board]/route.ts
// Dev-only + admin-gated: in production it returns 404 and never serves board
// data. (This custom JSON 404 is fine, but note a dynamic [board] route answers
// every /api/boards/* path — so if you want the route to be indistinguishable
// from an unknown path, `notFound()` from next/navigation renders your app's
// real 404 instead.) The board *.md files are never traced into the standalone
// build.
import { NextResponse } from 'next/server'
import { readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'

// Whitelist of board keys → filenames at the repo root.
const BOARDS: Record<string, string> = {
  project: 'PROJECT.md',
  marketing: 'MARKETING.md',
}

const notFound = () => NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 })

export async function GET(_req: Request, { params }: { params: Promise<{ board: string }> }) {
  // Dev-only: in production these boards simply don't exist.
  if (process.env.NODE_ENV === 'production') return notFound()

  const { board } = await params

  // Bring your own admin auth, e.g.:
  //   const session = await auth()
  //   if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  //   if (!canAccessAdmin(session)) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })

  const file = BOARDS[board]
  if (!file) return notFound() // unknown key → same 404 as production

  try {
    const path = join(process.cwd(), file)
    const [markdown, info] = await Promise.all([readFile(path, 'utf8'), stat(path)])
    return NextResponse.json({ ok: true, board, markdown, updatedAt: info.mtime.toISOString() })
  } catch {
    return NextResponse.json({ ok: false, error: 'board unavailable' }, { status: 503 })
  }
}
