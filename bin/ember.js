#!/usr/bin/env node
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { run } = await import('../dist/cli.js')
run()
