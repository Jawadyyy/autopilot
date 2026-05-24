import { NextResponse } from 'next/server'

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}

export function created<T>(data: T) {
  return ok(data, 201)
}

export function error(message: string, status = 400, details?: any) {
  return NextResponse.json({ success: false, error: message, details }, { status })
}

export function unauthorized(message = 'Unauthorized') {
  return error(message, 401)
}

export function forbidden(message = 'Insufficient permissions') {
  return error(message, 403)
}

export function notFound(resource = 'Resource') {
  return error(`${resource} not found`, 404)
}

export function serverError(err: unknown) {
  const message = err instanceof Error ? err.message : 'Internal server error'
  console.error('[API Error]', err)
  return error(message, 500)
}