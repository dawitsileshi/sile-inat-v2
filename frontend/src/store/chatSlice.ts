import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { API_URL, anonymousHeaders, parseResponse } from '@/lib/api';

export interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
}

interface ChatState {
  messages: ChatMessage[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

export const sendMessageToAI = createAsyncThunk(
  'chat/sendMessageToAI',
  async (message: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { chat: ChatState };
      const history = state.chat.messages.map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

      const response = await fetch(`${API_URL}/chatbot`, {
        method: 'POST',
        headers: anonymousHeaders(),
        body: JSON.stringify({ message, history }),
      });

      const data = await parseResponse<{ reply: string }>(response);
      return data.reply;
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to get AI response');
    }
  }
);

const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    messages: [],
    status: 'idle',
    error: null,
  } as ChatState,
  reducers: {
    addUserMessage(state, action: { payload: string }) {
      state.messages.push({ role: 'user', text: action.payload });
      state.error = null;
    },
    clearChat(state) {
      state.messages = [];
      state.status = 'idle';
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendMessageToAI.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(sendMessageToAI.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.messages.push({ role: 'ai', text: action.payload });
      })
      .addCase(sendMessageToAI.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) ?? 'Something went wrong';
        state.messages.push({
          role: 'ai',
          text: "I'm sorry, I couldn't respond right now. Please try again in a moment.",
        });
      });
  },
});

export const { addUserMessage, clearChat } = chatSlice.actions;
export default chatSlice.reducer;
