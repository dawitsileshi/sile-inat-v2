import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { API_URL, anonymousHeaders, parseResponse } from '@/lib/api';

export interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
  // Optional timestamp helps render relative times in the past-chats list.
  ts?: string;
}

export interface ArchivedChat {
  id: string;
  startedAt: string;
  endedAt: string;
  messages: ChatMessage[];
}

interface ChatState {
  currentChatId: string;
  messages: ChatMessage[];
  pastChats: ArchivedChat[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const STORAGE_KEY = 'sile_inat_chat_v1';

function newChatId(): string {
  return `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function persist(state: ChatState): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        currentChatId: state.currentChatId,
        messages: state.messages,
        pastChats: state.pastChats,
      })
    );
  } catch {
    // localStorage full or unavailable — silently drop. The next persist
    // attempt will try again, and the in-memory state is unaffected.
  }
}

function load(): Pick<ChatState, 'currentChatId' | 'messages' | 'pastChats'> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error('empty');
    const parsed = JSON.parse(raw);
    return {
      currentChatId: typeof parsed.currentChatId === 'string' ? parsed.currentChatId : newChatId(),
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
      pastChats: Array.isArray(parsed.pastChats) ? parsed.pastChats : [],
    };
  } catch {
    return { currentChatId: newChatId(), messages: [], pastChats: [] };
  }
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

const initialPersisted = load();

const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    currentChatId: initialPersisted.currentChatId,
    messages: initialPersisted.messages,
    pastChats: initialPersisted.pastChats,
    status: 'idle',
    error: null,
  } as ChatState,
  reducers: {
    addUserMessage(state, action: { payload: string }) {
      state.messages.push({
        role: 'user',
        text: action.payload,
        ts: new Date().toISOString(),
      });
      state.error = null;
      persist(state);
    },
    startNewChat(state) {
      if (state.messages.length > 0) {
        state.pastChats.unshift({
          id: state.currentChatId,
          startedAt: state.messages[0]?.ts ?? new Date().toISOString(),
          endedAt: state.messages[state.messages.length - 1]?.ts ?? new Date().toISOString(),
          messages: state.messages,
        });
        // Cap the history so localStorage doesn't grow unbounded.
        state.pastChats = state.pastChats.slice(0, 20);
      }
      state.currentChatId = newChatId();
      state.messages = [];
      state.status = 'idle';
      state.error = null;
      persist(state);
    },
    loadPastChat(state, action: { payload: string }) {
      const target = state.pastChats.find((c) => c.id === action.payload);
      if (!target) return;
      // Archive whatever's active right now, then swap in the past chat.
      if (state.messages.length > 0) {
        state.pastChats.unshift({
          id: state.currentChatId,
          startedAt: state.messages[0]?.ts ?? new Date().toISOString(),
          endedAt: state.messages[state.messages.length - 1]?.ts ?? new Date().toISOString(),
          messages: state.messages,
        });
      }
      state.pastChats = state.pastChats.filter((c) => c.id !== target.id).slice(0, 20);
      state.currentChatId = target.id;
      state.messages = target.messages;
      state.status = 'idle';
      state.error = null;
      persist(state);
    },
    deletePastChat(state, action: { payload: string }) {
      state.pastChats = state.pastChats.filter((c) => c.id !== action.payload);
      persist(state);
    },
    clearChat(state) {
      state.currentChatId = newChatId();
      state.messages = [];
      state.status = 'idle';
      state.error = null;
      persist(state);
    },
    clearAllChatHistory(state) {
      state.currentChatId = newChatId();
      state.messages = [];
      state.pastChats = [];
      state.status = 'idle';
      state.error = null;
      persist(state);
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
        state.messages.push({
          role: 'ai',
          text: action.payload,
          ts: new Date().toISOString(),
        });
        persist(state);
      })
      .addCase(sendMessageToAI.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) ?? 'Something went wrong';
        state.messages.push({
          role: 'ai',
          text: "I'm sorry, I couldn't respond right now. Please try again in a moment.",
          ts: new Date().toISOString(),
        });
        persist(state);
      });
  },
});

export const {
  addUserMessage,
  startNewChat,
  loadPastChat,
  deletePastChat,
  clearChat,
  clearAllChatHistory,
} = chatSlice.actions;
export default chatSlice.reducer;
