'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertCircle,
  Loader2,
  ArrowLeft,
  FileVideo,
  Image,
  FileText,
  Sparkles,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useNewContentStore } from '@/stores/newContentStore'
import type { ContentType, ScriptType, Language } from '@/stores/newContentStore'

// ─── Local types ──────────────────────────────────────────────────────────────

interface FormData {
  topic:           string
  keywords:        string
  category:        string
  target_audience: string
  script_type:     ScriptType
  video_duration:  string
  language:        Language
  content_types:   ContentType[]
}

type Phase = 'idle' | 'creating' | 'triggering'

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  'Food Desert Education',
  'AI & Mobile Technology',
  'Community Impact',
  'Customer Stories',
  'Behind the Mobile Unit',
  'How FreshCAN Works',
  'Fresh Produce & Local Farms',
] as const

const TARGET_AUDIENCES = [
  'Food-insecure families',
  'Community members',
  'Local farmers & partners',
  'General public',
] as const

const VIDEO_DURATIONS = ['24', '28', '32', '36', '40', '44', '48', '52'] as const

const CONTENT_TYPES: {
  id: ContentType
  label: string
  description: string
  icon: React.ReactNode
  iconBg: string
}[] = [
  {
    id: 'video',
    label: 'Video',
    description: 'AI video with voiceover script',
    icon: <FileVideo className="h-5 w-5" />,
    iconBg: 'text-purple-600 bg-purple-50',
  },
  {
    id: 'image_post',
    label: 'Image Post',
    description: 'KIE AI generated image + caption',
    icon: <Image className="h-5 w-5" />,
    iconBg: 'text-blue-600 bg-blue-50',
  },
  {
    id: 'blog',
    label: 'Blog Post',
    description: 'GPT-4o written long-form post',
    icon: <FileText className="h-5 w-5" />,
    iconBg: 'text-green-600 bg-green-50',
  },
]

function buildPayload(
  jobId: string,
  form: FormData,
  type: ContentType,
): Record<string, unknown> {
  const base = {
    job_id:          jobId,
    topic:           form.topic,
    keywords:        form.keywords,
    category:        form.category,
    target_audience: form.target_audience,
    language:        form.language,
    brand:           'Fresh-CAN',
    content_type:    type,
  }
  if (type === 'video') {
    return { ...base, script_type: form.script_type, video_duration: form.video_duration }
  }
  return base
}

