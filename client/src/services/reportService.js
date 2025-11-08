import api from './api'

const REPORT_BASE_URL = '/reports'

export const reportService = {
  /**
   * Get outpass report with filters
   */
  async getOutpassReport(params = {}) {
    const response = await api.get(`${REPORT_BASE_URL}/outpass`, { params })
    return response.data
  },

  /**
   * Get violation report with filters
   */
  async getViolationReport(params = {}) {
    const response = await api.get(`${REPORT_BASE_URL}/violations`, { params })
    return response.data
  },

  /**
   * Get student activity report
   */
  async getStudentActivityReport(params = {}) {
    const response = await api.get(`${REPORT_BASE_URL}/student-activity`, { params })
    return response.data
  },

  /**
   * Get audit log report
   */
  async getAuditLogReport(params = {}) {
    const response = await api.get(`${REPORT_BASE_URL}/audit-logs`, { params })
    return response.data
  },

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(params = {}) {
    const response = await api.get(`${REPORT_BASE_URL}/dashboard-stats`, { params })
    return response.data
  },

  /**
   * Export report as PDF (future implementation)
   */
  async exportPDF(reportType, params = {}) {
    const response = await api.get(`${REPORT_BASE_URL}/${reportType}`, {
      params: { ...params, format: 'pdf' },
      responseType: 'blob'
    })
    return response.data
  },

  /**
   * Export report as Excel (future implementation)
   */
  async exportExcel(reportType, params = {}) {
    const response = await api.get(`${REPORT_BASE_URL}/${reportType}`, {
      params: { ...params, format: 'excel' },
      responseType: 'blob'
    })
    return response.data
  },

  /**
   * Export report as CSV (future implementation)
   */
  async exportCSV(reportType, params = {}) {
    const response = await api.get(`${REPORT_BASE_URL}/${reportType}`, {
      params: { ...params, format: 'csv' },
      responseType: 'blob'
    })
    return response.data
  }
}

export default reportService
