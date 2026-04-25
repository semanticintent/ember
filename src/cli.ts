import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from './parser.js'

export function run(): void {
  const [,, command, ...args] = process.argv

  if (!command || command === '--help' || command === '-h') {
    console.log(`
ember — EMBER Semantic Intent Language CLI

Usage:
  ember parse <file.sil>          Parse a .sil file and print as JSON
  ember parse <file.sil> --raw    Print the raw parsed fields only

Examples:
  ember parse specs/cart.checkout.sil
  ember parse signals/auth.sil --raw
`.trim())
    process.exit(0)
  }

  if (command === 'parse') {
    const filePath = args[0]
    const rawFlag = args.includes('--raw')

    if (!filePath) {
      console.error('Error: file path required')
      console.error('Usage: ember parse <file.sil>')
      process.exit(1)
    }

    let raw: string
    try {
      raw = readFileSync(resolve(filePath), 'utf-8')
    } catch {
      console.error(`Error: cannot read file: ${filePath}`)
      process.exit(1)
    }

    let construct
    try {
      construct = parse(raw)
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`)
      process.exit(1)
    }

    if (rawFlag) {
      console.log(JSON.stringify(construct.fields, null, 2))
    } else {
      console.log(JSON.stringify({
        construct: construct.construct,
        id: construct.id,
        version: construct.version,
        fields: construct.fields,
      }, null, 2))
    }
    return
  }

  console.error(`Unknown command: ${command}`)
  console.error('Run ember --help for usage.')
  process.exit(1)
}
