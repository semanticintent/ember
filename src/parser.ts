import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join, extname } from 'node:path'
import type { ConstructType, EmberConstruct } from './types.js'

// The separator is Unicode box-drawing dashes (─, U+2500), not ASCII hyphens
const SEPARATOR_RE = /^─+$/u
const FIELD_RE = /^([a-z][\w-]*):\s*(.*)$/

// ─────────────────────────────────────────
// Parsing
// ─────────────────────────────────────────

function parseHeader(
  lines: string[]
): { construct: ConstructType; id: string; version: number; bodyStart: number } {
  const sepIdx = lines.findIndex((l) => SEPARATOR_RE.test(l.trim()))
  if (sepIdx < 3) throw new Error('Invalid .sil file: separator line not found')

  const construct = lines[0].replace(/^CONSTRUCT\s+/, '').trim() as ConstructType
  const id = lines[1].replace(/^ID\s+/, '').trim()
  const version = parseInt(lines[2].replace(/^VERSION\s+/, '').trim(), 10)

  if (!construct) throw new Error('Invalid .sil file: missing CONSTRUCT')
  if (!id) throw new Error('Invalid .sil file: missing ID')
  if (isNaN(version)) throw new Error('Invalid .sil file: missing VERSION')

  return { construct, id, version, bodyStart: sepIdx + 1 }
}

function parseBody(bodyLines: string[]): Record<string, string | string[]> {
  const fields: Record<string, string | string[]> = {}
  let i = 0

  while (i < bodyLines.length) {
    const line = bodyLines[i]

    if (!line.trim() || line.trimStart().startsWith('#')) {
      i++
      continue
    }

    const fieldMatch = line.match(FIELD_RE)
    if (fieldMatch && !line.startsWith(' ') && !line.startsWith('\t')) {
      const key = fieldMatch[1]
      const inlineValue = fieldMatch[2].trim()

      if (inlineValue) {
        fields[key] = inlineValue
        i++
      } else {
        i++
        const valueLines: string[] = []
        while (
          i < bodyLines.length &&
          (bodyLines[i].startsWith('  ') ||
            bodyLines[i].startsWith('\t') ||
            !bodyLines[i].trim())
        ) {
          if (bodyLines[i].trim()) valueLines.push(bodyLines[i])
          i++
        }

        if (valueLines.length === 0) {
          fields[key] = ''
        } else if (valueLines.every((l) => l.trimStart().startsWith('- '))) {
          fields[key] = valueLines.map((l) => l.trimStart().replace(/^-\s+/, ''))
        } else {
          fields[key] = valueLines.map((l) => l.trim()).join('\n')
        }
      }
    } else {
      i++
    }
  }

  return fields
}

// ─────────────────────────────────────────
// Serialization
// ─────────────────────────────────────────

const SEPARATOR = '─'.repeat(41)

function serializeFields(fields: Record<string, string | string[]>): string {
  const lines: string[] = []
  for (const [key, value] of Object.entries(fields)) {
    if (Array.isArray(value)) {
      lines.push(`${key}:`)
      for (const item of value) lines.push(`  - ${item}`)
    } else if (value.includes('\n')) {
      lines.push(`${key}:`)
      for (const l of value.split('\n')) lines.push(`  ${l}`)
    } else {
      lines.push(`${key}: ${value}`)
    }
  }
  return lines.join('\n')
}

// ─────────────────────────────────────────
// Public API
// ─────────────────────────────────────────

export function parse(raw: string): EmberConstruct {
  const lines = raw.split('\n')
  const { construct, id, version, bodyStart } = parseHeader(lines)
  const fields = parseBody(lines.slice(bodyStart))
  return { construct, id, version, fields, raw }
}

export function read(filePath: string): EmberConstruct {
  return parse(readFileSync(filePath, 'utf-8'))
}

export function write(filePath: string, construct: EmberConstruct): void {
  const header = [
    `CONSTRUCT  ${construct.construct}`,
    `ID         ${construct.id}`,
    `VERSION    ${construct.version}`,
    SEPARATOR,
  ].join('\n')
  const body = serializeFields(construct.fields)
  writeFileSync(filePath, `${header}\n${body}\n`, 'utf-8')
}

export function readDir(dirPath: string): EmberConstruct[] {
  return readdirSync(dirPath)
    .filter((f) => extname(f) === '.sil')
    .map((f) => read(join(dirPath, f)))
}

export function getConfidence(
  construct: EmberConstruct
): 'high' | 'medium' | 'low' | null {
  const val = construct.fields['confidence']
  if (val === 'high' || val === 'medium' || val === 'low') return val
  return null
}