function FL({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700">
      {children}
    </label>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewContentPage() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string | null>(null)

  const {
    topic, keywords, category, target_audience, script_type, video_duration,
    language, content_types, status, pendingJobId,
    restoreSession, setField, toggleType, startGeneration, clearOnCancel,
  } = useNewContentStore()

  useEffect(() => {
    restoreSession()
  }, [restoreSession])

  const isSubmitting = phase !== 'idle'
  const videoOn = content_types.includes('video')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!topic.trim())              return setError('Topic is required')
    if (!keywords.trim())           return setError('Keywords are required')
    if (content_types.length === 0) return setError('Select at least one content type')

    setPhase('creating')
    const { data: job, error: insertError } = await supabase
      .from('content_jobs')
      .insert({
        topic:           topic.trim(),
        keywords:        keywords.trim(),
        category,
        target_audience,
        brand:           'Fresh-CAN',
        language,
        content_types,
        status:          'pending',
      })
      .select()
      .single()

    if (insertError || !job) {
      setError(insertError?.message ?? 'Failed to create job. Please try again.')
      setPhase('idle')
      return
    }

    setPhase('triggering')
    const formSnapshot: FormData = {
      topic, keywords, category, target_audience,
      script_type, video_duration, language, content_types,
    }
    const results = await Promise.allSettled(
      content_types.map(async (type) => {
        const res = await fetch('/api/n8n/trigger', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type,
            payload: buildPayload(job.id, formSnapshot, type),
          }),
        })
        if (!res.ok) {
          const b = await res.json().catch(() => ({}))
          throw new Error(`[${type}] ${b.error ?? `HTTP ${res.status}`}`)
        }
        return type
      }),
    )

    supabase
      .from('content_jobs')
      .update({ webhook_sent_at: new Date().toISOString() })
      .eq('id', job.id)
      .then(() => {})

    const failed = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[]
    if (failed.length > 0) {
      const msgs = failed.map((r) => (r.reason as Error).message).join(' · ')
      setError(`n8n webhook error: ${msgs}`)
      setPhase('idle')
      return
    }

    // Persist session — cleared only after all content types are approved
    startGeneration(job.id)
    router.push(`/dashboard/jobs/${job.id}`)
  }

  const handleCancel = () => {
    if (status === 'pending') {
      const ok = window.confirm('Content is being generated. Cancel and lose all progress?')
      if (!ok) return
    }
    clearOnCancel()
    router.push('/dashboard')
  }

  return (
    <div className="mx-auto max-w-[600px] py-6">

      {/* ── Pending-job banner (shown when returning mid-generation) ── */}
      {status === 'pending' && pendingJobId && (
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100">
            <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-amber-900">Content generation in progress</p>
            <p className="truncate text-xs text-amber-700">{topic}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href={`/dashboard/jobs/${pendingJobId}`}
              className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-50"
            >
              View Job →
            </Link>
            <button
              type="button"
              onClick={() => {
                const ok = window.confirm('Cancel this generation and start a new request?')
                if (ok) clearOnCancel()
              }}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              Start New
            </button>
          </div>
        </div>
      )}

      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Generate New Content
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          One topic → Video, Image Post &amp; Blog generated simultaneously by AI
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── Section 1: Content Details ─────────────────────────────── */}
        <Card className="border bg-white shadow-sm">
          <CardHeader className="border-b py-4">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Content Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 pt-5">

            <div className="space-y-1.5">
              <FL htmlFor="topic">Topic <span className="text-red-500">*</span></FL>
              <Input
                id="topic"
                value={topic}
                onChange={(e) => setField('topic', e.target.value)}
                placeholder="e.g. Food Deserts in Calgary"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-1.5">
              <FL htmlFor="keywords">Keywords <span className="text-red-500">*</span></FL>
              <Input
                id="keywords"
                value={keywords}
                onChange={(e) => setField('keywords', e.target.value)}
                placeholder="food desert, mobile grocery, fresh food, Canada"
                disabled={isSubmitting}
              />
              <p className="text-xs text-gray-400">Separate with commas</p>
            </div>

            <div className="space-y-1.5">
              <FL>Content Category <span className="text-red-500">*</span></FL>
              <Select
                value={category}
                onValueChange={(v) => { if (v) setField('category', v) }}
                disabled={isSubmitting}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <FL>Target Audience <span className="text-red-500">*</span></FL>
              <Select
                value={target_audience}
                onValueChange={(v) => { if (v) setField('target_audience', v) }}
                disabled={isSubmitting}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TARGET_AUDIENCES.map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <FL>Language <span className="text-red-500">*</span></FL>
              <Select
                value={language}
                onValueChange={(v) => { if (v) setField('language', v as Language) }}
                disabled={isSubmitting}
              >
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EN">EN — English</SelectItem>
                  <SelectItem value="FR">FR — French</SelectItem>
                  <SelectItem value="BOTH">BOTH — EN + FR</SelectItem>
                </SelectContent>
              </Select>
            </div>

          </CardContent>
        </Card>

        {/* ── Section 2: What to Generate ────────────────────────────── */}
        <Card className="border bg-white shadow-sm">
          <CardHeader className="border-b py-4">
            <CardTitle className="text-sm font-semibold text-gray-800">
              What to Generate
            </CardTitle>
            <p className="mt-0.5 text-xs text-gray-500">
              All selected types fire simultaneously from the same topic.
            </p>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            {CONTENT_TYPES.map(({ id, label, description, icon, iconBg }) => {
              const checked = content_types.includes(id)
              return (
                <label
                  key={id}
                  className={`flex cursor-pointer items-center gap-4 rounded-xl border-2 p-4 transition-all ${
                    checked
                      ? 'border-green-500 bg-green-50/50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleType(id)}
                    disabled={isSubmitting}
                    className="shrink-0"
                  />
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
                    {icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{label}</p>
                    <p className="text-xs text-gray-500">{description}</p>
                  </div>
                </label>
              )
            })}
          </CardContent>
        </Card>

        {/* ── Section 3: Video Settings ───────────────────────────────── */}
        {videoOn && (
          <Card className="border border-purple-200 bg-purple-50/30 shadow-sm">
            <CardHeader className="border-b border-purple-200 py-4">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-purple-800">
                <FileVideo className="h-4 w-4" />
                Video Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pt-5">

              <div className="space-y-1.5">
                <FL>Script Type <span className="text-red-500">*</span></FL>
                <Select
                  value={script_type}
                  onValueChange={(v) => { if (v) setField('script_type', v as ScriptType) }}
                  disabled={isSubmitting}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SOLUTION">SOLUTION</SelectItem>
                    <SelectItem value="COMMUNITY">COMMUNITY</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  {script_type === 'SOLUTION'
                    ? 'Data-driven, community advocate perspective'
                    : 'First-person, food-insecure person perspective'}
                </p>
              </div>

              <div className="space-y-1.5">
                <FL>Video Duration <span className="text-red-500">*</span></FL>
                <Select
                  value={video_duration}
                  onValueChange={(v) => { if (v) setField('video_duration', v) }}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VIDEO_DURATIONS.map((d) => (
                      <SelectItem key={d} value={d}>{d} seconds</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

            </CardContent>
          </Card>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Submit */}
        <Button
          type="submit"
          disabled={isSubmitting || content_types.length === 0}
          size="lg"
          className="w-full bg-gray-900 py-6 text-base font-semibold hover:bg-gray-800 disabled:opacity-50"
        >
          {phase === 'creating' ? (
            <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Creating job…</>
          ) : phase === 'triggering' ? (
            <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Triggering n8n…</>
          ) : (
            <>
              <Sparkles className="mr-2 h-5 w-5" />
              {content_types.length === 3
                ? 'Generate All 3 Content Types'
                : content_types.length === 0
                  ? 'Select a content type'
                  : `Generate ${content_types.length} Content Type${content_types.length > 1 ? 's' : ''}`}
            </>
          )}
        </Button>

        {/* Cancel */}
        <div className="text-center">
          <button
            type="button"
            onClick={handleCancel}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Cancel — back to Dashboard
          </button>
        </div>

      </form>
    </div>
  )
}
