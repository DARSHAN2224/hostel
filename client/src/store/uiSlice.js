import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  validationErrors: [] // array of { field, message }
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setValidationErrors(state, action) {
      state.validationErrors = action.payload || []
    },
    clearValidationErrors(state) {
      state.validationErrors = []
    }
  }
})

export const { setValidationErrors, clearValidationErrors } = uiSlice.actions

export const selectValidationErrors = (state) => state.ui.validationErrors

export default uiSlice.reducer
