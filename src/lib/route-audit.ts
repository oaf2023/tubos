// Routing calculation audit trail

export interface RouteCalcInput {
  rutaId?: string
  userName?: string
  paradaCount: number
  engine: string
  source: string
  distanceKm: number
  durationMin: number
  isRealRoute: boolean
  error?: string
}

export async function logRouteCalc(input: RouteCalcInput) {
  try {
    const { db } = await import('@/lib/db')
    await db.routeCalcLog.create({
      data: {
        rutaId: input.rutaId || null,
        userName: input.userName || null,
        paradaCount: input.paradaCount,
        engine: input.engine,
        source: input.source,
        distanceKm: input.distanceKm,
        durationMin: input.durationMin,
        isRealRoute: input.isRealRoute,
        error: input.error || null,
      },
    })
  } catch (e) {
    console.error('[route-audit] Failed to write log:', e)
  }
}
