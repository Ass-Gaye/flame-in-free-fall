export class ApiError extends Error {
  readonly statusCode: number
  readonly code: string
  readonly details?: unknown

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }
}

export class DatasetValidationError extends Error {
  readonly issues: string[]

  constructor(issues: string[]) {
    super(`Dataset validation failed with ${issues.length} issue(s)`)
    this.name = 'DatasetValidationError'
    this.issues = issues
  }
}
