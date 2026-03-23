'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Camera, X, ZoomIn, ZoomOut } from 'lucide-react'

interface BarcodeScannerProps {
  onScan: (barcode: string) => void
  onClose: () => void
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const scannerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const scannerInstanceRef = useRef<unknown>(null)

  const startScanner = useCallback(async () => {
    if (!scannerRef.current) return
    setError(null)
    setScanning(true)

    try {
      const { Html5QrcodeScanner } = await import('html5-qrcode')
      const scanner = new Html5QrcodeScanner(
        'barcode-reader',
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
          aspectRatio: 1.7,
          supportedScanTypes: [0], // QR + barcode
        },
        false
      )

      scanner.render(
        (decodedText: string) => {
          scanner.clear().catch(console.error)
          onScan(decodedText)
        },
        (err: unknown) => {
          // Ignore scan errors (normal when no barcode in view)
          void err
        }
      )

      scannerInstanceRef.current = scanner
    } catch {
      setError('Could not access camera. Please allow camera permissions or enter code manually.')
      setScanning(false)
    }
  }, [onScan])

  useEffect(() => {
    startScanner()
    return () => {
      const scanner = scannerInstanceRef.current as { clear?: () => Promise<void> } | null
      if (scanner?.clear) {
        scanner.clear().catch(console.error)
      }
    }
  }, [startScanner])

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (manualCode.trim()) {
      onScan(manualCode.trim())
    }
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

        {/* Scanner area */}
        <div className="p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div id="barcode-reader" ref={scannerRef} className="w-full rounded-lg overflow-hidden" />

          {scanning && (
            <p className="text-center text-sm text-gray-500 mt-2 flex items-center justify-center gap-1">
              <ZoomIn className="h-4 w-4 animate-pulse" />
              Point camera at barcode or QR code
            </p>
          )}

          {/* Manual entry fallback */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
              <ZoomOut className="h-3 w-3" />
              Or enter barcode manually:
            </p>
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
