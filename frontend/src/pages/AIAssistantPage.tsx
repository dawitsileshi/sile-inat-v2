import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Send, Baby, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDispatch, useSelector } from 'react-redux'
import { addUserMessage, sendMessageToAI } from '@/store/chatSlice'
import { getAnonymousClientId } from '@/lib/clientId'
import type { AppDispatch, RootState } from '@/store/store'

const suggestions = [
  'How do I manage postpartum anxiety?',
  'Tips for establishing a sleep routine',
  'Is this breastfeeding pain normal?',
]

export function AIAssistantPage() {
  const dispatch = useDispatch<AppDispatch>()
  const { messages, status, error } = useSelector((state: RootState) => state.chat)
  const [input, setInput] = useState('')
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

  const isLoading = status === 'loading'

  return (
    <div className="flex min-h-[calc(100vh-72px)] flex-col px-6 pb-32">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col py-12">
        {messages.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-1 flex-col items-center justify-center text-center"
          >
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-light">
              <Baby className="h-6 w-6 text-brand" />
            </div>
            <h1 className="text-2xl font-bold text-text-primary">Welcome to your AI support companion</h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-text-secondary">
              Ask anything about postpartum recovery, breastfeeding, newborn care, mental health, or sleep. I'm here to provide evidence-based guidance.
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
          <div className="flex flex-1 flex-col gap-4">
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

      <div className="fixed inset-x-0 bottom-0 border-t border-black/[0.04] bg-cream/95 backdrop-blur-md">
        <div className="mx-auto max-w-2xl px-6 py-4">
          {error && (
            <p className="mb-2 text-center text-xs text-red-600">{error}</p>
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
            AI guidance is for informational purposes only. Always consult your healthcare provider for medical advice.
          </p>
        </div>
      </div>
    </div>
  )
}
