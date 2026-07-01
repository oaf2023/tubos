export interface GeocodingResult {
  lat: number
  lon: number
  displayName: string
}

export async function geocodificarDireccion(
  calle: string,
  altura: string,
  ciudad: string,
  provincia: string,
  pais: string
): Promise<GeocodingResult> {
  const query = `${calle} ${altura}, ${ciudad}, ${provincia}, ${pais}`
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`

  const response = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error('Error en la respuesta del servidor de geolocalización')

  const data = await response.json()
  if (data && data.length > 0) {
    return {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
      displayName: data[0].display_name,
    }
  }

  const fallbackQuery = `${calle}, ${ciudad}, ${pais}`
  const fallbackUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fallbackQuery)}&format=json&limit=1`
  const fallbackRes = await fetch(fallbackUrl)
  if (fallbackRes.ok) {
    const fallbackData = await fallbackRes.json()
    if (fallbackData && fallbackData.length > 0) {
      return {
        lat: parseFloat(fallbackData[0].lat),
        lon: parseFloat(fallbackData[0].lon),
        displayName: fallbackData[0].display_name,
      }
    }
  }

  throw new Error('No se encontraron coordenadas para la dirección especificada')
}
