import chalk from 'chalk'

/**
 * Warm Stone color palette for CLI branding
 */
export const palette = {
  banner: '#d6d3d1',
  tagline: '#a8a29e',
  dim: '#57534e',
  bg: '#1c1917',
  accent: '#e7e5e4',
} as const

/**
 * Chalk colors using the Warm Stone palette
 */
export const colors = {
  banner: chalk.hex(palette.banner),
  tagline: chalk.hex(palette.tagline),
  dim: chalk.hex(palette.dim),
  accent: chalk.hex(palette.accent),
  // Semantic aliases
  primary: chalk.hex(palette.accent),
  secondary: chalk.hex(palette.tagline),
  muted: chalk.hex(palette.dim),
  success: chalk.hex('#86efac'), // Green for success states
  error: chalk.hex('#fca5a5'),   // Red for error states
  warning: chalk.hex('#fcd34d'), // Yellow for warnings
  info: chalk.hex('#93c5fd'),    // Blue for info
} as const

/**
 * ASCII art banner using ANSI Shadow figlet font
 */
export const banner = `
██████╗  █████╗ ████████╗ ██████╗ ███╗   ██╗
██╔══██╗██╔══██╗╚══██╔══╝██╔═══██╗████╗  ██║
██████╔╝███████║   ██║   ██║   ██║██╔██╗ ██║
██╔══██╗██╔══██║   ██║   ██║   ██║██║╚██╗██║
██████╔╝██║  ██║   ██║   ╚██████╔╝██║ ╚████║
╚═════╝ ╚═╝  ╚═╝   ╚═╝    ╚═════╝ ╚═╝  ╚═══╝
`.trim()

/**
 * Tagline displayed below the banner
 */
export const tagline = 'Tempo Blockchain · CLI & MCP Server'

/**
 * Get the formatted banner with colors
 */
export function getBanner(): string {
  return [
    '',
    colors.banner(banner),
    '',
    colors.tagline(tagline),
    '',
  ].join('\n')
}

/**
 * Get a compact version of the banner (just the name)
 */
export function getCompactBanner(): string {
  return colors.banner.bold('baton') + ' ' + colors.dim('·') + ' ' + colors.tagline(tagline)
}

/**
 * Format a section header with branding
 */
export function formatBrandedHeader(title: string): string {
  return colors.accent.bold(title)
}

/**
 * Format a key-value pair with branding
 */
export function formatBrandedKeyValue(key: string, value: string | number | boolean): string {
  return `${colors.dim(key + ':')} ${colors.accent(String(value))}`
}

/**
 * Format a success message with branding
 */
export function formatBrandedSuccess(message: string): string {
  return colors.success(`✓ ${message}`)
}

/**
 * Format an error message with branding
 */
export function formatBrandedError(message: string): string {
  return colors.error(`✗ ${message}`)
}

/**
 * Format a warning message with branding
 */
export function formatBrandedWarning(message: string): string {
  return colors.warning(`⚠ ${message}`)
}

/**
 * Format an info message with branding
 */
export function formatBrandedInfo(message: string): string {
  return colors.info(`ℹ ${message}`)
}
