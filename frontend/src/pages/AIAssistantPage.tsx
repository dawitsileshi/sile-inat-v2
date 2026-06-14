import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Baby, Loader2, Plus, ChevronDown, ChevronUp, MessageCircle, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDispatch, useSelector } from 'react-redux'
import {
  addUserMessage, sendMessageToAI, startNewChat,
  loadPastChat, deletePastChat,
} from '@/store/chatSlice'
import { getAnonymousClientId } from '@/lib/clientId'
import type { AppDispatch, RootState } from '@/store/store'

const suggestions = [
  'Is it normal to regret having a baby?',
  'How do I know if it\'s postpartum depression?',
  'Why am I crying for no reason?',
  'I don\'t feel like a mother yet. What\'s wrong with me?',
]

function formatRelative(iso: string): string {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const diffSec = Math.max(0, Math.floor((Date.now() - t) / 1000))
  if (diffSec < 60) return 'just now'
  const m = Math.floor(diffSec / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} ${h === 1 ? 'hour' : 'hours'} ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d} ${d === 1 ? 'day' : 'days'} ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function AIAssistantPage() {
  const dispatch = useDispatch<AppDispatch>()
  const { messages, pastChats, status, error } = useSelector(
    (state: RootState) => state.chat
  )
  const [input, setInput] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getAnonymousClientId()
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, status])

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || status === 'loading') return
    dispatch(addUserMessage(trimmed))
    setInput('')
    await dispatch(sendMessageToAI(trimmed))
  }

  function handleNewChat() {
    dispatch(startNewChat())
    setHistoryOpen(false)
  }

  function handleLoad(id: string) {
    dispatch(loadPastChat(id))
    setHistoryOpen(false)
  }

  const isLoading = status === 'loading'

  return (
    <div className="flex min-h-[calc(100vh-72px)] flex-col px-6 pb-32">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col py-8">
        <ChatToolbar
          activeCount={messages.length}
          pastChats={pastChats}
          historyOpen={historyOpen}
          onToggleHistory={() => setHistoryOpen((v) => !v)}
          onNewChat={handleNewChat}
          onLoadPastChat={handleLoad}
          onDeletePastChat={(id) => dispatch(deletePastChat(id))}
        />

        {messages.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-1 flex-col items-center justify-center text-center"
          >
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-light">
              <Baby className="h-6 w-6 text-brand" />
            </div>
            <h1 className="text-2xl font-bold text-text-primary">
              Ask me what you'd ask a friend who's been through this.
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-text-secondary">
              Not what you'd ask a doctor. I'll listen, share what's been studied,
              and never make you feel ashamed for asking.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  disabled={isLoading}
                  className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-text-secondary transition-colors hover:border-brand hover:text-brand disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <div className="mt-4 flex flex-1 flex-col gap-4">
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                  m.role === 'user'
                    ? 'self-end bg-brand text-white'
                    : 'self-start bg-white text-text-primary card-shadow-sm'
                )}
              >
                {m.text}
              </motion.div>
            ))}
            {isLoading && (
              <div className="self-start flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm text-text-secondary card-shadow-sm">
                <Loader2 className="h-4 w-4 animate-spin text-brand" />
                Thinking…
              </div>
            )}
            <div ref={endRef} />
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-black/[0.04] bg-white/95 backdrop-blur-md">
        <div className="mx-auto max-w-2xl px-6 py-4">
          {error && (
            <p className="mb-2 text-center text-xs text-text-secondary">{error}</p>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              send(input)
            }}
            className="flex items-center gap-2 rounded-full border border-gray-200 bg-white py-2 pl-5 pr-2 focus-within:border-brand"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about postpartum support..."
              disabled={isLoading}
              className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none disabled:opacity-60"
            />
            <button
              type="submit"
              aria-label="Send"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
              disabled={!input.trim() || isLoading}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
          <p className="mt-2 text-center text-xs text-text-muted">
            I can listen. I can share what's been studied. I can't replace your
            doctor — and won't pretend to.
          </p>
        </div>
      </div>
    </div>
  )
}

function ChatToolbar({
  activeCount, pastChats, historyOpen,
  onToggleHistory, onNewChat, onLoadPastChat, onDeletePastChat,
}: {
  activeCount: number
  pastChats: { id: string; messages: { role: 'user' | 'ai'; text: string; ts?: string }[]; endedAt: string }[]
  historyOpen: boolean
  onToggleHistory: () => void
  onNewChat: () => void
  onLoadPastChat: (id: string) => void
  onDeletePastChat: (id: string) => void
}) {
  const hasHistory = pastChats.length > 0
  return (
    <div className="rounded-2xl bg-white/60 px-4 py-3 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onNewChat}
          disabled={activeCount === 0}
          className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" />
          New chat
        </button>

        {hasHistory && (
          <button
            type="button"
            onClick={onToggleHistory}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-brand"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Previous chats ({pastChats.length})
            {historyOpen ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {historyOpen && hasHistory && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-3 space-y-2 overflow-hidden"
          >
            {pastChats.map((c) => {
              const firstUser = c.messages.find((m) => m.role === 'user')
              const preview = firstUser?.text ?? '(no message)'
              return (
                <li
                  key={c.id}
                  className="flex items-start gap-2 rounded-xl border border-gray-100 bg-white px-3 py-2"
                >
                  <button
                    type="button"
                    onClick={() => onLoadPastChat(c.id)}
                    className="flex-1 text-left"
                  >
                    <p className="line-clamp-1 text-sm text-text-primary">{preview}</p>
                    <p className="mt-0.5 text-xs text-text-muted">
                      {c.messages.length} {c.messages.length === 1 ? 'message' : 'messages'}
                      {' · '}
                      {formatRelative(c.endedAt)}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeletePastChat(c.id)}
                    aria-label="Delete this chat"
                    className="flex-none rounded-full p-1.5 text-text-muted hover:bg-stone-100 hover:text-text-primary"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              )
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
