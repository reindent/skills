// boards — Express route. Serves a board file's raw markdown to the admin,
// gated two ways:
//   • devOnly        — 404 in production BEFORE any auth; never serves board
//                      data outside local dev. (If you want the route to be
//                      *indistinguishable* from one that doesn't exist, return
//                      your app's own 404 here — e.g. `return next('route')` to
//                      fall through to a catch-all — instead of a custom body.)
//   • requireSession — YOUR existing admin/session gate (bring your own).
// The board *.md files are never bundled into your deploy (see SKILL.md step 6).
import type { Request, Response, NextFunction } from 'express'
import { readFile, stat } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// Resolve board paths relative to this file, working in both ESM dev and a
// bundled-CJS runtime.
const moduleDir = typeof __dirname !== 'undefined'
  ? __dirname
  : dirname(fileURLToPath(import.meta.url))

// Adjust '..' so it points at the repo root where the board files live.
const boardPath = (name: string): string => join(moduleDir, '..', `${name}.md`)

export const devOnly = (_req: Request, res: Response, next: NextFunction): void => {
  if (process.env.NODE_ENV === 'production') {
    res.status(404).json({ ok: false, error: 'not found' })
    return
  }
  next()
}

export const serveBoard = (name: string) => async (_req: Request, res: Response): Promise<void> => {
  try {
    const path = boardPath(name)
    const [markdown, info] = await Promise.all([readFile(path, 'utf8'), stat(path)])
    res.json({ ok: true, markdown, updatedAt: info.mtime.toISOString() })
  } catch (err) {
    console.error('[boards] failed to read board file:', (err as Error)?.message || err)
    res.status(503).json({ ok: false, error: 'board unavailable' })
  }
}

// Wire it up (requireSession is YOUR existing admin gate):
//
//   app.get('/api/boards/project',   devOnly, requireSession, serveBoard('PROJECT'))
//   app.get('/api/boards/marketing', devOnly, requireSession, serveBoard('MARKETING'))
