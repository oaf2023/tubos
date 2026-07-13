import { PrismaClient } from '@prisma/client'
import { fetchClimaHistorico, fetchLocal, fetchSMN } from '../src/lib/services/clima-service'

const db = new PrismaClient()

const MOMENTOS = ['manana', 'tarde', 'noche'] as const

function getHoraIdx(momento: string): number {
  if (momento === 'manana') return 8
  if (momento === 'tarde') return 15
  return 20
}

async function main() {
  const dias = 30
  const hoy = new Date()
  let total = 0

  console.log(`Cargando clima histórico de los últimos ${dias} días...`)

  for (let d = 1; d <= dias; d++) {
    const fecha = new Date(hoy)
    fecha.setDate(fecha.getDate() - d)
    const fechaStr = fecha.toISOString().slice(0, 10)
    const fechaDate = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate())

    for (const momento of MOMENTOS) {
      // 1. Foránea (Open-Meteo ERA5 histórico)
      await fetchClimaHistorico(fecha, momento)

      // 2. Local (wttr.in) — no tiene histórico confiable, se salta
      // 3. SMN — no tiene histórico público, se salta

      // Verificar si se guardó
      const count = await db.clima.count({
        where: {
          fechaDate,
          momento,
        },
      })

      if (count > 0) {
        total++
        process.stdout.write('.')
      }
    }

    if (d % 5 === 0) console.log(` ${d}/${dias} días`)
  }

  console.log(`\nCarga completada: ${total} registros de clima histórico`)
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
