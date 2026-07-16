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

    const unicodeMap: Record<string, string> = {
      '\\u00d1': 'Ñ',
      '\\u00f1': 'ñ',
      '\\u00c1': 'Á',
      '\\u00e1': 'á',
      '\\u00c9': 'É',
      '\\u00e9': 'é',
      '\\u00cd': 'Í',
      '\\u00ed': 'í',
      '\\u00d3': 'Ó',
      '\\u00f3': 'ó',
      '\\u00da': 'Ú',
      '\\u00fa': 'ú',
      '\\u00dc': 'Ü',
      '\\u00fc': 'ü',
      '\\u00c7': 'Ç',
      '\\u00e7': 'ç',
    }

    Object.entries(unicodeMap).forEach(([unicode, char]) => {
      decodedText = decodedText.replace(new RegExp(unicode, 'g'), char)
    })

    try {
      if (decodedText.includes('\\u')) {
        decodedText = JSON.parse(`"${decodedText}"`)
      }
    } catch {
      /* keep decodedText as-is */
    }

    return decodedText
  } catch (error) {
    console.error('[utf8Decoder] Error procesando texto:', error)
    return text
  }
}

export const normalizeDriverName = (name: string): string => {
  if (!name || typeof name !== 'string') {
    return name
  }

  let normalizedName = decodeSpanishCharacters(name)

  normalizedName = normalizedName
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  return normalizedName
}

export const hasEncodedCharacters = (text: string): boolean => {
  if (!text || typeof text !== 'string') {
    return false
  }

  const encodedPatterns = [
    /\\u00d1|\\u00f1/,
    /\\u00c1|\\u00e1/,
    /\\u00c9|\\u00e9/,
    /\\u00cd|\\u00ed/,
    /\\u00d3|\\u00f3/,
    /\\u00da|\\u00fa/,
    /\\u00dc|\\u00fc/,
    /\\u00c7|\\u00e7/,
  ]

  return encodedPatterns.some(pattern => pattern.test(text))
}
