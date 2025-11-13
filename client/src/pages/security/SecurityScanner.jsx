import { useState, useRef } from 'react'
import QrScanner from 'qr-scanner'
import { API_BASE_URL } from '../../constants'
import axios from 'axios'

export default function SecurityScanner() {
  const [input, setInput] = useState('')
  const [imagePreview, setImagePreview] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const fileRef = useRef(null)

  async function verifyPayload(payload) {
    try {
      setLoading(true)
      setResult(null)
      const body = { code: payload }
      const res = await axios.post(`${API_BASE_URL}/security/verify-outpass`, body)
      setResult({ ok: true, data: res.data })
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Verification failed'
      setResult({ ok: false, error: msg })
    } finally {
      setLoading(false)
    }
  }

  async function onVerifyClick() {
    if (!input) return setResult({ ok: false, error: 'Paste raw QR payload or requestId first.' })
    await verifyPayload(input.trim())
  }

  async function onFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setImagePreview(URL.createObjectURL(f))

    try {
      // Use qr-scanner to decode image file
      const data = await QrScanner.scanImage(f, { returnDetailedScanResult: false })
      if (data) {
        setInput(data)
        setResult({ ok: true, info: 'Decoded QR from image. Click Verify.' })
      } else {
        setResult({ ok: false, error: 'Could not decode QR from the uploaded image.' })
      }
    } catch (err) {
      setResult({ ok: false, error: 'QR decode failed: ' + (err?.message || err) })
    }
  }

  function onPaste(e) {
    // Allow pasting image from clipboard as well as text
    const items = e.clipboardData?.items
    if (items) {
      for (const it of items) {
        if (it.type && it.type.startsWith('image/')) {
          const blob = it.getAsFile()
          if (blob) {
            const url = URL.createObjectURL(blob)
            setImagePreview(url)
            QrScanner.scanImage(blob).then(data => {
              setInput(data)
              setResult({ ok: true, info: 'Decoded QR from clipboard image. Click Verify.' })
            }).catch(err => setResult({ ok: false, error: 'Could not decode QR from clipboard image.' }))
            e.preventDefault()
            return
          }
        }
      }
    }
    // default: let text be pasted into textarea
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4">Security: Virtual QR Scanner</h2>

      <p className="mb-2 text-sm text-gray-600">You can paste the raw QR payload (the encoded string) or the outpass <code>requestId</code>. You may also upload or paste an image of the QR code — the app will try to decode it.</p>

      <div className="mb-4">
        <textarea
          onPaste={onPaste}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste QR payload or requestId here"
          rows={5}
          className="w-full p-2 border rounded"
        />
      </div>

      <div className="mb-4 flex items-center gap-2">
        <input ref={fileRef} type="file" accept="image/*" onChange={onFile} />
        <button onClick={onVerifyClick} disabled={loading} className="px-3 py-1 bg-blue-600 text-white rounded">{loading ? 'Verifying...' : 'Verify'}</button>
        <button onClick={() => { setInput(''); setResult(null); setImagePreview(null) }} className="px-3 py-1 bg-gray-200 rounded">Clear</button>
      </div>

      {imagePreview && (
        <div className="mb-4">
          <img src={imagePreview} alt="QR preview" style={{maxWidth:400}} />
        </div>
      )}

      {result && (
        <div className={`p-3 rounded ${result.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {result.ok ? (
            <div>
              {result.info && <div className="mb-2">{result.info}</div>}
              <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(result.data || {}, null, 2)}</pre>
            </div>
          ) : (
            <div>{result.error}</div>
          )}
        </div>
      )}
    </div>
  )
}
