import { useState, useEffect, useCallback, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  Cloud, Upload, Search, LogOut, Grid, List, Trash2, Download,
  File, Image, Video, Music, Archive, FileText, MoreVertical,
  HardDrive, User, RefreshCw, X, ChevronRight, Loader2
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import * as api from '../services/api'
import { formatBytes, formatDate, getFileIcon, getFileColor, getMimeCategory } from '../utils/fileUtils'

// ── Upload queue item ─────────────────────────────────────
function UploadItem({ name, progress, done, error }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
        <File className="w-4 h-4 text-accent" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium truncate">{name}</div>
        {!done && !error && (
          <div className="mt-1.5 h-1 bg-border rounded-full overflow-hidden">
            <div className="h-full bg-accent rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        )}
        {done && <div className="text-xs text-success mt-0.5">Uploaded</div>}
        {error && <div className="text-xs text-danger mt-0.5 truncate">{error}</div>}
      </div>
      <span className="text-xs text-sub flex-shrink-0">{done ? '✓' : error ? '✗' : `${progress}%`}</span>
    </div>
  )
}

// ── File card (grid) ──────────────────────────────────────
function FileCard({ file, onDownload, onDelete, selected, onSelect }) {
  const [menu, setMenu] = useState(false)
  const Icon = getFileIcon(file.mime_type)
  const color = getFileColor(file.mime_type)

  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.15 }}
      className={`relative bg-card border rounded-2xl p-4 cursor-pointer hover:border-accent/30 transition-all group ${selected ? 'border-accent/60 bg-accent/5' : 'border-border'}`}
      onClick={() => onSelect(file.message_id)}>

      {/* Icon */}
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${color.bg}`}>
        <Icon className={`w-6 h-6 ${color.text}`} />
      </div>

      {/* Name */}
      <div className="text-sm font-medium truncate mb-1">{file.name}</div>
      <div className="text-xs text-sub">{formatBytes(file.size)}</div>
      <div className="text-xs text-muted mt-0.5">{formatDate(file.uploaded_at)}</div>

      {/* Menu button */}
      <button onClick={e => { e.stopPropagation(); setMenu(v => !v) }}
        className="absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-hover transition-all">
        <MoreVertical className="w-4 h-4 text-sub" />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {menu && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="absolute top-10 right-3 z-20 bg-card border border-border rounded-xl shadow-2xl overflow-hidden w-40"
            onClick={e => e.stopPropagation()}>
            <button onClick={() => { onDownload(file); setMenu(false) }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-hover transition-colors text-left">
              <Download className="w-4 h-4 text-sub" /> Download
            </button>
            <button onClick={() => { onDelete(file); setMenu(false) }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-hover transition-colors text-left text-danger">
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── File row (list) ───────────────────────────────────────
function FileRow({ file, onDownload, onDelete }) {
  const Icon = getFileIcon(file.mime_type)
  const color = getFileColor(file.mime_type)
  return (
    <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-hover transition-colors group">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color.bg}`}>
        <Icon className={`w-4 h-4 ${color.text}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{file.name}</div>
        <div className="text-xs text-sub">{formatDate(file.uploaded_at)}</div>
      </div>
      <div className="text-sm text-sub w-20 text-right flex-shrink-0">{formatBytes(file.size)}</div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onDownload(file)} className="w-8 h-8 rounded-lg hover:bg-border flex items-center justify-center transition-colors">
          <Download className="w-4 h-4 text-sub" />
        </button>
        <button onClick={() => onDelete(file)} className="w-8 h-8 rounded-lg hover:bg-border flex items-center justify-center transition-colors">
          <Trash2 className="w-4 h-4 text-danger" />
        </button>
      </div>
    </motion.div>
  )
}

// ── Main Drive Page ───────────────────────────────────────
export default function DrivePage() {
  const { session, logoutLocal } = useAuth()
  const [files, setFiles]               = useState([])
  const [loading, setLoading]           = useState(true)
  const [view, setView]                 = useState('grid') // 'grid' | 'list'
  const [search, setSearch]             = useState('')
  const [uploads, setUploads]           = useState([])    // { id, name, progress, done, error }
  const [showUploadPanel, setShowUploadPanel] = useState(false)
  const [selected, setSelected]         = useState(new Set())
  const [filterType, setFilterType]     = useState('all') // all | image | video | audio | document
  const uploadPanelRef = useRef(null)

  // ── Load files ────────────────────────────────────────

  const loadFiles = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.listFiles(session.sessionId, session.channelId)
      setFiles(res.files || [])
    } catch (e) {
      if (e.response?.status === 401) { logoutLocal(); toast.error('Session expired. Please sign in again.') }
      else toast.error('Failed to load files.')
    } finally { setLoading(false) }
  }, [session])

  useEffect(() => { loadFiles() }, [loadFiles])

  // ── Upload (dropzone) ─────────────────────────────────

  const onDrop = useCallback(async (acceptedFiles) => {
    setShowUploadPanel(true)
    for (const file of acceptedFiles) {
      const id = Date.now() + Math.random()
      setUploads(prev => [...prev, { id, name: file.name, progress: 0, done: false, error: null }])
      try {
        await api.uploadFile(session.sessionId, session.channelId, file, (pct) => {
          setUploads(prev => prev.map(u => u.id === id ? { ...u, progress: pct } : u))
        })
        setUploads(prev => prev.map(u => u.id === id ? { ...u, done: true, progress: 100 } : u))
        toast.success(`${file.name} uploaded!`)
        loadFiles()
      } catch (e) {
        const msg = e.response?.data?.detail || 'Upload failed.'
        setUploads(prev => prev.map(u => u.id === id ? { ...u, error: msg } : u))
        toast.error(`${file.name}: ${msg}`)
      }
    }
  }, [session, loadFiles])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, noClick: true })

  // ── Download ──────────────────────────────────────────

  const handleDownload = (file) => {
    const url = api.downloadUrl(session.sessionId, session.channelId, file.message_id)
    const a = document.createElement('a')
    a.href = url; a.download = file.name; a.click()
    toast.success(`Downloading ${file.name}…`)
  }

  // ── Delete ────────────────────────────────────────────

  const handleDelete = async (file) => {
    if (!confirm(`Delete "${file.name}"? This cannot be undone.`)) return
    try {
      await api.deleteFile(session.sessionId, session.channelId, file.message_id)
      setFiles(prev => prev.filter(f => f.message_id !== file.message_id))
      toast.success('File deleted.')
    } catch (e) { toast.error('Delete failed.') }
  }

  // ── Logout ────────────────────────────────────────────

  const handleLogout = async () => {
    try { await api.logout(session.sessionId) } catch (_) {}
    logoutLocal()
    toast.success('Signed out.')
  }

  // ── Filter & search ───────────────────────────────────

  const filtered = files.filter(f => {
    const matchSearch = f.name.toLowerCase().includes(search.toLowerCase())
    const matchType = filterType === 'all' || getMimeCategory(f.mime_type) === filterType
    return matchSearch && matchType
  })

  const totalSize = files.reduce((acc, f) => acc + f.size, 0)
  const activeUploads = uploads.filter(u => !u.done && !u.error).length

  // ── Render ────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-black flex" {...getRootProps()}>
      <input {...getInputProps()} />

      {/* Drag overlay */}
      <AnimatePresence>
        {isDragActive && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-accent/10 border-2 border-dashed border-accent flex items-center justify-center">
            <div className="text-center">
              <Upload className="w-12 h-12 text-accent mx-auto mb-3" />
              <div className="text-xl font-bold">Drop files to upload</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Sidebar ─────────────────────────────────────── */}
      <aside className="w-60 border-r border-border flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border">
          <div className="w-8 h-8 rounded-lg accent-gradient flex items-center justify-center">
            <Cloud className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold tracking-tight">ZX Drive</span>
        </div>

        {/* Upload button */}
        <div className="px-4 py-4">
          <label className="w-full flex items-center justify-center gap-2 py-2.5 accent-gradient rounded-xl text-sm font-semibold cursor-pointer hover:opacity-90 transition-opacity">
            <Upload className="w-4 h-4" />
            Upload Files
            <input type="file" multiple className="hidden" onChange={e => onDrop([...e.target.files])} />
          </label>
        </div>

        {/* Filter nav */}
        <nav className="flex-1 px-3 space-y-0.5">
          {[
            { id: 'all', label: 'All Files', Icon: HardDrive },
            { id: 'image', label: 'Images', Icon: Image },
            { id: 'video', label: 'Videos', Icon: Video },
            { id: 'audio', label: 'Audio', Icon: Music },
            { id: 'document', label: 'Documents', Icon: FileText },
            { id: 'archive', label: 'Archives', Icon: Archive },
          ].map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setFilterType(id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors ${filterType === id ? 'bg-accent/10 text-accent font-medium' : 'text-sub hover:text-white hover:bg-hover'}`}>
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        {/* Storage info */}
        <div className="p-4 border-t border-border">
          <div className="text-xs text-sub mb-1">Storage used</div>
          <div className="text-sm font-semibold">{formatBytes(totalSize)}</div>
          <div className="text-xs text-muted mt-0.5">{files.length} files</div>
        </div>

        {/* User */}
        <div className="p-4 border-t border-border flex items-center gap-3">
          <div className="w-8 h-8 rounded-full accent-gradient flex items-center justify-center text-xs font-bold flex-shrink-0">
            {(session.firstName?.[0] || '?').toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{session.firstName} {session.lastName || ''}</div>
            <div className="text-xs text-sub truncate">{session.phone || 'Telegram'}</div>
          </div>
          <button onClick={handleLogout} className="text-sub hover:text-danger transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="flex items-center gap-4 px-6 py-4 border-b border-border">
          <div className="flex-1 relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search files…"
              className="w-full bg-card border border-border rounded-xl pl-9 pr-4 py-2 text-sm outline-none focus:border-accent/50 transition-colors" />
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={loadFiles} className="w-9 h-9 rounded-xl hover:bg-hover border border-border flex items-center justify-center transition-colors">
              <RefreshCw className="w-4 h-4 text-sub" />
            </button>
            <button onClick={() => setView('grid')} className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-colors ${view === 'grid' ? 'bg-accent/10 border-accent/40 text-accent' : 'border-border hover:bg-hover text-sub'}`}>
              <Grid className="w-4 h-4" />
            </button>
            <button onClick={() => setView('list')} className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-colors ${view === 'list' ? 'bg-accent/10 border-accent/40 text-accent' : 'border-border hover:bg-hover text-sub'}`}>
              <List className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* File area */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-16 h-16 rounded-2xl bg-card border border-border flex items-center justify-center mb-4">
                <Cloud className="w-8 h-8 text-muted" />
              </div>
              <div className="text-base font-medium mb-1">{search ? 'No results' : 'No files yet'}</div>
              <div className="text-sm text-sub">{search ? 'Try a different search term.' : 'Drop files anywhere to upload.'}</div>
            </div>
          ) : view === 'grid' ? (
            <motion.div layout className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              <AnimatePresence>
                {filtered.map(f => (
                  <FileCard key={f.message_id} file={f}
                    selected={selected.has(f.message_id)}
                    onSelect={id => setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })}
                    onDownload={handleDownload}
                    onDelete={handleDelete} />
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            <div className="space-y-0.5">
              <div className="flex items-center gap-4 px-4 py-2 text-xs text-muted uppercase tracking-wider">
                <div className="w-9" />
                <div className="flex-1">Name</div>
                <div className="w-20 text-right">Size</div>
                <div className="w-16" />
              </div>
              <AnimatePresence>
                {filtered.map(f => (
                  <FileRow key={f.message_id} file={f} onDownload={handleDownload} onDelete={handleDelete} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>

      {/* ── Upload panel ────────────────────────────────── */}
      <AnimatePresence>
        {showUploadPanel && uploads.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-5 right-5 w-80 bg-card border border-border rounded-2xl shadow-2xl z-40 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="text-sm font-semibold">
                Uploads {activeUploads > 0 ? <span className="text-accent">({activeUploads} active)</span> : <span className="text-success">✓ Done</span>}
              </div>
              <button onClick={() => { setShowUploadPanel(false); setUploads([]) }} className="text-sub hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-4 py-2 max-h-60 overflow-y-auto divide-y divide-border">
              {uploads.map(u => <UploadItem key={u.id} {...u} />)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
        }
