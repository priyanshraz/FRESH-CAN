'use client'

import { useState } from 'react'
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

// ─── Types ────────────────────────────────────────────────────────────────────

type ContentType = 'video' | 'image_post' | 'blog'
type ScriptType  = 'SOLUTION' | 'COMMUNITY'
type Language    = 'EN' | 'FR' | 'BOTH'

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

// Builds the exact payload each n8n webhook expects
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
  // script_type and video_duration only go to the video webhook
  if (type === 'video') {
    return { ...base, script_type: form.script_type, video_duration: form.video_duration }
  }
  return base
}

// Inline label component (no ShadCN label installed)
function FL({
  children,
  htmlFor,
}: {
  children: React.ReactNode
  htmlFor?: string
}) {
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

  const [form, setForm] = useState<FormData>({
    topic:           '',
    keywords:        '',
    category:        'Food Desert Education',
    target_audience: 'General public',
    script_type:     'SOLUTION',
    video_duration:  '36',
    language:        'EN',
    content_types:   ['video', 'image_post', 'blog'], // all on by default
  })

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setForm((p) => ({ ...p, [key]: value }))

  const toggleType = (type: ContentType) =>
    setForm((p) => ({
      ...p,
      content_types: p.content_types.includes(type)
        ? p.content_types.filter((t) => t !== type)
        : [...p.content_types, type],
    }))

  const videoOn = form.content_types.includes('video')
  const isSubmitting = phase !== 'idle'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate
    if (!form.topic.trim())              return setError('Topic is required')
    if (!form.keywords.trim())           return setError('Keywords are required')
    if (form.content_types.length === 0) return setError('Select at least one content type')

    // Step 1 — insert Supabase row
    setPhase('creating')
    const { data: job, error: insertError } = await supabase
      .from('content_jobs')
      .insert({
        topic:           form.topic.trim(),
        keywords:        form.keywords.trim(),
        category:        form.category,
        target_audience: form.target_audience,
        brand:           'Fresh-CAN',
        language:        form.language,
        content_types:   form.content_types,
        status:          'pending',
      })
      .select()
      .single()

    if (insertError || !job) {
      setError(insertError?.message ?? 'Failed to create job. Please try again.')
      setPhase('idle')
      return
    }

    // Step 2 — fire all selected webhooks and WAIT for results
    setPhase('triggering')
    const results = await Promise.allSettled(
      form.content_types.map(async (type) => {
        const res = await fetch('/api/n8n/trigger', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type,
            payload: buildPayload(job.id, form, type),
          }),
        })
        if (!res.ok) {
          const b = await res.json().catch(() => ({}))
          throw new Error(`[${type}] ${b.error ?? `HTTP ${res.status}`}`)
        }
        return type
      }),
    )

    // Stamp webhook_sent_at regardless of outcome
    supabase
      .from('content_jobs')
      .update({ webhook_sent_at: new Date().toISOString() })
      .eq('id', job.id)
      .then(() => { /* fire-and-forget */ })

    // Surface any webhook failures — don't silently swallow them
    const failed = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[]
    if (failed.length > 0) {
      const msgs = failed.map((r) => (r.reason as Error).message).join(' · ')
      setError(`n8n webhook error: ${msgs}`)
      setPhase('idle')
      return
    }

    router.push(`/dashboard/jobs/${job.id}`)
  }

  return (
    <div className="mx-auto max-w-[600px] py-6">

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
                value={form.topic}
                onChange={(e) => set('topic', e.target.value)}
                placeholder="e.g. Food Deserts in Calgary"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-1.5">
              <FL htmlFor="keywords">Keywords <span className="text-red-500">*</span></FL>
              <Input
                id="keywords"
                value={form.keywords}
                onChange={(e) => set('keywords', e.target.value)}
                placeholder="food desert, mobile grocery, fresh food, Canada"
                disabled={isSubmitting}
              />
              <p className="text-xs text-gray-400">Separate with commas</p>
            </div>

            <div className="space-y-1.5">
              <FL>Content Category <span className="text-red-500">*</span></FL>
              <Select
                value={form.category}
                onValueChange={(v) => { if (v) set('category', v) }}
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
                value={form.target_audience}
                onValueChange={(v) => { if (v) set('target_audience', v) }}
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
                value={form.language}
                onValueChange={(v) => { if (v) set('language', v as Language) }}
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
              const checked = form.content_types.includes(id)
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

        {/* ── Section 3: Video Settings (shown only when Video is checked) */}
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
                  value={form.script_type}
                  onValueChange={(v) => { if (v) set('script_type', v as ScriptType) }}
                  disabled={isSubmitting}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SOLUTION">SOLUTION</SelectItem>
                    <SelectItem value="COMMUNITY">COMMUNITY</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  {form.script_type === 'SOLUTION'
                    ? 'Data-driven, community advocate perspective'
                    : 'First-person, food-insecure person perspective'}
                </p>
              </div>

              <div className="space-y-1.5">
                <FL>Video Duration <span className="text-red-500">*</span></FL>
                <Select
                  value={form.video_duration}
                  onValueChange={(v) => { if (v) set('video_duration', v) }}
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
          disabled={isSubmitting || form.content_types.length === 0}
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
              {form.content_types.length === 3
                ? 'Generate All 3 Content Types'
                : form.content_types.length === 0
                  ? 'Select a content type'
                  : `Generate ${form.content_types.length} Content Type${form.content_types.length > 1 ? 's' : ''}`}
            </>
          )}
        </Button>

        {/* Cancel */}
        <div className="text-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Cancel — back to Dashboard
          </Link>
        </div>

      </form>
    </div>
  )
}
