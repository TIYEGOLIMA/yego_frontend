// 🔧 Servicio de validaciones para TVDisplay

export const validationService = {
  isValidPhoneNumber(phone: string): boolean {
    // Validar formato de teléfono peruano
    const phoneRegex = /^(\+51)?[0-9]{9}$/
    return phoneRegex.test(phone.replace(/\s+/g, ''))
  },

  normalizePhoneNumber(phone: string): string {
    // Normalizar número de teléfono
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.startsWith('51') && cleaned.length === 11) {
      return `+${cleaned}`
    }
    if (cleaned.length === 9) {
      return `+51${cleaned}`
    }
    return phone
  },

  isValidTicket(ticket: any): boolean {
    return (
      ticket &&
      typeof ticket === 'object' &&
      ticket.id &&
      ticket.ticketNumber &&
      ticket.status
    )
  },

  sanitizeDriverName(name: string): string {
    // Limpiar y normalizar nombres de conductores
    return name
      .trim()
      .replace(/\s+/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  },

  async getDriverByPhonePublic(phoneNumber: string): Promise<{ phone: string, full_name: string } | null> {
    try {
      let phoneToSearch = phoneNumber.trim()
      
      if (!phoneToSearch.startsWith('+51') && phoneToSearch.length === 9) {
        phoneToSearch = `+51${phoneToSearch}`
      }
      
      // Usar fetch directo en lugar de axios para simplicidad
      const response = await fetch(`${import.meta.env.VITE_AGENT_API_URL || 'https://api-int.yego.pro/api/ticketera'}/buscar/telefono/${phoneToSearch}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        }
      })

      if (!response.ok) {
        if (response.status === 404 || response.status === 400) {
          return null
        }
        throw new Error(`HTTP ${response.status}`)
      }

      return await response.json()
    } catch (error: any) {
      if (error?.message?.includes('404') || error?.message?.includes('400')) {
        return null
      }
      console.error('❌ [validationService] Error obteniendo conductor:', error)
      return null
    }
  },

  async preloadDrivers(phoneNumbers: string[]): Promise<Record<string, string>> {
    const driverData: Record<string, string> = {}
    
    // Procesar en lotes para no saturar la API
    const batchSize = 3
    for (let i = 0; i < phoneNumbers.length; i += batchSize) {
      const batch = phoneNumbers.slice(i, i + batchSize)
      
      const promises = batch.map(async (phone) => {
        try {
          const driver = await this.getDriverByPhonePublic(phone)
          if (driver && driver.full_name) {
            driverData[phone] = this.sanitizeDriverName(driver.full_name)
          }
        } catch (error) {
          console.warn(`⚠️ [validationService] Error cargando conductor ${phone}:`, error)
        }
      })
      
      await Promise.all(promises)
      
      // Pequeña pausa entre lotes
      if (i + batchSize < phoneNumbers.length) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }
    
    return driverData
  }
}
