import { useCallback, useRef, useState } from 'react'

// The Web Speech API isn't part of the standard DOM lib (it's still not a
// finalized W3C spec), so TypeScript has no ambient types for it — declaring
// only the surface actually used here, instead of reaching for `any`.
interface SpeechRecognitionResultLike {
  transcript: string
}
interface SpeechRecognitionEventLike {
  results: ArrayLike<ArrayLike<SpeechRecognitionResultLike>>
}
interface SpeechRecognitionLike {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}
interface SpeechRecognitionConstructorLike {
  new (): SpeechRecognitionLike
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructorLike
    webkitSpeechRecognition?: SpeechRecognitionConstructorLike
  }
}

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructorLike | undefined {
  if (typeof window === 'undefined') return undefined
  return window.SpeechRecognition ?? window.webkitSpeechRecognition
}

// No iOS Safari support as of writing (patchy/absent Web Speech API) —
// isSupported feature-detects so the mic affordance simply doesn't render
// there, rather than showing a control that would never work.
export function useSpeechToText(onResult: (transcript: string) => void) {
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)

  const isSupported = getSpeechRecognitionConstructor() !== undefined

  const startListening = useCallback(() => {
    const SpeechRecognitionCtor = getSpeechRecognitionConstructor()
    if (!SpeechRecognitionCtor) return

    setError(null)
    const recognition = new SpeechRecognitionCtor()
    recognition.lang = 'fr-FR'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? ''
      onResult(transcript)
    }
    recognition.onerror = () => {
      setError('Non reconnu, réessaie ou saisis manuellement.')
    }
    recognition.onend = () => setIsListening(false)

    recognitionRef.current = recognition
    setIsListening(true)
    recognition.start()
  }, [onResult])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  return { isSupported, isListening, error, startListening, stopListening }
}
