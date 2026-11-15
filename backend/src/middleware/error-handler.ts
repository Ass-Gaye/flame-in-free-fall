import type { ErrorRequestHandler, RequestHandler } from 'express'
import { ZodError } from 'zod'

import { config } from '../config.js'
import { ApiError } from '../lib/errors.js'

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    error: {
      code: 'route_not_found',
      message: `No API route matches ${req.method} ${req.originalUrl}`,
    },
  })
}

function zodDetails(error: ZodError): { path: string; message: string }[] {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }))
}

/**
 * Single place where every error becomes a JSON response. Unexpected errors
 * never leak stack traces or database details outside development.
 */
export const errorHandler: ErrorRequestHandler = (
  error,
  _req,
  res,
  _next,
) => {
  if (res.headersSent) {
    return
  }

  if (error instanceof ApiError) {
    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.details === undefined ? {} : { details: error.details }),
      },
    })
    return
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'validation_error',
        message: 'One or more query parameters are invalid.',
        details: zodDetails(error),
      },
    })
    return
  }

  // Malformed JSON bodies are rejected by express.json() before any handler.
  if (
    error instanceof SyntaxError &&
    'status' in error &&
    (error as { status?: number }).status === 400
  ) {
    res.status(400).json({
      error: {
        code: 'invalid_json',
        message: 'Request body is not valid JSON.',
      },
    })
    return
  }

  console.error('Unhandled API error:', error)

  res.status(500).json({
    error: {
      code: 'internal_error',
      message:
        config.nodeEnv === 'development' && error instanceof Error
          ? error.message
          : 'An unexpected error occurred.',
    },
  })
}
