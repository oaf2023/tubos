import { NextResponse } from 'next/server'
import { Decimal } from '@prisma/client/runtime/library'

function convertValues(val: unknown): unknown {
  if (val instanceof Decimal) return Number(val)
  if (Array.isArray(val)) return val.map(convertValues)
  if (val !== null && typeof val === 'object') {
    const obj = val as Record<string, unknown>
    const result: Record<string, unknown> = {}
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = convertValues(obj[key])
      }
    }
    return result
  }
  return val
}

export function jsonResponse(data: unknown, status = 200) {
  return NextResponse.json(convertValues(data), { status })
}
