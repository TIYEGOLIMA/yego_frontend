export const validationService = {
  async getDriverByPhonePublic(phoneNumber: string): Promise<{ phone: string, full_name: string } | null> {
    try {
      let phoneToSearch = phoneNumber.trim()
      
      if (!phoneToSearch.startsWith('+51') && phoneToSearch.length === 9) {
        phoneToSearch = `+51${phoneToSearch}`
      }
      
      let token = ''
      try {
        const authStorageData = localStorage.getItem('auth-storage')
        if (authStorageData) {
          const parsedData = JSON.parse(authStorageData)
          token = parsedData?.state?.token || ''
        }
      } catch {
        token = localStorage.getItem('token') || ''
      }

      const response = await fetch(`${import.meta.env.VITE_AGENT_API_URL || 'https://api-int.yego.pro/api/ticketera'}/buscar/telefono/${phoneToSearch}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
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
      console.error('[validationService] Error obteniendo conductor:', error)
      return null
    }
  }
}
