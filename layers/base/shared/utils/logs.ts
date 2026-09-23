export const logTypes = [
  { value: 'info', label: 'Info', color: 'primary-text' },
  { value: 'warn', label: 'Warn', color: 'warning-text' },
  { value: 'error', label: 'Error', color: 'danger-text' },
  { value: 'debug', label: 'Debug', color: 'muted-text' },
  { value: 'security', label: 'Security', color: 'secondary-text' },
] as const

export const logTypeValues = logTypes.map((logType) => logType.value)
