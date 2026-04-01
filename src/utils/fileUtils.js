import { File, Image, Video, Music, Archive, FileText, FileCode, FileSpreadsheet } from 'lucide-react'

export function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function formatDate(iso) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    const now = new Date()
    const diff = now - d
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch { return '' }
}

export function getMimeCategory(mime) {
  if (!mime) return 'document'
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  if (mime.includes('zip') || mime.includes('rar') || mime.includes('tar') || mime.includes('gz') || mime.includes('7z')) return 'archive'
  if (mime.includes('pdf') || mime.includes('word') || mime.includes('document') || mime.includes('text')) return 'document'
  if (mime.includes('sheet') || mime.includes('excel') || mime.includes('csv')) return 'document'
  if (mime.includes('javascript') || mime.includes('python') || mime.includes('json') || mime.includes('xml') || mime.includes('html')) return 'document'
  return 'document'
}

export function getFileIcon(mime) {
  const cat = getMimeCategory(mime)
  switch (cat) {
    case 'image': return Image
    case 'video': return Video
    case 'audio': return Music
    case 'archive': return Archive
    case 'document':
      if (mime?.includes('pdf')) return FileText
      if (mime?.includes('sheet') || mime?.includes('csv')) return FileSpreadsheet
      if (mime?.includes('code') || mime?.includes('javascript') || mime?.includes('python')) return FileCode
      return FileText
    default: return File
  }
}

export function getFileColor(mime) {
  const cat = getMimeCategory(mime)
  switch (cat) {
    case 'image':    return { bg: 'bg-pink-500/10',   text: 'text-pink-400' }
    case 'video':    return { bg: 'bg-purple-500/10', text: 'text-purple-400' }
    case 'audio':    return { bg: 'bg-green-500/10',  text: 'text-green-400' }
    case 'archive':  return { bg: 'bg-yellow-500/10', text: 'text-yellow-400' }
    case 'document':
      if (mime?.includes('pdf')) return { bg: 'bg-red-500/10', text: 'text-red-400' }
      return { bg: 'bg-blue-500/10', text: 'text-blue-400' }
    default:         return { bg: 'bg-zinc-500/10',   text: 'text-zinc-400' }
  }
      }
