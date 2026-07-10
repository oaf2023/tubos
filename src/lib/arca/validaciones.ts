export interface ErrorValidacion {
  campo: string
  mensaje: string
  tipo: 'error' | 'advertencia'
}

export function validarCUIT(cuit: string): boolean {
  const limpio = cuit.replace(/\D/g, '')
  if (limpio.length !== 11) return false

  const base = limpio.slice(0, -1)
  const digitoVerificador = parseInt(limpio[10], 10)

  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
  let suma = 0
  for (let i = 0; i < 10; i++) {
    suma += parseInt(base[i], 10) * pesos[i]
  }
  const resto = suma % 11
  const resultado = resto === 0 ? 0 : resto === 1 ? 11 - resto : 11 - resto
  const digitoCalculado = resultado === 11 ? 0 : resultado === 10 ? 9 : resultado

  return digitoCalculado === digitoVerificador
}

export function validarDocumento(tipo: string | null | undefined, numero: string | null | undefined): boolean {
  if (!numero || !tipo) return false
  const limpio = numero.replace(/\D/g, '')
  if (!limpio) return false

  const tipoNorm = (tipo || '').replace(/\./g, '').toUpperCase()
  if (tipoNorm === 'CUIT') return validarCUIT(numero)
  if (tipoNorm === 'DNI') return limpio.length >= 7 && limpio.length <= 8
  if (tipoNorm === 'LC' || tipoNorm === 'LE') return limpio.length >= 6 && limpio.length <= 8
  if (tipoNorm === 'PASAPORTE') return numero.length >= 4
  return true
}

export function validarDatosComprobante(input: {
  tipoDocumento: string
  letra: string
  fiscal: boolean
  clienteNombre?: string | null
  clienteDocumentoTipo?: string | null
  clienteDocumentoNumero?: string | null
  clienteCondicionIva?: string | null
  cae?: string | null
}): ErrorValidacion[] {
  const errores: ErrorValidacion[] = []

  if (!input.clienteNombre?.trim()) {
    errores.push({ campo: 'clienteNombre', mensaje: 'El nombre del cliente es obligatorio', tipo: 'error' })
  }

  if (input.fiscal && (input.letra === 'A')) {
    if (!input.clienteDocumentoTipo || !input.clienteDocumentoNumero) {
      errores.push({ campo: 'clienteDocumento', mensaje: 'Factura A requiere CUIT del receptor', tipo: 'error' })
    } else if (input.clienteDocumentoTipo.replace(/\./g, '').toUpperCase() === 'CUIT') {
      if (!validarCUIT(input.clienteDocumentoNumero || '')) {
        errores.push({ campo: 'clienteDocumento', mensaje: 'CUIT inválido (no pasa dígito verificador)', tipo: 'error' })
      }
    }
  }

  if (input.fiscal && (input.letra === 'A' || input.letra === 'E')) {
    if (!input.clienteCondicionIva?.trim()) {
      errores.push({ campo: 'clienteCondicionIva', mensaje: 'Condición IVA del receptor es obligatoria para Factura A/E', tipo: 'error' })
    }
  }

  if (input.fiscal && input.tipoDocumento === 'FACTURA') {
    if (!input.cae) {
      errores.push({ campo: 'cae', mensaje: 'Comprobante fiscal requiere CAE para ser emitido', tipo: 'advertencia' })
    }
  }

  return errores
}
