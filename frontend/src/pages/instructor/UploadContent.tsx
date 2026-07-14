import { useState, useRef } from 'react'
import { Upload as UploadIcon, FileVideo, FileText, FileBadge, FileArchive, X, CheckCircle2, AlertCircle } from 'lucide-react'
import api from '../../lib/api'

type ContentType = 'video' | 'pdf' | 'article' | 'assignment'

export default function UploadContent() {
  const [contentType, setContentType] = useState<ContentType>('video')
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject: '',
    topic: ''
  })
  
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)

  const contentTypes = [
    { id: 'video', label: 'Video Lecture', icon: FileVideo, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
    { id: 'pdf', label: 'PDF Notes', icon: FileText, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
    { id: 'article', label: 'Article/Text', icon: FileBadge, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
    { id: 'assignment', label: 'Assignment', icon: FileArchive, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' }
  ]

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const resetForm = () => {
    setFormData({ title: '', description: '', subject: '', topic: '' })
    setFile(null)
    setStatus('idle')
    setUploadProgress(0)
    setMessage('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!file) {
      setStatus('error')
      setMessage('Please select a file to upload')
      return
    }

    setStatus('uploading')
    setMessage('')
    
    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 95) {
          clearInterval(progressInterval)
          return prev
        }
        return prev + 5
      })
    }, 100)

    try {
      const form = new FormData()
      form.append('title', formData.title)
      form.append('description', formData.description)
      form.append('content_type', contentType)
      form.append('subject', formData.subject)
      form.append('topic', formData.topic)
      form.append('file', file)

      const response = await api.post('/api/instructor/upload', form, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      
      clearInterval(progressInterval)
      setUploadProgress(100)
      setStatus('success')
      setMessage(response.data.message || 'Content uploaded successfully!')
    } catch (err: any) {
      clearInterval(progressInterval)
      setStatus('error')
      setMessage(err.response?.data?.message || 'Failed to upload content. Please try again.')
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <header className="mb-8">
        <h1 className="text-3xl font-black text-white tracking-tight">Upload Content</h1>
        <p className="text-slate-400 mt-2 font-medium">Add new materials to your courses.</p>
      </header>

      {status === 'success' ? (
        <div className="bg-surface-800 border border-emerald-500/20 rounded-3xl p-10 text-center flex flex-col items-center">
          <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Upload Complete!</h2>
          <p className="text-slate-400 mb-8 max-w-sm">{message}</p>
          <button 
            onClick={resetForm}
            className="bg-surface-700 hover:bg-surface-600 text-white px-6 py-3 rounded-xl font-medium transition-colors"
          >
            Upload Another File
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Type Selection */}
          <div className="bg-surface-800 border border-white/[0.06] rounded-3xl p-6 md:p-8">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">1. Select Content Type</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {contentTypes.map((type) => {
                const Icon = type.icon
                const isSelected = contentType === type.id
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setContentType(type.id as ContentType)}
                    className={`relative flex flex-col items-center justify-center p-6 rounded-2xl transition-all duration-300 ${
                      isSelected 
                        ? `bg-surface-900 border-2 ${type.border} shadow-[0_0_20px_rgba(0,0,0,0.2)] scale-[1.02]`
                        : 'bg-surface-900/50 border-2 border-transparent hover:bg-surface-800'
                    }`}
                  >
                    <div className={`p-4 rounded-xl mb-3 ${isSelected ? type.bg : 'bg-surface-800'} ${isSelected ? type.color : 'text-slate-400'}`}>
                      <Icon size={28} />
                    </div>
                    <span className={`font-semibold ${isSelected ? 'text-white' : 'text-slate-400'}`}>
                      {type.label}
                    </span>
                    {isSelected && (
                      <div className="absolute top-3 right-3 text-emerald-500">
                        <CheckCircle2 size={18} fill="currentColor" className="text-surface-900" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Details */}
          <div className="bg-surface-800 border border-white/[0.06] rounded-3xl p-6 md:p-8">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">2. Content Details</h2>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full bg-surface-950/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-600"
                  placeholder="e.g. Introduction to Dynamic Programming"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Subject</label>
                  <input
                    type="text"
                    required
                    value={formData.subject}
                    onChange={e => setFormData({...formData, subject: e.target.value})}
                    className="w-full bg-surface-950/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-600"
                    placeholder="e.g. Data Structures"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Topic</label>
                  <input
                    type="text"
                    required
                    value={formData.topic}
                    onChange={e => setFormData({...formData, topic: e.target.value})}
                    className="w-full bg-surface-950/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-600"
                    placeholder="e.g. Dynamic Programming"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Description (Optional)</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-surface-950/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-600 resize-none"
                  placeholder="Briefly describe what this content covers..."
                />
              </div>
            </div>
          </div>

          {/* File Upload */}
          <div className="bg-surface-800 border border-white/[0.06] rounded-3xl p-6 md:p-8">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">3. Attach File</h2>
            
            <div 
              className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center transition-all cursor-pointer text-center ${
                isDragging 
                  ? 'border-blue-500 bg-blue-500/5' 
                  : file 
                    ? 'border-emerald-500/50 bg-emerald-500/5' 
                    : 'border-white/10 hover:border-white/20 hover:bg-surface-700/50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileChange}
              />
              
              {file ? (
                <>
                  <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-4">
                    <FileBadge size={32} />
                  </div>
                  <p className="text-white font-bold text-lg">{file.name}</p>
                  <p className="text-slate-400 text-sm mt-1">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                  <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setFile(null) }}
                    className="mt-4 text-red-400 hover:text-red-300 text-sm font-medium flex items-center gap-1"
                  >
                    <X size={14} /> Remove File
                  </button>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-surface-900 text-slate-400 rounded-full flex items-center justify-center mb-4 shadow-inner">
                    <UploadIcon size={32} />
                  </div>
                  <p className="text-white font-bold text-lg mb-1">Click to browse or drag and drop</p>
                  <p className="text-slate-500 text-sm">MP4, PDF, DOCX, or ZIP files up to 500MB</p>
                </>
              )}
            </div>
          </div>

          {status === 'error' && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-start gap-3">
              <AlertCircle className="shrink-0 mt-0.5" size={18} />
              <p>{message}</p>
            </div>
          )}

          {status === 'uploading' && (
            <div className="bg-surface-800 rounded-2xl p-6 border border-blue-500/20">
              <div className="flex justify-between text-sm mb-3">
                <span className="font-bold text-white">Uploading {file?.name}...</span>
                <span className="text-blue-400 font-bold">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-surface-950 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blue-600 to-indigo-500 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={status === 'uploading' || !file || !formData.title}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-10 rounded-xl transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'uploading' ? 'Uploading...' : 'Publish Content'}
            </button>
          </div>

        </form>
      )}
    </div>
  )
}
