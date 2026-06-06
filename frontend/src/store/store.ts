import { configureStore } from '@reduxjs/toolkit';
import trackerReducer from './trackerSlice';
import chatReducer from './chatSlice';
import forumReducer from './forumSlice';

export const store = configureStore({
  reducer: {
    tracker: trackerReducer,
    chat: chatReducer,
    forum: forumReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
