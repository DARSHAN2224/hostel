import { configureStore } from '@reduxjs/toolkit'
import authReducer from './authSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    // Add other reducers here as you build more features
    // users: usersReducer,
    // rooms: roomsReducer,
    // outpasses: outpassesReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
})

  // For TypeScript users, you would export these types:
  // export type RootState = ReturnType<typeof store.getState>
  // export type AppDispatch = typeof store.dispatch