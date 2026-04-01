// src/services/api.js
// Single source of truth for all backend calls.
// Change VITE_API_URL in .env to point at your HF Space.

import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'https://aibeo-zxdrive-backend.hf.space'

const api = axios.create({ baseURL: BASE, timeout: 0 }) // timeout=0 for large uploads

// ── Auth ──────────────────────────────────────────────────

export const sendCode = (apiId, apiHash, phone) =>
  api.post('/auth/send-code', { api_id: Number(apiId), api_hash: apiHash, phone })
    .then(r => r.data)

export const verifyCode = (sessionId, phone, phoneCodeHash, code) =>
  api.post('/auth/verify', { session_id: sessionId, phone, phone_code_hash: phoneCodeHash, code })
    .then(r => r.data)

export const verify2FA = (sessionId, password) =>
  api.post('/auth/verify-2fa', { session_id: sessionId, password })
    .then(r => r.data)

export const startQR = (apiId, apiHash) =>
  api.post(`/auth/qr/start?api_id=${apiId}&api_hash=${apiHash}`)
    .then(r => r.data)

export const pollQR = (sessionId) =>
  api.post('/auth/qr/status', { session_id: sessionId })
    .then(r => r.data)

export const logout = (sessionId) =>
  api.post('/auth/logout', { session_id: sessionId })
    .then(r => r.data)

// ── Files ─────────────────────────────────────────────────

export const listFiles = (sessionId, channelId, limit = 50, offsetId = 0) =>
  api.get('/files/list', { params: { session_id: sessionId, channel_id: channelId, limit, offset_id: offsetId } })
    .then(r => r.data)

export const uploadFile = (sessionId, channelId, file, onProgress) => {
  const form = new FormData()
  form.append('session_id', sessionId)
  form.append('channel_id', channelId)
  form.append('file', file)
  return api.post('/files/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: e => onProgress?.(Math.round((e.loaded / e.total) * 100)),
  }).then(r => r.data)
}

export const downloadUrl = (sessionId, channelId, messageId) =>
  `${BASE}/files/download/${messageId}?session_id=${sessionId}&channel_id=${channelId}`

export const deleteFile = (sessionId, channelId, messageId) =>
  api.delete(`/files/${messageId}`, { params: { session_id: sessionId, channel_id: channelId } })
    .then(r => r.data)
