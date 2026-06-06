import { useState } from 'react'
import { motion } from 'framer-motion'
import { Frown, Meh, Smile, Laugh, Heart as HeartIcon, Zap, Moon, SmilePlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDispatch, useSelector } from 'react-redux'
import { submitDailyLog, ensureAuth } from '@/store/trackerSlice'
import { useNavigate } from 'react-router-dom'
import type { AppDispatch, RootState } from '@/store/store'

const moods = [
  { value: 'rough', label: 'Rough', Icon: Frown, color: 'text-[#c4456b]' },
  { value: 'low', label: 'Low', Icon: Frown, color: 'text-[#c98a1f]' },
  { value: 'okay', label: 'Okay', Icon: Meh, color: 'text-[#d6a02f]' },
  { value: 'good', label: 'Good', Icon: Smile, color: 'text-[#5a9d6a]' },
  { value: 'great', label: 'Great', Icon: Laugh, color: 'text-brand' },
]

const energyLabels = ['Exhausted', 'Tired', 'Okay', 'Energized', 'Vibrant']

const MOOD_TO_SCORE: Record<string, number> = {
  rough: 5,
  low: 4,
  okay: 3,
  good: 2,
  great: 1,
}

function energyToSymptomScore(energy: number): number {
  if (energy < 20) return 5
  if (energy < 40) return 4
  if (energy < 60) return 3
  if (energy < 80) return 2
  return 1
}

export function CheckInPage() {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { status, error } = useSelector((state: RootState) => state.tracker)

  const [mood, setMood] = useState('okay')
  const [energy, setEnergy] = useState(50)
  const [sleep, setSleep] = useState(6)
  const [water, setWater] = useState(2)
  const [note, setNote] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const energyBucket = energyLabels[Math.min(4, Math.floor(energy / 20))]
  const currentMood = moods.find((m) => m.value === mood)!

  return (
    <div className="px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-light">
            <SmilePlus className="h-6 w-6 text-brand" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-text-primary">Daily Wellness Check-In</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Take a moment to reflect on how you're feeling today
          </p>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onSubmit={async (e) => {
            e.preventDefault()
            setSubmitted(false)

            const authResult = await dispatch(ensureAuth())
            if (!ensureAuth.fulfilled.match(authResult)) return

            const resultAction = await dispatch(submitDailyLog({
              gestational_week: 20,
              sleep_hours: sleep,
              water_liters: water,
              symptom_score: energyToSymptomScore(energy),
              mood_score: MOOD_TO_SCORE[mood] ?? 3,
            }))
            if (submitDailyLog.fulfilled.match(resultAction)) {
              setSubmitted(true)
              setTimeout(() => navigate('/dashboard'), 1500)
            }
          }}
          className="rounded-2xl bg-white p-8 card-shadow"
        >
          <div className="mb-8">
            <div className="mb-4 flex items-center justify-between">
              <label className="text-base font-semibold text-text-primary">How are you feeling today?</label>
              <span className="flex items-center gap-1.5 text-sm font-medium text-text-secondary">
                <currentMood.Icon className={cn('h-4 w-4', currentMood.color)} />
                {currentMood.label}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {moods.map((m) => {
                const active = mood === m.value
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMood(m.value)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 rounded-xl border-2 px-2 py-3 transition-all',
                      active
                        ? 'border-brand bg-brand-light'
                        : 'border-transparent hover:bg-cream-dark/50'
                    )}
                  >
                    <m.Icon className={cn('h-7 w-7', m.color)} />
                    <span className="text-xs font-medium text-text-secondary">{m.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mb-8">
            <div className="mb-3 flex items-center justify-between">
              <label className="text-base font-semibold text-text-primary">Energy level</label>
              <span className="flex items-center gap-1.5 text-sm font-medium text-text-secondary">
                <Zap className="h-4 w-4 text-brand" />
                {energyBucket}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={energy}
              onChange={(e) => setEnergy(Number(e.target.value))}
              className="wellness-slider"
              style={{ background: `linear-gradient(to right, var(--color-brand) 0%, var(--color-brand) ${energy}%, var(--color-brand-light) ${energy}%, var(--color-brand-light) 100%)` }}
            />
            <div className="mt-2 flex justify-between text-xs text-text-secondary">
              <span>Exhausted</span>
              <span>Vibrant</span>
            </div>
          </div>

          <div className="mb-8">
            <div className="mb-3 flex items-center justify-between">
              <label className="text-base font-semibold text-text-primary">Hours of sleep</label>
              <span className="flex items-center gap-1.5 text-sm font-medium text-text-secondary">
                <Moon className="h-4 w-4 text-brand" />
                {sleep}h
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={12}
              value={sleep}
              onChange={(e) => setSleep(Number(e.target.value))}
              className="wellness-slider"
              style={{ background: `linear-gradient(to right, var(--color-brand) 0%, var(--color-brand) ${(sleep / 12) * 100}%, var(--color-brand-light) ${(sleep / 12) * 100}%, var(--color-brand-light) 100%)` }}
            />
            <div className="mt-2 flex justify-between text-xs text-text-secondary">
              <span>0h</span>
              <span>12h</span>
            </div>
          </div>

          <div className="mb-8">
            <div className="mb-3 flex items-center justify-between">
              <label className="text-base font-semibold text-text-primary">Water intake</label>
              <span className="text-sm font-medium text-text-secondary">{water.toFixed(1)} L</span>
            </div>
            <input
              type="range"
              min={0}
              max={5}
              step={0.1}
              value={water}
              onChange={(e) => setWater(Number(e.target.value))}
              className="wellness-slider"
              style={{
                background: `linear-gradient(to right, var(--color-brand) 0%, var(--color-brand) ${(water / 5) * 100}%, var(--color-brand-light) ${(water / 5) * 100}%, var(--color-brand-light) 100%)`,
              }}
            />
            <div className="mt-2 flex justify-between text-xs text-text-secondary">
              <span>0 L</span>
              <span>5 L</span>
            </div>
          </div>

          <div className="mb-8">
            <label htmlFor="note" className="mb-2 block text-base font-semibold text-text-primary">
              Anything on your mind? <span className="font-normal text-text-muted">(optional)</span>
            </label>
            <textarea
              id="note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Write a few words about your day..."
              className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none"
            />
          </div>

          {error && status === 'failed' && (
            <p className="mb-4 text-center text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={status === 'loading'}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
          >
            <HeartIcon className="h-4 w-4" />
            {status === 'loading' ? 'Saving…' : submitted ? 'Check-in saved!' : 'Submit Check-In'}
          </button>
        </motion.form>
      </div>
    </div>
  )
}
