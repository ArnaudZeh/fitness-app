import { describe, expect, it } from 'vitest'
import { parseVoiceSetInput } from '@/lib/voice-set-parser'

describe('parseVoiceSetInput', () => {
  it('extracts weight and reps with explicit keywords', () => {
    expect(parseVoiceSetInput('80 kilos 8 reps')).toEqual({
      weightKg: 80,
      reps: 8,
      rpe: null,
    })
  })

  it('extracts weight, reps and RPE together', () => {
    expect(parseVoiceSetInput('80 kg, 8 répétitions, rpe 8')).toEqual({
      weightKg: 80,
      reps: 8,
      rpe: 8,
    })
  })

  it('handles RPE said before the number', () => {
    expect(parseVoiceSetInput('80 kilos 8 reps rpe 9')).toEqual({
      weightKg: 80,
      reps: 8,
      rpe: 9,
    })
  })

  it('handles a French decimal comma', () => {
    expect(parseVoiceSetInput('82,5 kilos 5 reps')).toEqual({
      weightKg: 82.5,
      reps: 5,
      rpe: null,
    })
  })

  it('falls back to first number = charge, second = reps with no keywords', () => {
    expect(parseVoiceSetInput('80 8')).toEqual({ weightKg: 80, reps: 8, rpe: null })
  })

  it('extracts only the weight when reps are not mentioned', () => {
    expect(parseVoiceSetInput('80 kilos')).toEqual({
      weightKg: 80,
      reps: null,
      rpe: null,
    })
  })

  it('returns all nulls for an unrecognizable transcript', () => {
    expect(parseVoiceSetInput('je ne sais pas')).toEqual({
      weightKg: null,
      reps: null,
      rpe: null,
    })
  })

  it('is case-insensitive', () => {
    expect(parseVoiceSetInput('80 KILOS 8 REPS')).toEqual({
      weightKg: 80,
      reps: 8,
      rpe: null,
    })
  })
})
