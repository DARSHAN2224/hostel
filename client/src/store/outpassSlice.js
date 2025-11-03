/**
 * Outpass Slice - Redux Toolkit
 * Manages outpass requests state
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { outpassService } from '../services/outpassService'

// Initial state
const initialState = {
  outpasses: [],
  currentOutpass: null,
  dashboardData: null,
  statistics: null,
  loading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  },
  filters: {
    status: '',
    outpassType: '',
    studentId: '',
    dateFrom: '',
    dateTo: ''
  }
}

// Async thunks
export const fetchOutpasses = createAsyncThunk(
  'outpass/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      const response = await outpassService.getAll(params)
      return response.data
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch outpasses')
    }
  }
)

export const fetchMyOutpasses = createAsyncThunk(
  'outpass/fetchMy',
  async (params, { rejectWithValue }) => {
    try {
      const response = await outpassService.getMyOutpasses(params)
      return response.data
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch outpasses')
    }
  }
)

export const fetchOutpassById = createAsyncThunk(
  'outpass/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await outpassService.getById(id)
      return response.data
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch outpass')
    }
  }
)

export const fetchDashboardData = createAsyncThunk(
  'outpass/fetchDashboard',
  async (_, { rejectWithValue }) => {
    try {
      const response = await outpassService.getWardenDashboard()
      return response.data
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch dashboard data')
    }
  }
)

export const fetchStatistics = createAsyncThunk(
  'outpass/fetchStatistics',
  async (dateRange, { rejectWithValue }) => {
    try {
      const response = await outpassService.getStatistics(dateRange)
      return response.data
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch statistics')
    }
  }
)

export const createOutpass = createAsyncThunk(
  'outpass/create',
  async (outpassData, { rejectWithValue }) => {
    try {
      const response = await outpassService.create(outpassData)
      return response.data
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to create outpass')
    }
  }
)

export const approveOutpass = createAsyncThunk(
  'outpass/approve',
  async ({ requestId, comments }, { rejectWithValue }) => {
    try {
      const response = await outpassService.approve(requestId, comments)
      return response.data
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to approve outpass')
    }
  }
)

export const rejectOutpass = createAsyncThunk(
  'outpass/reject',
  async ({ requestId, reason }, { rejectWithValue }) => {
    try {
      const response = await outpassService.reject(requestId, reason)
      return response.data
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to reject outpass')
    }
  }
)

export const cancelOutpass = createAsyncThunk(
  'outpass/cancel',
  async ({ requestId, reason }, { rejectWithValue }) => {
    try {
      const response = await outpassService.cancel(requestId, reason)
      return response.data
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to cancel outpass')
    }
  }
)

// Slice
const outpassSlice = createSlice({
  name: 'outpass',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload }
    },
    clearFilters: (state) => {
      state.filters = initialState.filters
    },
    setCurrentOutpass: (state, action) => {
      state.currentOutpass = action.payload
    },
    clearCurrentOutpass: (state) => {
      state.currentOutpass = null
    }
  },
  extraReducers: (builder) => {
    // Fetch outpasses
    builder
      .addCase(fetchOutpasses.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchOutpasses.fulfilled, (state, action) => {
        state.loading = false
        state.outpasses = action.payload.outpasses || action.payload
        if (action.payload.pagination) {
          state.pagination = action.payload.pagination
        }
      })
      .addCase(fetchOutpasses.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })

    // Fetch my outpasses
    builder
      .addCase(fetchMyOutpasses.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchMyOutpasses.fulfilled, (state, action) => {
        state.loading = false
        state.outpasses = action.payload.outpasses || action.payload
      })
      .addCase(fetchMyOutpasses.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })

    // Fetch outpass by ID
    builder
      .addCase(fetchOutpassById.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchOutpassById.fulfilled, (state, action) => {
        state.loading = false
        state.currentOutpass = action.payload
      })
      .addCase(fetchOutpassById.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })

    // Fetch dashboard data
    builder
      .addCase(fetchDashboardData.pending, (state) => {
        state.loading = true
      })
      .addCase(fetchDashboardData.fulfilled, (state, action) => {
        state.loading = false
        state.dashboardData = action.payload
      })
      .addCase(fetchDashboardData.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })

    // Fetch statistics
    builder
      .addCase(fetchStatistics.pending, (state) => {
        state.loading = true
      })
      .addCase(fetchStatistics.fulfilled, (state, action) => {
        state.loading = false
        state.statistics = action.payload
      })
      .addCase(fetchStatistics.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })

    // Create outpass
    builder
      .addCase(createOutpass.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createOutpass.fulfilled, (state, action) => {
        state.loading = false
        state.outpasses.unshift(action.payload)
      })
      .addCase(createOutpass.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })

    // Approve outpass
    builder
      .addCase(approveOutpass.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(approveOutpass.fulfilled, (state, action) => {
        state.loading = false
        const index = state.outpasses.findIndex(o => o._id === action.payload._id)
        if (index !== -1) {
          state.outpasses[index] = action.payload
        }
        if (state.currentOutpass?._id === action.payload._id) {
          state.currentOutpass = action.payload
        }
      })
      .addCase(approveOutpass.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })

    // Reject outpass
    builder
      .addCase(rejectOutpass.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(rejectOutpass.fulfilled, (state, action) => {
        state.loading = false
        const index = state.outpasses.findIndex(o => o._id === action.payload._id)
        if (index !== -1) {
          state.outpasses[index] = action.payload
        }
        if (state.currentOutpass?._id === action.payload._id) {
          state.currentOutpass = action.payload
        }
      })
      .addCase(rejectOutpass.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })

    // Cancel outpass
    builder
      .addCase(cancelOutpass.fulfilled, (state, action) => {
        const index = state.outpasses.findIndex(o => o._id === action.payload._id)
        if (index !== -1) {
          state.outpasses[index] = action.payload
        }
        if (state.currentOutpass?._id === action.payload._id) {
          state.currentOutpass = action.payload
        }
      })
  }
})

export const {
  clearError,
  setFilters,
  clearFilters,
  setCurrentOutpass,
  clearCurrentOutpass
} = outpassSlice.actions

// Selectors
export const selectOutpasses = (state) => state.outpass.outpasses
export const selectCurrentOutpass = (state) => state.outpass.currentOutpass
export const selectOutpassLoading = (state) => state.outpass.loading
export const selectOutpassError = (state) => state.outpass.error
export const selectOutpassPagination = (state) => state.outpass.pagination
export const selectOutpassFilters = (state) => state.outpass.filters
export const selectDashboardData = (state) => state.outpass.dashboardData
export const selectOutpassStatistics = (state) => state.outpass.statistics

export default outpassSlice.reducer
