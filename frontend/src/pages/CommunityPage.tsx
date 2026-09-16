import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, ArrowLeft, Loader2, Send, HandHeart } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { cn } from '@/lib/utils'
import { useDispatch, useSelector } from 'react-redux'
import {
  FORUM_CATEGORIES,
  fetchPosts,
  fetchPostDetail,
  createPost,
  createReply,
  reactToPost,
  optimisticToggleReaction,
  setActiveCategory,
  clearSelectedPost,
  type ForumCategory,
  type ForumPost,
} from '@/store/forumSlice'
import { getAnonymousClientId } from '@/lib/clientId'
import type { AppDispatch, RootState } from '@/store/store'

const POST_CATEGORIES = FORUM_CATEGORIES.filter((c) => c !== 'All')

// Category values are what the backend stores, so they stay in English;
// the label comes from forum.categories.<camelCase value>.
function categoryLabel(cat: string, t: TFunction): string {
  const key = cat.charAt(0).toLowerCase() + cat.slice(1).replace(/ /g, '')
  return t(`forum.categories.${key}`, { defaultValue: cat })
}

function reactionLabel(count: number, reacted: boolean, t: TFunction): string {
  if (count === 0) return reacted ? t('forum.reaction.youBeenHere') : t('forum.reaction.iveBeenThere')
  if (reacted) {
    if (count === 1) return t('forum.reaction.youBeenHere')
    return t('forum.reaction.youAndOthers', { count: count - 1 })
  }
  return t('forum.reaction.mothersBeenHere', { count })
}

function IveBeenThereButton({
  post,
  onToggle,
  size = 'sm',
}: {
  post: ForumPost
  onToggle: () => void
  size?: 'sm' | 'md'
}) {
  const { t } = useTranslation()
  const padding = size === 'md' ? 'px-4 py-2 text-sm' : 'px-3 py-1.5 text-xs'
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      aria-pressed={post.reacted}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border font-medium transition-colors',
        padding,
        post.reacted
          ? 'border-brand bg-brand-light text-brand'
          : 'border-gray-200 bg-white text-text-secondary hover:border-brand/40 hover:text-brand'
      )}
    >
      <HandHeart
        className={cn(
          size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5',
          post.reacted ? 'fill-brand/20' : ''
        )}
      />
      <span>{reactionLabel(post.reaction_count, post.reacted, t)}</span>
    </button>
  )
}

