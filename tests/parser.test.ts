import { describe, it, expect } from 'vitest'
import { join } from 'node:path'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { parse, read, write, readDir, getConfidence } from '../src/parser.js'

const FIXTURES = join(import.meta.dirname, 'fixtures')

describe('parse — header', () => {
  it('parses construct type, id, and version', () => {
    const result = read(join(FIXTURES, 'cart.checkout.signal.sil'))
    expect(result.construct).toBe('signal')
    expect(result.id).toBe('cart.checkout')
    expect(result.version).toBe(1)
  })

  it('throws on missing separator', () => {
    expect(() =>
      parse('CONSTRUCT  signal\nID  test\nVERSION  1\nno separator here\n')
    ).toThrow('separator line not found')
  })

  it('throws on missing CONSTRUCT', () => {
    expect(() =>
      parse('\nID  test\nVERSION  1\n─────────────────────────────────────────\n')
    ).toThrow()
  })
})

describe('parse — simple fields', () => {
  it('reads inline key-value fields', () => {
    const result = read(join(FIXTURES, 'cart.checkout.signal.sil'))
    expect(result.fields['type']).toBe('workflow')
    expect(result.fields['entry']).toBe('POST /cart/submit')
    expect(result.fields['source']).toBe('route table, API docs')
  })
})

describe('parse — multi-line fields', () => {
  it('reads multi-line prose as a joined string', () => {
    const result = read(join(FIXTURES, 'cart.checkout.spec.sil'))
    const intent = result.fields['intent'] as string
    expect(intent).toContain('Allow a customer')
    expect(intent).toContain('order confirmation')
  })

  it('reads uniform list fields as string arrays', () => {
    const result = read(join(FIXTURES, 'cart.checkout.spec.sil'))
    const rules = result.fields['rules'] as string[]
    expect(Array.isArray(rules)).toBe(true)
    expect(rules).toHaveLength(4)
    expect(rules[0]).toBe('Promo applied before total calculated')
    expect(rules[3]).toBe('Guest checkout allowed — login not required')
  })

  it('reads gaps as string array', () => {
    const result = read(join(FIXTURES, 'cart.checkout.spec.sil'))
    const gaps = result.fields['gaps'] as string[]
    expect(Array.isArray(gaps)).toBe(true)
    expect(gaps[0]).toContain('Partial refund logic not found')
  })

  it('handles an empty multi-line field', () => {
    const raw = [
      'CONSTRUCT  spec',
      'ID         test.empty',
      'VERSION    1',
      '─────────────────────────────────────────',
      'intent:',
      'rules:',
      '  - one rule',
    ].join('\n')
    const result = parse(raw)
    expect(result.fields['intent']).toBe('')
    expect(result.fields['rules']).toEqual(['one rule'])
  })
})

describe('parse — episode construct', () => {
  it('parses episode header and fields', () => {
    const result = read(join(FIXTURES, 'ep-042.sil'))
    expect(result.construct).toBe('episode')
    expect(result.id).toBe('ep-042')
    expect(result.fields['status']).toBe('open')
    expect(result.fields['trigger']).toBe('client requirement change')
  })

  it('preserves raw source', () => {
    const result = read(join(FIXTURES, 'ep-042.sil'))
    expect(result.raw).toContain('CONSTRUCT  episode')
    expect(result.raw).toContain('ep-042')
  })
})

describe('parse — screen construct (non-field lines)', () => {
  it('does not throw on ASCII art lines', () => {
    const raw = [
      'CONSTRUCT  screen',
      'ID         cart.checkout',
      'VERSION    1',
      '─────────────────────────────────────────',
      'SCREEN 1 — Cart',
      '┌─────────────────────────────────────┐',
      '│  Your Cart                          │',
      '└─────────────────────────────────────┘',
      'on: "Checkout →" → SCREEN 2',
    ].join('\n')
    const result = parse(raw)
    expect(result.construct).toBe('screen')
    expect(result.id).toBe('cart.checkout')
  })
})

describe('getConfidence', () => {
  it('returns high confidence', () => {
    const result = read(join(FIXTURES, 'cart.checkout.signal.sil'))
    expect(getConfidence(result)).toBe('high')
  })

  it('returns null when absent', () => {
    const result = read(join(FIXTURES, 'cart.checkout.spec.sil'))
    expect(getConfidence(result)).toBeNull()
  })

  it('returns medium and low', () => {
    const medium = parse('CONSTRUCT  signal\nID  x\nVERSION  1\n─────────────────────────────────────────\nconfidence: medium\n')
    expect(getConfidence(medium)).toBe('medium')
    const low = parse('CONSTRUCT  signal\nID  x\nVERSION  1\n─────────────────────────────────────────\nconfidence: low\n')
    expect(getConfidence(low)).toBe('low')
  })
})

describe('write + read roundtrip', () => {
  it('writes a construct and reads it back identically', () => {
    const dir = join(tmpdir(), `ember-write-test-${Date.now()}`)
    mkdirSync(dir, { recursive: true })
    const filePath = join(dir, 'test.sil')

    const original = read(join(FIXTURES, 'cart.checkout.spec.sil'))
    write(filePath, original)
    const roundtripped = read(filePath)

    expect(roundtripped.construct).toBe(original.construct)
    expect(roundtripped.id).toBe(original.id)
    expect(roundtripped.version).toBe(original.version)
    expect(roundtripped.fields['intent']).toBe(original.fields['intent'])
    expect(roundtripped.fields['rules']).toEqual(original.fields['rules'])

    rmSync(dir, { recursive: true })
  })
})

describe('readDir', () => {
  it('reads all .sil files from a directory', () => {
    const results = readDir(FIXTURES)
    expect(results.length).toBe(3)
    const ids = results.map((r) => r.id)
    expect(ids).toContain('cart.checkout')
    expect(ids).toContain('ep-042')
  })
})
