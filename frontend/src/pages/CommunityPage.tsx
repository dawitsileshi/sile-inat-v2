import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, ArrowLeft, Loader2, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDispatch, useSelector } from 'react-redux'
import {
  FORUM_CATEGORIES,
  fetchPosts,
  fetchPostDetail,
  createPost,
  createReply,
  setActiveCategory,
  clearSelectedPost,
  type ForumCategory,
} from '@/store/forumSlice'
import { getAnonymousClientId } from '@/lib/clientId'
import type { AppDispatch, RootState } from '@/store/store'

const POST_CATEGORIES = FORUM_CATEGORIES.filter((c) => c !== 'All')

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

export function CommunityPage() {
  const dispatch = useDispatch<AppDispatch>()
  const {
    posts,
    activeCategory,
    selectedPost,
    status,
    submitStatus,
    error,
  } = useSelector((state: RootState) => state.forum)

  const [showNewPost, setShowNewPost] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [postCategory, setPostCategory] = useState('General')
  const [replyText, setReplyText] = useState('')

  useEffect(() => {
    getAnonymousClientId()
    dispatch(fetchPosts(activeCategory))
  }, [dispatch, activeCategory])

  function handleCategoryClick(cat: ForumCategory) {
    dispatch(setActiveCategory(cat))
    dispatch(clearSelectedPost())
  }

  function openThread(postId: number) {
    dispatch(fetchPostDetail(postId))
  }

  async function handleCreatePost(e: React.FormEvent) {
    e.preventDefault()
    const result = await dispatch(createPost({ title, content, category: postCategory }))
    if (createPost.fulfilled.match(result)) {
      setShowNewPost(false)
      setTitle('')
      setContent('')
      setPostCategory('General')
      dispatch(fetchPosts(activeCategory))
    }
  }

  async function handleReply(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedPost || !replyText.trim()) return
    const result = await dispatch(createReply({ postId: selectedPost.id, content: replyText }))
    if (createReply.fulfilled.match(result)) {
      setReplyText('')
    }
  }

  const isLoading = status === 'loading'
  const isSubmitting = submitStatus === 'loading'

  if (selectedPost) {
    return (
      <div className="px-6 py-12">
        <div className="mx-auto max-w-3xl">
          <button
            type="button"
            onClick={() => dispatch(clearSelectedPost())}
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-brand"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to forum
          </button>

          <motion.article
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-white p-6 card-shadow-sm"
          >
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-brand-light px-3 py-0.5 text-xs font-medium text-brand">
                {selectedPost.category}
              </span>
              <span className="text-xs text-text-muted">{formatDate(selectedPost.created_at)}</span>
              <span className="text-xs text-text-secondary">· {selectedPost.author_label}</span>
            </div>
            <h1 className="text-2xl font-bold text-text-primary">{selectedPost.title}</h1>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
              {selectedPost.content}
            </p>
          </motion.article>

          <h2 className="mt-8 mb-4 text-lg font-bold text-text-primary">
            Replies ({selectedPost.replies?.length ?? 0})
          </h2>

          <div className="space-y-3">
            {(selectedPost.replies ?? []).map((reply) => (
              <div
                key={reply.id}
                className={cn(
                  'rounded-xl border px-4 py-3',
                  reply.is_mine ? 'border-brand/30 bg-brand-light/30' : 'border-gray-100 bg-white'
                )}
              >
                <div className="mb-1 flex items-center gap-2 text-xs text-text-muted">
                  <span className="font-medium text-text-secondary">{reply.author_label}</span>
                  <span>· {formatDate(reply.created_at)}</span>
                </div>
                <p className="text-sm leading-relaxed text-text-primary whitespace-pre-wrap">
                  {reply.content}
                </p>
              </div>
            ))}
          </div>

          <form onSubmit={handleReply} className="mt-6 rounded-2xl bg-white p-4 card-shadow-sm">
            <textarea
              rows={3}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write a supportive reply…"
              className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={!replyText.trim() || isSubmitting}
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Post Reply
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-wrap items-end justify-between gap-4"
        >
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-text-primary">Community Forum</h1>
            <p className="mt-2 text-base text-text-secondary">
              Ask questions and share experiences anonymously
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowNewPost(true)}
            className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
          >
            <Plus className="h-4 w-4" />
            New Post
          </button>
        </motion.div>

        <div className="mb-6 flex flex-wrap gap-2">
          {FORUM_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => handleCategoryClick(cat)}
              className={cn(
                'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                activeCategory === cat
                  ? 'bg-brand text-white'
                  : 'bg-cream-dark text-text-secondary hover:bg-cream-dark/80'
              )}
            >
              {cat === 'All' ? 'All Topics' : cat}
            </button>
          ))}
        </div>

        {isLoading && posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
            <Loader2 className="h-8 w-8 animate-spin text-brand mb-3" />
            <p>Loading posts…</p>
          </div>
        ) : posts.length === 0 ? (
          <EmptyForum activeCategory={activeCategory} onCreate={() => setShowNewPost(true)} />
        ) : (
          <div className="grid gap-4">
            {posts.map((post) => (
              <motion.button
                key={post.id}
                type="button"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => openThread(post.id)}
                className="w-full rounded-2xl bg-white p-5 text-left card-shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-brand-light px-2.5 py-0.5 text-xs font-medium text-brand">
                    {post.category}
                  </span>
                  <span className="text-xs text-text-muted">{formatDate(post.created_at)}</span>
                  <span className="text-xs text-text-secondary">· {post.author_label}</span>
                </div>
                <h3 className="text-lg font-bold text-text-primary">{post.title}</h3>
                <p className="mt-2 line-clamp-2 text-sm text-text-secondary">{post.content}</p>
                <p className="mt-3 text-xs font-medium text-text-muted">
                  {post.reply_count} {post.reply_count === 1 ? 'reply' : 'replies'}
                </p>
              </motion.button>
            ))}
          </div>
        )}

        {error && status === 'failed' && (
          <p className="mt-4 text-center text-sm text-red-600">{error}</p>
        )}
      </div>

      <AnimatePresence>
        {showNewPost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            onClick={() => setShowNewPost(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-text-primary">New Post</h2>
                <button
                  type="button"
                  onClick={() => setShowNewPost(false)}
                  className="rounded-full p-1 text-text-muted hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreatePost} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-primary">Category</label>
                  <select
                    value={postCategory}
                    onChange={(e) => setPostCategory(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none"
                  >
                    {POST_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-primary">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={200}
                    required
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none"
                    placeholder="What's on your mind?"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-primary">Content</label>
                  <textarea
                    rows={5}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required
                    className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none"
                    placeholder="Share your experience or question…"
                  />
                </div>
                {error && submitStatus === 'failed' && (
                  <p className="text-sm text-red-600">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting || !title.trim() || !content.trim()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Publish Post
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const WHISPERS = [
  { text: 'I love my baby. I miss who I was. Both are true.', when: '3 days postpartum' },
  { text: "Cried in the shower again. He didn't notice. Maybe that's okay.", when: '2 weeks postpartum' },
  { text: "It's 3am and I'm Googling whether this is normal. I hope it is.", when: '6 days postpartum' },
  { text: "I haven't told anyone how scared I am. I'm telling you.", when: '11 days postpartum' },
]

function EmptyForum({ activeCategory, onCreate }: { activeCategory: string; onCreate: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-2xl bg-white px-6 py-12 card-shadow-sm"
    >
      <div className="mx-auto max-w-xl text-center">
        <h2 className="text-xl font-bold text-text-primary">
          {activeCategory === 'All' ? "You're the first one here right now." : `Nothing in ${activeCategory} yet.`}
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          But you're not the first to feel what you're feeling. Recent whispers from other mothers:
        </p>
      </div>

      <div className="mx-auto mt-8 max-w-xl space-y-3">
        {WHISPERS.map((w, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.08 }}
            className="flex gap-3 rounded-xl border border-gray-100 bg-cream/50 px-4 py-3"
          >
            <span className="text-2xl leading-none text-brand/40">"</span>
            <div className="flex-1">
              <p className="text-sm leading-relaxed text-text-primary">{w.text}</p>
              <p className="mt-1 text-xs italic text-text-muted">— Anonymous, {w.when}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mx-auto mt-8 max-w-xl text-center">
        <p className="text-sm text-text-secondary">
          Your turn, when you're ready.
        </p>
        <button
          type="button"
          onClick={onCreate}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
        >
          Write something
        </button>
      </div>
    </motion.div>
  )
}
