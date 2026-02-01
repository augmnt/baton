#!/usr/bin/env node
import { config } from 'dotenv'
import { createCli } from '../src/cli/index.js'

// Load environment variables
config()

// Create and run CLI
const program = createCli()
program.parse()
