/**
 * Students Slice - Redux Toolkit
 * Manages students state
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { studentService } from '../services/studentService'

// Initial state
const initialState = {
  students: [],
  currentStudent: null,
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
    search: '',
    status: '',
    hostelBlock: '',
    year: ''
  }
}

// Async thunks
export const fetchStudents = createAsyncThunk(
  'students/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      const response = await studentService.getAll(params)
      return response.data
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch students')
    }
  }
)

export const searchStudents = createAsyncThunk(
  'students/search',
  async (searchParams, { rejectWithValue }) => {
    try {
      const response = await studentService.search(searchParams)
      return response.data
    } catch (error) {
      return rejectWithValue(error.message || 'Search failed')
    }
  }
)

export const fetchStudentById = createAsyncThunk(
  'students/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await studentService.getById(id)
      return response.data
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch student')
    }
  }
)

export const fetchStatistics = createAsyncThunk(
  'students/fetchStatistics',
  async (_, { rejectWithValue }) => {
    try {
      const response = await studentService.getStatistics()
      return response.data
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch statistics')
    }
  }
)

export const createStudent = createAsyncThunk(
  'students/create',
  async (studentData, { rejectWithValue }) => {
    try {
      const response = await studentService.create(studentData)
      return response.data
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to create student')
    }
  }
)

export const updateStudent = createAsyncThunk(
  'students/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await studentService.update(id, data)
      return response.data
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to update student')
    }
  }
)

export const suspendStudent = createAsyncThunk(
  'students/suspend',
  async ({ id, reason }, { rejectWithValue }) => {
    try {
      const response = await studentService.suspend(id, reason)
      return response.data
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to suspend student')
    }
  }
)

export const activateStudent = createAsyncThunk(
  'students/activate',
  async (id, { rejectWithValue }) => {
    try {
      const response = await studentService.activate(id)
      return response.data
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to activate student')
    }
  }
)

export const deleteStudent = createAsyncThunk(
  'students/delete',
  async (id, { rejectWithValue }) => {
    try {
      await studentService.delete(id)
      return id
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to delete student')
    }
  }
)

// Slice
const studentsSlice = createSlice({
  name: 'students',
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
    setCurrentStudent: (state, action) => {
      state.currentStudent = action.payload
    },
    clearCurrentStudent: (state) => {
      state.currentStudent = null
    }
  },
  extraReducers: (builder) => {
    // Fetch students
    builder
      .addCase(fetchStudents.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchStudents.fulfilled, (state, action) => {
        state.loading = false
        state.students = action.payload.students || action.payload
        if (action.payload.pagination) {
          state.pagination = action.payload.pagination
        }
      })
      .addCase(fetchStudents.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })

    // Search students
    builder
      .addCase(searchStudents.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(searchStudents.fulfilled, (state, action) => {
        state.loading = false
        state.students = action.payload.students || action.payload
      })
      .addCase(searchStudents.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })

    // Fetch student by ID
    builder
      .addCase(fetchStudentById.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchStudentById.fulfilled, (state, action) => {
        state.loading = false
        state.currentStudent = action.payload
      })
      .addCase(fetchStudentById.rejected, (state, action) => {
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

    // Create student
    builder
      .addCase(createStudent.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createStudent.fulfilled, (state, action) => {
        state.loading = false
        state.students.unshift(action.payload)
      })
      .addCase(createStudent.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })

    // Update student
    builder
      .addCase(updateStudent.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(updateStudent.fulfilled, (state, action) => {
        state.loading = false
        const index = state.students.findIndex(s => s._id === action.payload._id)
        if (index !== -1) {
          state.students[index] = action.payload
        }
        if (state.currentStudent?._id === action.payload._id) {
          state.currentStudent = action.payload
        }
      })
      .addCase(updateStudent.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })

    // Suspend student
    builder
      .addCase(suspendStudent.fulfilled, (state, action) => {
        const index = state.students.findIndex(s => s._id === action.payload._id)
        if (index !== -1) {
          state.students[index] = action.payload
        }
      })

    // Activate student
    builder
      .addCase(activateStudent.fulfilled, (state, action) => {
        const index = state.students.findIndex(s => s._id === action.payload._id)
        if (index !== -1) {
          state.students[index] = action.payload
        }
      })

    // Delete student
    builder
      .addCase(deleteStudent.fulfilled, (state, action) => {
        state.students = state.students.filter(s => s._id !== action.payload)
      })
  }
})

export const {
  clearError,
  setFilters,
  clearFilters,
  setCurrentStudent,
  clearCurrentStudent
} = studentsSlice.actions

// Selectors
export const selectStudents = (state) => state.students.students
export const selectCurrentStudent = (state) => state.students.currentStudent
export const selectStudentsLoading = (state) => state.students.loading
export const selectStudentsError = (state) => state.students.error
export const selectStudentsPagination = (state) => state.students.pagination
export const selectStudentsFilters = (state) => state.students.filters
export const selectStudentsStatistics = (state) => state.students.statistics

export default studentsSlice.reducer