function formatDate(iso: string, t: TFunction) {
  try {
    const then = new Date(iso).getTime()
    if (Number.isNaN(then)) return iso
    const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000))
    if (diffSec < 60) return t('time.justNow')
    const diffMin = Math.floor(diffSec / 60)
    if (diffMin < 60) return t('time.minutesAgo', { count: diffMin })
    const diffHr = Math.floor(diffMin / 60)
    if (diffHr < 24) return t('time.hoursAgo', { count: diffHr })
    const diffDay = Math.floor(diffHr / 24)
    if (diffDay < 7) return t('time.daysAgo', { count: diffDay })
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
  const { t } = useTranslation()

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

  function handleToggleReaction(postId: number) {
    dispatch(optimisticToggleReaction(postId))
    dispatch(reactToPost(postId))
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
            {t('forum.backToForum')}
          </button>

          <motion.article
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-white p-6 card-shadow-sm"
          >
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-brand-light px-3 py-0.5 text-xs font-medium text-brand">
                {categoryLabel(selectedPost.category, t)}
              </span>
              <span className="text-xs text-text-muted">{formatDate(selectedPost.created_at, t)}</span>
              <span className="text-xs text-text-secondary">· {selectedPost.author_label}</span>
            </div>
            <h1 className="text-2xl font-bold text-text-primary">{selectedPost.title}</h1>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
              {selectedPost.content}
            </p>
            <div className="mt-5">
              <IveBeenThereButton
                post={selectedPost}
                size="md"
                onToggle={() => handleToggleReaction(selectedPost.id)}
              />
            </div>
          </motion.article>

          <h2 className="mt-8 mb-4 text-lg font-bold text-text-primary">
            {t('forum.replies', { count: selectedPost.replies?.length ?? 0 })}
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
                  <span>· {formatDate(reply.created_at, t)}</span>
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
              placeholder={t('forum.replyPlaceholder')}
              className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={!replyText.trim() || isSubmitting}
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {t('forum.postReply')}
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
            <h1 className="text-4xl font-extrabold tracking-tight text-text-primary">{t('forum.title')}</h1>
            <p className="mt-2 text-base text-text-secondary">
              {t('forum.subtitle')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowNewPost(true)}
            className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
          >
            <Plus className="h-4 w-4" />
            {t('forum.newPost')}
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
                  : 'bg-stone-100 text-text-secondary hover:bg-stone-200'
              )}
            >
              {cat === 'All' ? t('forum.allTopics') : categoryLabel(cat, t)}
            </button>
          ))}
        </div>

        {isLoading && posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
            <Loader2 className="h-8 w-8 animate-spin text-brand mb-3" />
            <p>{t('forum.loadingPosts')}</p>
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
                    {categoryLabel(post.category, t)}
                  </span>
                  <span className="text-xs text-text-muted">{formatDate(post.created_at, t)}</span>
                  <span className="text-xs text-text-secondary">· {post.author_label}</span>
                </div>
                <h3 className="text-lg font-bold text-text-primary">{post.title}</h3>
                <p className="mt-2 line-clamp-2 text-sm text-text-secondary">{post.content}</p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs font-medium text-text-muted">
                    {t('forum.replyCount', { count: post.reply_count })}
                  </p>
                  <IveBeenThereButton
                    post={post}
                    onToggle={() => handleToggleReaction(post.id)}
                  />
                </div>
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
                <h2 className="text-xl font-bold text-text-primary">{t('forum.newPost')}</h2>
                <button
                  type="button"
                  onClick={() => setShowNewPost(false)}
                  className="rounded-full p-1 text-text-muted hover:bg-gray-100"
                  aria-label={t('common.close')}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreatePost} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-primary">{t('forum.category')}</label>
                  <select
                    value={postCategory}
                    onChange={(e) => setPostCategory(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none"
                  >
                    {POST_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{categoryLabel(c, t)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-primary">{t('forum.postTitle')}</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={200}
                    required
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none"
                    placeholder={t('forum.titlePlaceholder')}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-primary">{t('forum.content')}</label>
                  <textarea
                    rows={5}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required
                    className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none"
                    placeholder={t('forum.contentPlaceholder')}
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
                  {t('forum.publish')}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function EmptyForum({ activeCategory, onCreate }: { activeCategory: string; onCreate: () => void }) {
  const { t } = useTranslation()
  const whispers = t('forum.empty.whispers', { returnObjects: true }) as { text: string; when: string }[]
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-2xl bg-white px-6 py-12 card-shadow-sm"
    >
      <div className="mx-auto max-w-xl text-center">
        <h2 className="text-xl font-bold text-text-primary">
          {activeCategory === 'All'
            ? t('forum.empty.firstHere')
            : t('forum.empty.nothingIn', { category: categoryLabel(activeCategory, t) })}
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          {t('forum.empty.notFirst')}
        </p>
      </div>

      <div className="mx-auto mt-8 max-w-xl space-y-3">
        {whispers.map((w, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.08 }}
            className="flex gap-3 rounded-xl border border-gray-100 bg-stone-50 px-4 py-3"
          >
            <span className="text-2xl leading-none text-brand/40">"</span>
            <div className="flex-1">
              <p className="text-sm leading-relaxed text-text-primary">{w.text}</p>
              <p className="mt-1 text-xs italic text-text-muted">— {t('forum.empty.anonymous', { when: w.when })}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mx-auto mt-8 max-w-xl text-center">
        <p className="text-sm text-text-secondary">
          {t('forum.empty.yourTurn')}
        </p>
        <button
          type="button"
          onClick={onCreate}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
        >
          {t('forum.empty.write')}
        </button>
      </div>
    </motion.div>
  )
}
