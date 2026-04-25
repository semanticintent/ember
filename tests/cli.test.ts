import { describe, it, expect } from 'vitest'
import { execSync } from 'node:child_process'
import { join, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const CLI = `node ${join(ROOT, 'dist/cli.js')} run`
const FIXTURE = join(ROOT, 'tests/fixtures/cart.checkout.signal.sil')

function run(args: string): { stdout: string; stderr: string; code: number } {
  try {
    const stdout = execSync(`node -e "import('${join(ROOT, 'dist/cli.js')}').then(m => m.run())" -- ${args}`, {
      encoding: 'utf-8',
    })
    return { stdout, stderr: '', code: 0 }
  } catch (err: any) {
    return { stdout: err.stdout ?? '', stderr: err.stderr ?? '', code: err.status ?? 1 }
  }
}

function ember(args: string): { stdout: string; stderr: string; code: number } {
  try {
    const stdout = execSync(`node ${join(ROOT, 'bin/ember.js')} ${args}`, {
      encoding: 'utf-8',
      env: { ...process.env },
    })
    return { stdout, stderr: '', code: 0 }
  } catch (err: any) {
    return { stdout: err.stdout ?? '', stderr: err.stderr ?? '', code: err.status ?? 1 }
  }
}

describe('ember CLI', () => {
  it('prints help with no args', () => {
    const result = ember('--help')
    expect(result.code).toBe(0)
    expect(result.stdout).toContain('ember parse')
    expect(result.stdout).toContain('.sil')
  })

  it('parses a .sil file and returns JSON', () => {
    const result = ember(`parse ${FIXTURE}`)
    expect(result.code).toBe(0)
    const json = JSON.parse(result.stdout)
    expect(json.construct).toBe('signal')
    expect(json.id).toBe('cart.checkout')
    expect(json.version).toBe(1)
    expect(json.fields).toBeDefined()
  })

  it('--raw flag returns only fields', () => {
    const result = ember(`parse ${FIXTURE} --raw`)
    expect(result.code).toBe(0)
    const json = JSON.parse(result.stdout)
    expect(json.construct).toBeUndefined()
    expect(json.type).toBeDefined()
  })

  it('fails on missing file', () => {
    const result = ember('parse /nonexistent/file.sil')
    expect(result.code).toBe(1)
    expect(result.stderr + result.stdout).toContain('cannot read file')
  })

  it('fails on unknown command', () => {
    const result = ember('frobnicate')
    expect(result.code).toBe(1)
    expect(result.stderr + result.stdout).toContain('Unknown command')
  })
})
