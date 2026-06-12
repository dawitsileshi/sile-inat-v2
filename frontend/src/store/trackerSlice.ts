import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const API_URL = '/api';
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export type BabyStatus = 'pregnant' | 'born' | 'skip';

export interface StoredUser {
  user_id: number;
  email: string;
  baby_status: BabyStatus | null;
  baby_birth_date: string | null;
}

export function getStoredUser(): StoredUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

export interface DailyLogPayload {
  gestational_week: number;
  sleep_hours: number;
  water_liters: number;
  symptom_score: number;
  mood_score: number;
  hrv_delta?: number | null;
  feels_supported?: 'yes' | 'somewhat' | 'no' | null;
  notes?: string | null;
  log_date?: string;
}

export interface DailyLog {
  id: number;
  user_id: number;
  log_date: string;
  gestational_week: number;
  sleep_hours: number;
  water_liters: number;
  symptom_score: number;
  mood_score: number;
  hrv_delta: number | null;
  feels_supported: 'yes' | 'somewhat' | 'no' | null;
  notes: string | null;
  response_message: string | null;
  predicted_stress_index: number | null;
  created_at: string;
}

interface TrackerState {
  authToken: string | null;
  logs: DailyLog[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  latestPrediction: DailyLog | null;
  predictionLabel: string | null;
  insights: string[];
  error: string | null;
}

function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function storeToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

function storeUser(user: StoredUser | undefined | null): void {
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
}

async function parseResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) {
    const message = typeof data.error === 'string' ? data.error : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return data as T;
}

function authHeaders(token: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

async function getOrCreateToken(getState: () => unknown): Promise<string> {
  const state = getState() as { tracker: TrackerState };
  const existing = state.tracker.authToken || getStoredToken();
  if (existing) {
    return existing;
  }

  const email = `user-${crypto.randomUUID().slice(0, 8)}@wellness.local`;
  const password = crypto.randomUUID();
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await parseResponse<{ token: string; user?: StoredUser }>(response);
  storeToken(data.token);
  storeUser(data.user);
  return data.token;
}

export const ensureAuth = createAsyncThunk<string, void, { rejectValue: string }>(
  'tracker/ensureAuth',
  async (_, { rejectWithValue }) => {
    const existing = getStoredToken();
    if (existing) {
      return existing;
    }

    const email = `user-${crypto.randomUUID().slice(0, 8)}@wellness.local`;
    const password = crypto.randomUUID();

    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await parseResponse<{ token: string }>(response);
      storeToken(data.token);
      return data.token;
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Registration failed');
    }
  }
);

/** @deprecated Use ensureAuth — kept for existing page imports */
export const registerDevice = ensureAuth;

export const submitDailyLog = createAsyncThunk(
  'tracker/submitDailyLog',
  async (logData: DailyLogPayload, { getState, rejectWithValue }) => {
    try {
      const token = await getOrCreateToken(getState);
      const response = await fetch(`${API_URL}/logs`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(logData),
      });
      return await parseResponse<{
        log: DailyLog;
        model_ready: boolean;
        prediction_label?: string;
        insights?: string[];
      }>(response);
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to submit log');
    }
  }
);

export const fetchLogs = createAsyncThunk(
  'tracker/fetchLogs',
  async (_, { getState, rejectWithValue }) => {
    try {
      const token = await getOrCreateToken(getState);
      const response = await fetch(`${API_URL}/logs/history`, {
        headers: authHeaders(token),
      });
      return await parseResponse<{ logs: DailyLog[]; count: number }>(response);
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to fetch logs');
    }
  }
);

const trackerSlice = createSlice({
  name: 'tracker',
  initialState: {
    authToken: getStoredToken(),
    logs: [],
    status: 'idle',
    latestPrediction: null,
    predictionLabel: null,
    insights: [],
    error: null,
  } as TrackerState,
  reducers: {
    clearTrackerError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(ensureAuth.fulfilled, (state, action) => {
        state.authToken = action.payload;
        state.error = null;
      })
      .addCase(ensureAuth.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? action.error.message ?? 'Authentication failed';
      })
      .addCase(fetchLogs.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchLogs.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.logs = action.payload.logs;
        if (state.logs.length > 0) {
          state.latestPrediction = state.logs[state.logs.length - 1];
        }
        state.error = null;
      })
      .addCase(fetchLogs.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) ?? action.error.message ?? 'Failed to load logs';
      })
      .addCase(submitDailyLog.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(submitDailyLog.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.latestPrediction = action.payload.log;
        state.predictionLabel = action.payload.prediction_label ?? null;
        state.insights = action.payload.insights ?? [];
        const existing = state.logs.findIndex((l) => l.id === action.payload.log.id);
        if (existing >= 0) {
          state.logs[existing] = action.payload.log;
        } else {
          state.logs.push(action.payload.log);
        }
        state.error = null;
      })
      .addCase(submitDailyLog.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) ?? action.error.message ?? 'Failed to submit log';
      });
  },
});

export const { clearTrackerError } = trackerSlice.actions;
export default trackerSlice.reducer;
