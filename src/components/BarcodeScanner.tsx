import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { FoodSelection } from '@/components/OpenFoodFactsSearch'
import { Button } from '@/components/ui/button'
import { fetchProductByBarcode } from '@/lib/openfoodfacts-api'

// BarcodeDetector isn't part of the standard DOM lib (still a Chrome-only
// draft API, no Safari support) — declaring only the surface actually used
// here, same approach as useSpeechToText.ts's SpeechRecognition types.
interface DetectedBarcodeLike {
  rawValue: string
}
interface BarcodeDetectorLike {
  detect: (source: HTMLVideoElement) => Promise<DetectedBarcodeLike[]>
}
interface BarcodeDetectorConstructorLike {
  new (options: { formats: string[] }): BarcodeDetectorLike
}

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructorLike
  }
}

interface BarcodeScannerProps {
  onSelect: (selection: FoodSelection) => void
}

type ScanStatus = 'scanning' | 'looking-up' | 'not-found' | 'error'

// EAN/UPC cover virtually every retail food barcode — narrower than
// BarcodeDetector's full format list, which also includes QR/Aztec/PDF417
// that a food product would never carry, so there's no reason to pay their
// (small) extra detection cost.
const BARCODE_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e']

export function BarcodeScanner({ onSelect }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState<ScanStatus>('scanning')
  const [cameraError, setCameraError] = useState<string | null>(null)

  // Always-latest-callback ref, set in its own effect (not during render) —
  // lets the camera/detection effect below depend only on `status`, instead
  // of restarting the camera on every parent re-render just because
  // AddFoodLogDialog's onSelect prop is a fresh function each time.
  const onSelectRef = useRef(onSelect)
  useEffect(() => {
    onSelectRef.current = onSelect
  })

  useEffect(() => {
    if (status !== 'scanning') return
    let cancelled = false
    let stream: MediaStream | null = null
    let detectionTimer: ReturnType<typeof setTimeout> | undefined
    let zxingControls: { stop: () => void } | undefined

    async function lookup(barcode: string) {
      setStatus('looking-up')
      try {
        const result = await fetchProductByBarcode(barcode)
        if (cancelled) return
        if (!result) {
          setStatus('not-found')
          return
        }
        onSelectRef.current({
          name: result.name,
          caloriesPer100g: result.caloriesPer100g,
          proteinPer100g: result.proteinPer100g,
          carbsPer100g: result.carbsPer100g,
          fatPer100g: result.fatPer100g,
        })
      } catch {
        if (!cancelled) setStatus('error')
      }
    }

    async function startNative(detectorCtor: BarcodeDetectorConstructorLike) {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      if (cancelled || !videoRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }
      videoRef.current.srcObject = stream
      await videoRef.current.play()
      const detector = new detectorCtor({ formats: BARCODE_FORMATS })

      const tick = async () => {
        if (cancelled || !videoRef.current) return
        try {
          const barcodes = await detector.detect(videoRef.current)
          const value = barcodes[0]?.rawValue
          if (value) {
            void lookup(value)
            return
          }
        } catch {
          // Per-frame detection failure — normal while no barcode is in
          // view yet, just retry next tick rather than surfacing an error.
        }
        detectionTimer = setTimeout(() => void tick(), 300)
      }
      detectionTimer = setTimeout(() => void tick(), 300)
    }

    async function startFallback() {
      const { BrowserMultiFormatReader } = await import('@zxing/browser')
      if (cancelled || !videoRef.current) return
      const reader = new BrowserMultiFormatReader()
      zxingControls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result) => {
          if (result && !cancelled) {
            zxingControls?.stop()
            void lookup(result.getText())
          }
        },
      )
    }

    async function start() {
      try {
        const detectorCtor = window.BarcodeDetector
        if (detectorCtor) {
          await startNative(detectorCtor)
        } else {
          await startFallback()
        }
      } catch {
        if (!cancelled) setCameraError("Impossible d'accéder à la caméra.")
      }
    }
    void start()

    return () => {
      cancelled = true
      if (detectionTimer !== undefined) clearTimeout(detectionTimer)
      zxingControls?.stop()
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [status])

  function retry() {
    setCameraError(null)
    setStatus('scanning')
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md bg-black">
        <video ref={videoRef} className="size-full object-cover" muted playsInline />
        {status === 'looking-up' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Loader2 className="size-6 animate-spin text-white" />
          </div>
        )}
      </div>
      {status === 'scanning' && !cameraError && (
        <p className="text-xs text-muted-foreground">Vise le code-barres du produit.</p>
      )}
      {cameraError && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-destructive">{cameraError}</p>
          <Button type="button" variant="outline" size="sm" onClick={retry} className="self-start">
            Réessayer
          </Button>
        </div>
      )}
      {status === 'not-found' && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            Ce produit n'est pas référencé sur OpenFoodFacts. Essaie la photo de l'étiquette, ou
            saisis les valeurs toi-même.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={retry} className="self-start">
            Réessayer
          </Button>
        </div>
      )}
      {status === 'error' && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-destructive">Recherche indisponible pour le moment.</p>
          <Button type="button" variant="outline" size="sm" onClick={retry} className="self-start">
            Réessayer
          </Button>
        </div>
      )}
    </div>
  )
}
