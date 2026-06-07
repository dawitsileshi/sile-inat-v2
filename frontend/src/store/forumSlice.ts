import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { API_URL, anonymousHeaders, parseResponse } from '@/lib/api';

export const FORUM_CATEGORIES = [
  'All',
  'Childbirth',
  'Recovery',
  'Breastfeeding',
  'Newborn Care',
  'Mental Health',
  'Sleep',
  'Parenting',
  'General',
] as const;

export type ForumCategory = (typeof FORUM_CATEGORIES)[number];

export interface ForumReply {
  id: number;
  post_id: number;
  content: string;
  created_at: string;
  is_mine: boolean;
  author_label: string;
}

export interface ForumPost {
  id: number;
  category: string;
  title: string;
  content: string;
  created_at: string;
  reply_count: number;
  is_mine: boolean;
  author_label: string;
  replies?: ForumReply[];
}

interface ForumState {
  posts: ForumPost[];
  activeCategory: ForumCategory;
  selectedPost: ForumPost | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  submitStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

export const fetchPosts = createAsyncThunk(
  'forum/fetchPosts',
  async (category: ForumCategory, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({ category });
      const response = await fetch(`${API_URL}/forum/posts?${params}`, {
        headers: anonymousHeaders(),
      });
      const data = await parseResponse<{ posts: ForumPost[] }>(response);
      return { posts: data.posts, category };
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to load posts');
    }
  }
);

export const fetchPostDetail = createAsyncThunk(
  'forum/fetchPostDetail',
  async (postId: number, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/forum/posts/${postId}`, {
        headers: anonymousHeaders(),
      });
      const data = await parseResponse<{ post: ForumPost }>(response);
      return data.post;
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to load post');
    }
  }
);

export const createPost = createAsyncThunk(
  'forum/createPost',
  async (
    payload: { title: string; content: string; category: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await fetch(`${API_URL}/forum/posts`, {
        method: 'POST',
        headers: anonymousHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await parseResponse<{ post: ForumPost }>(response);
      return data.post;
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to create post');
    }
  }
);

export const createReply = createAsyncThunk(
  'forum/createReply',
  async (
    payload: { postId: number; content: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await fetch(`${API_URL}/forum/posts/${payload.postId}/replies`, {
        method: 'POST',
        headers: anonymousHeaders(),
        body: JSON.stringify({ content: payload.content }),
      });
      const data = await parseResponse<{ post: ForumPost }>(response);
      return data.post;
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to post reply');
    }
  }
);

const forumSlice = createSlice({
  name: 'forum',
  initialState: {
    posts: [],
    activeCategory: 'All' as ForumCategory,
    selectedPost: null,
    status: 'idle',
    submitStatus: 'idle',
    error: null,
  } as ForumState,
  reducers: {
    setActiveCategory(state, action: { payload: ForumCategory }) {
      state.activeCategory = action.payload;
    },
    clearSelectedPost(state) {
      state.selectedPost = null;
    },
    clearForumError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPosts.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchPosts.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.posts = action.payload.posts;
      })
      .addCase(fetchPosts.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) ?? 'Failed to load posts';
      })
      .addCase(fetchPostDetail.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchPostDetail.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.selectedPost = action.payload;
      })
      .addCase(fetchPostDetail.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) ?? 'Failed to load thread';
      })
      .addCase(createPost.pending, (state) => {
        state.submitStatus = 'loading';
        state.error = null;
      })
      .addCase(createPost.fulfilled, (state, action) => {
        state.submitStatus = 'succeeded';
        state.posts = [action.payload, ...state.posts];
      })
      .addCase(createPost.rejected, (state, action) => {
        state.submitStatus = 'failed';
        state.error = (action.payload as string) ?? 'Failed to create post';
      })
      .addCase(createReply.pending, (state) => {
        state.submitStatus = 'loading';
      })
      .addCase(createReply.fulfilled, (state, action) => {
        state.submitStatus = 'succeeded';
        state.selectedPost = action.payload;
        const idx = state.posts.findIndex((p) => p.id === action.payload.id);
        if (idx >= 0) {
          state.posts[idx] = {
            ...action.payload,
            replies: undefined,
          };
        }
      })
      .addCase(createReply.rejected, (state, action) => {
        state.submitStatus = 'failed';
        state.error = (action.payload as string) ?? 'Failed to post reply';
      });
  },
});

export const { setActiveCategory, clearSelectedPost, clearForumError } = forumSlice.actions;
export default forumSlice.reducer;
