import { useCallback, useState } from 'react'

export function useTextToSpeech() {
  const [speakingId, setSpeakingId] = useState<string | null>(null)

  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

  const stop = useCallback(() => {
    if (!isSupported) return
    window.speechSynthesis.cancel()
    setSpeakingId(null)
  }, [isSupported])

  const speak = useCallback(
    (id: string, text: string) => {
      if (!isSupported) return
      // Only one utterance at a time — starting a new one always cancels
      // whatever's currently playing rather than queuing behind it.
      window.speechSynthesis.cancel()
      if (speakingId === id) {
        setSpeakingId(null)
        return
      }
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'fr-FR'
      utterance.onend = () => setSpeakingId(null)
      utterance.onerror = () => setSpeakingId(null)
      setSpeakingId(id)
      window.speechSynthesis.speak(utterance)
    },
    [isSupported, speakingId],
  )

  return { isSupported, speakingId, speak, stop }
}
