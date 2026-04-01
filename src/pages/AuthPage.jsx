import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Cloud, Phone, QrCode, ArrowLeft, Loader2, ShieldCheck, Eye, EyeOff } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import * as api from '../services/api'

// ── Steps ─────────────────────────────────────────────────
const STEP = { METHOD: 'method', CREDS: 'creds', PHONE: 'phone', OTP: 'otp', TWO_FA: '2fa', QR: 'qr' }

export default function AuthPage() {
  const { login } = useAuth()
  const [step, setStep]               = useState(STEP.METHOD)
  const [method, setMethod]           = useState('phone') // 'phone' | 'qr'
  const [loading, setLoading]         = useState(false)

  // credentials
  const [apiId, setApiId]             = useState('')
  const [apiHash, setApiHash]         = useState('')
  const [showHash, setShowHash]       = useState(false)
  const [channelId, setChannelId]     = useState('')

  // phone flow
  const [phone, setPhone]             = useState('')
  const [codeHash, setCodeHash]       = useState('')
  const [sessionId, setSessionId]     = useState('')
  const [otp, setOtp]                 = useState(['', '', '', '', ''])
  const [password, setPassword]       = useState('')
  const [showPass, setShowPass]       = useState(false)

  // QR flow
  const [qrUrl, setQrUrl]             = useState('')
  const [qrSessionId, setQrSessionId] = useState('')
  const [qrPolling, setQrPolling]     = useState(null)

  const err = (msg) => toast.error(msg)

  // ── Credentials step ──────────────────────────────────

  const handleCredsNext = () => {
    if (!apiId || !apiHash || !channelId) return err('Fill in all fields.')
    if (isNaN(Number(apiId))) return err('API ID must be a number.')
    if (!channelId.startsWith('-100')) return err('Channel ID must start with -100')
    if (method === 'qr') { setStep(STEP.QR); startQR(); }
    else setStep(STEP.PHONE)
  }

  // ── Phone flow ────────────────────────────────────────

  const handleSendCode = async () => {
    if (!phone) return err('Enter your phone number.')
    setLoading(true)
    try {
      const res = await api.sendCode(apiId, apiHash, phone)
      setSessionId(res.session_id)
      setCodeHash(res.phone_code_hash)
      setStep(STEP.OTP)
      toast.success('Code sent to your Telegram app!')
    } catch (e) {
      err(e.response?.data?.detail || 'Failed to send code.')
    } finally { setLoading(false) }
  }

  const handleVerify = async () => {
    const code = otp.join('')
    if (code.length < 5) return err('Enter the full 5-digit code.')
    setLoading(true)
    try {
      const res = await api.verifyCode(sessionId, phone, codeHash, code)
      if (res.needs_2fa) { setStep(STEP.TWO_FA); toast('Enter your cloud password.') }
      else finishAuth(res)
    } catch (e) {
      err(e.response?.data?.detail || 'Invalid code.')
    } finally { setLoading(false) }
  }

  const handleVerify2FA = async () => {
    if (!password) return err('Enter your cloud password.')
    setLoading(true)
    try {
      const res = await api.verify2FA(sessionId, password)
      finishAuth(res)
    } catch (e) {
      err(e.response?.data?.detail || 'Wrong password.')
    } finally { setLoading(false) }
  }

  const finishAuth = (res) => {
    login({
      sessionId: res.session_id,
      userId: res.user_id,
      firstName: res.first_name,
      lastName: res.last_name,
      phone: res.phone,
      apiId, apiHash, channelId,
    })
    toast.success(`Welcome, ${res.first_name}!`)
  }

  // ── QR flow ───────────────────────────────────────────

  const startQR = async () => {
    setLoading(true)
    try {
      const res = await api.startQR(apiId, apiHash)
      setQrUrl(res.qr_url)
      setQrSessionId(res.session_id)
      setLoading(false)
      // Poll every 2s
      const interval = setInterval(async () => {
        try {
          const status = await api.pollQR(res.session_id)
          clearInterval(interval)
          setQrPolling(null)
          login({ sessionId: res.session_id, userId: status.user_id, firstName: status.first_name, lastName: status.last_name, phone: status.phone, apiId, apiHash, channelId })
          toast.success(`Welcome, ${status.first_name}!`)
        } catch (e) {
          if (e.response?.status === 202) return // still waiting
          clearInterval(interval)
          err('QR login failed. Try again.')
        }
      }, 2000)
      setQrPolling(interval)
    } catch (e) {
      setLoading(false)
      err(e.response?.data?.detail || 'Could not generate QR code.')
    }
  }

  const refreshQR = () => {
    if (qrPolling) clearInterval(qrPolling)
    setQrUrl('')
    startQR()
  }

  // ── OTP digit inputs ──────────────────────────────────

  const handleOtpChange = (val, i) => {
    if (!/^\d?$/.test(val)) return
    const next = [...otp]; next[i] = val; setOtp(next)
    if (val && i < 4) document.getElementById(`otp-${i + 1}`)?.focus()
  }
  const handleOtpKey = (e, i) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) document.getElementById(`otp-${i - 1}`)?.focus()
  }

  // ── Render ────────────────────────────────────────────

  const fade = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10 }, transition: { duration: 0.2 } }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl accent-gradient flex items-center justify-center">
            <Cloud className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">ZX Drive</span>
        </div>

        <AnimatePresence mode="wait">

          {/* ── Method select ───────────────────────────── */}
          {step === STEP.METHOD && (
            <motion.div key="method" {...fade}>
              <h1 className="text-3xl font-bold mb-2">Sign in</h1>
              <p className="text-sub text-sm mb-8">Connect your Telegram account to get started.</p>
              <div className="space-y-3">
                <button onClick={() => { setMethod('phone'); setStep(STEP.CREDS) }}
                  className="w-full flex items-center gap-4 p-4 bg-card border border-border rounded-2xl hover:border-accent/40 hover:bg-hover transition-all text-left group">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                    <Phone className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">Phone Number</div>
                    <div className="text-sub text-xs mt-0.5">Sign in with OTP code</div>
                  </div>
                </button>
                <button onClick={() => { setMethod('qr'); setStep(STEP.CREDS) }}
                  className="w-full flex items-center gap-4 p-4 bg-card border border-border rounded-2xl hover:border-accent/40 hover:bg-hover transition-all text-left group">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                    <QrCode className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">QR Code</div>
                    <div className="text-sub text-xs mt-0.5">Scan with Telegram on another device</div>
                  </div>
                </button>
              </div>
            </motion.div>
          )}

          {/* ── API Credentials ──────────────────────────── */}
          {step === STEP.CREDS && (
            <motion.div key="creds" {...fade}>
              <button onClick={() => setStep(STEP.METHOD)} className="flex items-center gap-2 text-sub text-sm mb-6 hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <h1 className="text-2xl font-bold mb-1">API Credentials</h1>
              <p className="text-sub text-sm mb-6">Get these from <a href="https://my.telegram.org" target="_blank" rel="noreferrer" className="text-accent hover:underline">my.telegram.org</a> → API development tools.</p>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-sub uppercase tracking-wider mb-2 block">API ID</label>
                  <input value={apiId} onChange={e => setApiId(e.target.value)} placeholder="12345678"
                    className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-accent/60 transition-colors font-mono" />
                </div>
                <div>
                  <label className="text-xs font-medium text-sub uppercase tracking-wider mb-2 block">API Hash</label>
                  <div className="relative">
                    <input value={apiHash} onChange={e => setApiHash(e.target.value)} placeholder="a1b2c3d4e5f6..." type={showHash ? 'text' : 'password'}
                      className="w-full bg-card border border-border rounded-xl px-4 py-3 pr-11 text-sm outline-none focus:border-accent/60 transition-colors font-mono" />
                    <button onClick={() => setShowHash(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-sub hover:text-white transition-colors">
                      {showHash ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-sub uppercase tracking-wider mb-2 block">Channel ID</label>
                  <input value={channelId} onChange={e => setChannelId(e.target.value)} placeholder="-1001234567890"
                    className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-accent/60 transition-colors font-mono" />
                  <p className="text-xs text-muted mt-2">Your Telegram channel where files are stored. Must start with -100.</p>
                </div>
              </div>

              <button onClick={handleCredsNext}
                className="w-full mt-6 py-3 accent-gradient rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity">
                Continue
              </button>
            </motion.div>
          )}

          {/* ── Phone ───────────────────────────────────── */}
          {step === STEP.PHONE && (
            <motion.div key="phone" {...fade}>
              <button onClick={() => setStep(STEP.CREDS)} className="flex items-center gap-2 text-sub text-sm mb-6 hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <h1 className="text-2xl font-bold mb-1">Your phone number</h1>
              <p className="text-sub text-sm mb-6">Include your country code, e.g. +91 for India.</p>
              <input value={phone} onChange={e => setPhone(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendCode()}
                placeholder="+919876543210" type="tel"
                className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-accent/60 transition-colors font-mono mb-6" />
              <button onClick={handleSendCode} disabled={loading}
                className="w-full py-3 accent-gradient rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : 'Send Code'}
              </button>
            </motion.div>
          )}

          {/* ── OTP ─────────────────────────────────────── */}
          {step === STEP.OTP && (
            <motion.div key="otp" {...fade}>
              <button onClick={() => setStep(STEP.PHONE)} className="flex items-center gap-2 text-sub text-sm mb-6 hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <h1 className="text-2xl font-bold mb-1">Enter the code</h1>
              <p className="text-sub text-sm mb-8">Telegram sent a 5-digit code to <span className="text-white font-medium">{phone}</span></p>
              <div className="flex gap-3 mb-8">
                {otp.map((d, i) => (
                  <input key={i} id={`otp-${i}`} value={d} maxLength={1}
                    onChange={e => handleOtpChange(e.target.value, i)}
                    onKeyDown={e => handleOtpKey(e, i)}
                    className="flex-1 aspect-square text-center text-xl font-bold bg-card border border-border rounded-xl outline-none focus:border-accent/60 transition-colors" />
                ))}
              </div>
              <button onClick={handleVerify} disabled={loading}
                className="w-full py-3 accent-gradient rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</> : 'Verify'}
              </button>
            </motion.div>
          )}

          {/* ── 2FA ─────────────────────────────────────── */}
          {step === STEP.TWO_FA && (
            <motion.div key="2fa" {...fade}>
              <div className="w-12 h-12 rounded-2xl bg-warning/10 flex items-center justify-center mb-6">
                <ShieldCheck className="w-6 h-6 text-warning" />
              </div>
              <h1 className="text-2xl font-bold mb-1">Two-factor auth</h1>
              <p className="text-sub text-sm mb-6">Your account has a cloud password enabled.</p>
              <div className="relative mb-6">
                <input value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleVerify2FA()}
                  type={showPass ? 'text' : 'password'} placeholder="Cloud password"
                  className="w-full bg-card border border-border rounded-xl px-4 py-3 pr-11 text-sm outline-none focus:border-accent/60 transition-colors" />
                <button onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-sub hover:text-white transition-colors">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button onClick={handleVerify2FA} disabled={loading}
                className="w-full py-3 accent-gradient rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</> : 'Confirm'}
              </button>
            </motion.div>
          )}

          {/* ── QR ──────────────────────────────────────── */}
          {step === STEP.QR && (
            <motion.div key="qr" {...fade} className="text-center">
              <button onClick={() => { if (qrPolling) clearInterval(qrPolling); setStep(STEP.CREDS) }}
                className="flex items-center gap-2 text-sub text-sm mb-6 hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <h1 className="text-2xl font-bold mb-1">Scan QR Code</h1>
              <p className="text-sub text-sm mb-8">Open Telegram → Settings → Devices → Link Desktop Device</p>

              <div className="flex items-center justify-center mb-6">
                {loading ? (
                  <div className="w-52 h-52 bg-card border border-border rounded-2xl flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-accent" />
                  </div>
                ) : qrUrl ? (
                  <div className="p-4 bg-white rounded-2xl shadow-2xl shadow-accent/10">
                    <QRCodeSVG value={qrUrl} size={200} bgColor="#ffffff" fgColor="#000000" level="M" />
                  </div>
                ) : null}
              </div>

              {qrUrl && (
                <div className="flex items-center justify-center gap-2 text-sub text-xs mb-6">
                  <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  Waiting for scan...
                </div>
              )}

              <button onClick={refreshQR} disabled={loading}
                className="text-sm text-accent hover:underline disabled:opacity-50">
                Refresh QR Code
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
        }
