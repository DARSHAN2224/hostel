import { configureStore } from '@reduxjs/toolkit'
import authReducer from './authSlice'
import studentsReducer from './studentsSlice'
import outpassReducer from './outpassSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    students: studentsReducer,
    outpass: outpassReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
  devTools: import.meta.env.MODE !== 'production',
})

// For TypeScript users, you would export these types:
// export type RootState = ReturnType<typeof store.getState>
// export type AppDispatch = typeof store.dispatch