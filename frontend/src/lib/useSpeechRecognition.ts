import { useEffect, useRef, useState } from 'react'

// The browser's Web Speech API ships under two names — `SpeechRecognition`
// in Chrome/Edge and `webkitSpeechRecognition` in Safari. We grab whichever
// is present at runtime.
type SpeechRecognitionEvent = {
  resultIndex: number
  results: {
    length: number
    [index: number]: {
      isFinal: boolean
      [index: number]: { transcript: string }
    }
  }
}

type SpeechRecognitionLike = {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: { error: string; message?: string }) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
  onaudiostart: (() => void) | null
  onaudioend: (() => void) | null
  onspeechstart: (() => void) | null
  onspeechend: (() => void) | null
  onnomatch: (() => void) | null
}

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike
    webkitSpeechRecognition?: new () => SpeechRecognitionLike
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export interface SpeechRecognitionState {
  /** True when this browser provides any form of Web Speech API. */
  supported: boolean
  /** True while the microphone is actively capturing audio. */
  listening: boolean
  /** Finalised transcript so far this session — never includes interim words. */
  transcript: string
  /** Words the engine is still considering. Useful for live-typing feedback. */
  interim: string
  /** Last error key from the underlying API, if any. */
  error: string | null
  start: () => void
  stop: () => void
  reset: () => void
}

/**
 * Thin hook around the browser's Web Speech API. Streams accumulating
 * `transcript` (finalised) plus an `interim` preview of words still being
 * decided. Callers should plumb both into their UI.
 */
export function useSpeechRecognition({ lang }: { lang: string }): SpeechRecognitionState {
  const [supported, setSupported] = useState<boolean>(() => !!getSpeechRecognitionCtor())
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)

  useEffect(() => {
    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) {
      setSupported(false)
      return
    }
    setSupported(true)

    const recognition = new Ctor()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = lang

    const log = (event: string, detail?: unknown) =>
      // eslint-disable-next-line no-console
      console.log(`[speech] ${event}`, detail ?? '')

    recognition.onstart = () => log('start', { lang })
    recognition.onaudiostart = () => log('audiostart')
    recognition.onspeechstart = () => log('speechstart')
    recognition.onspeechend = () => log('speechend')
    recognition.onaudioend = () => log('audioend')
    recognition.onnomatch = () => log('nomatch')

    recognition.onresult = (event) => {
      const dump: Array<{ i: number; isFinal: boolean; chunk: string; len: number }> = []
      let finalised = ''
      let stillThinking = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const segment = event.results[i]
        const chunk = segment[0].transcript
        dump.push({ i, isFinal: segment.isFinal, chunk, len: chunk.length })
        if (segment.isFinal) {
          finalised += chunk
        } else {
          stillThinking += chunk
        }
      }
      log('result', { resultIndex: event.resultIndex, length: event.results.length, segments: dump, finalised, stillThinking })
      if (finalised) {
        setTranscript((prev) => (prev ? prev + ' ' + finalised.trim() : finalised.trim()))
      }
      setInterim(stillThinking)
    }

    recognition.onerror = (event) => {
      log('error', { error: event.error, message: event.message })
      setError(event.error || 'unknown')
      setListening(false)
    }

    recognition.onend = () => {
      log('end')
      setListening(false)
      setInterim('')
    }

    recognitionRef.current = recognition
    return () => {
      try { recognition.stop() } catch { /* already stopped */ }
      recognitionRef.current = null
    }
  }, [lang])

  function start() {
    const recognition = recognitionRef.current
    if (!recognition || listening) return
    setError(null)
    try {
      recognition.start()
      setListening(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed to start')
    }
  }

  function stop() {
    recognitionRef.current?.stop()
    setListening(false)
  }

  function reset() {
    setTranscript('')
    setInterim('')
    setError(null)
  }

  return { supported, listening, transcript, interim, error, start, stop, reset }
}
