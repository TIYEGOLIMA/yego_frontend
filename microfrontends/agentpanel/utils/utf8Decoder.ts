/**
 * Utilidad para decodificar caracteres especiales del español
 * Maneja la conversión de códigos Unicode a caracteres UTF-8
 */

export const decodeSpanishCharacters = (text: string): string => {
  if (!text || typeof text !== 'string') {
    return text
  }

  try {
    let decodedText = text

    // Mapeo de códigos Unicode a caracteres españoles
    const unicodeMap: Record<string, string> = {
      '\\u00d1': 'Ñ', // Ñ mayúscula
      '\\u00f1': 'ñ', // ñ minúscula
      '\\u00c1': 'Á', // Á mayúscula
      '\\u00e1': 'á', // á minúscula
      '\\u00c9': 'É', // É mayúscula
      '\\u00e9': 'é', // é minúscula
      '\\u00cd': 'Í', // Í mayúscula
      '\\u00ed': 'í', // í minúscula
      '\\u00d3': 'Ó', // Ó mayúscula
      '\\u00f3': 'ó', // ó minúscula
      '\\u00da': 'Ú', // Ú mayúscula
      '\\u00fa': 'ú', // ú minúscula
      '\\u00dc': 'Ü', // Ü mayúscula
      '\\u00fc': 'ü', // ü minúscula
      '\\u00c7': 'Ç', // Ç mayúscula
      '\\u00e7': 'ç', // ç minúscula
    }

    // Reemplazar códigos Unicode
    Object.entries(unicodeMap).forEach(([unicode, char]) => {
      decodedText = decodedText.replace(new RegExp(unicode, 'g'), char)
    })

    // También manejar casos donde el texto ya viene como Unicode real
    try {
      // Intentar decodificar si es necesario
      if (decodedText.includes('\\u')) {
        decodedText = JSON.parse(`"${decodedText}"`)
      }
    } catch (e) {
      // Si falla, mantener el texto original
      console.warn('⚠️ [utf8Decoder] Error decodificando Unicode:', e)
    }

    return decodedText
  } catch (error) {
    console.error('❌ [utf8Decoder] Error procesando texto:', error)
    return text
  }
}

/**
 * Función para limpiar y normalizar nombres de conductores
 */
export const normalizeDriverName = (name: string): string => {
  if (!name || typeof name !== 'string') {
    return name
  }

  // Decodificar caracteres especiales
  let normalizedName = decodeSpanishCharacters(name)

  // Capitalizar correctamente
  normalizedName = normalizedName
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  return normalizedName
}

/**
 * Función para verificar si un texto contiene caracteres especiales codificados
 */
export const hasEncodedCharacters = (text: string): boolean => {
  if (!text || typeof text !== 'string') {
    return false
  }

  const encodedPatterns = [
    /\\u00d1|\\u00f1/, // ñ/Ñ
    /\\u00c1|\\u00e1/, // á/Á
    /\\u00c9|\\u00e9/, // é/É
    /\\u00cd|\\u00ed/, // í/Í
    /\\u00d3|\\u00f3/, // ó/Ó
    /\\u00da|\\u00fa/, // ú/Ú
    /\\u00dc|\\u00fc/, // ü/Ü
    /\\u00c7|\\u00e7/, // ç/Ç
  ]

  return encodedPatterns.some(pattern => pattern.test(text))
}