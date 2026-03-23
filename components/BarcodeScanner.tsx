'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, X } from 'lucide-react'

interface BarcodeScannerProps {
  onScan: (barcode: string) => void
  onClose: () => void
  statusMessage?: string
}

export default function BarcodeScanner({ onScan, onClose, statusMessage }: BarcodeScannerProps) {
  const [error, setError] = useState<string | null>(null)
  const [manualCode, setManualCode] = useState('')
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null)
  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    const start = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode')
        const scanner = new Html5Qrcode('barcode-reader')
        scannerRef.current = scanner

        await scanner.start(
          { facingMode: 'environment' }, // rear camera on mobile
          { fps: 10, qrbox: { width: 250, height: 150 } },
          (decodedText: string) => { onScan(decodedText) },
          () => { /* ignore per-frame no-result errors */ }
        )
      } catch {
        setError('Could not access camera. Please allow camera permissions or enter the code manually.')
      }
    }

    start()

    return () => {
      const s = scannerRef.current
      if (s) {
        s.stop().catch(() => {}).finally(() => { try { s.clear() } catch { /* ignore */ } })
      }
    }
  }, [onScan])

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (manualCode.trim()) onScan(manualCode.trim())
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-blue-700 text-white">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            <span className="font-semibold">Scan Barcode</span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-blue-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4">
          {error ? (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm mb-4">
              {error}
            </div>
          ) : (
            <>
              <div id="barcode-reader" className="w-full rounded-lg overflow-hidden" />
              {statusMessage ? (
                <p className="text-center text-sm font-medium text-green-600 mt-2">{statusMessage} — scan next item or close</p>
              ) : (
                <p className="text-center text-sm text-gray-500 mt-2">Point camera at barcode or QR code</p>
              )}
            </>
          )}

          {/* Manual entry fallback */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 mb-2">Or enter barcode manually:</p>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                placeholder="Barcode / SKU"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-blue-700"
              >
                Lookup
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
