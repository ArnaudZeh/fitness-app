import { useSpeechToText } from '@/hooks/useSpeechToText'
import { parseVoiceSetInput, type ParsedSetInput } from '@/lib/voice-set-parser'

export function useVoiceSetInput(onResult: (parsed: ParsedSetInput) => void) {
  return useSpeechToText((transcript) => onResult(parseVoiceSetInput(transcript)))
}
