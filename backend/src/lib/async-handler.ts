import type { NextFunction, Request, RequestHandler, Response } from 'express'

/**
 * Express 5 forwards rejected promises automatically, but an explicit wrapper
 * keeps the intent clear and works with strict TypeScript handler types.
 */
export function asyncHandler(
  handler: (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    void handler(req, res, next).catch(next)
  }
}
