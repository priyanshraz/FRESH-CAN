import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const REGEN_WEBHOOKS: Record<string, string | undefined> = {
  video:      process.env.N8N_VIDEO_WEBHOOK,
  image_post: process.env.N8N_IMAGE_WEBHOOK,
  blog:       process.env.N8N_BLOG_WEBHOOK,
}

interface VideoDraftData {
  script_type?: string
  script_config?: { total_duration?: number }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { content_type, extra_instructions } = body as {
    content_type: string
    extra_instructions?: string
  }

  if (!content_type) {
    return NextResponse.json({ error: 'content_type required' }, { status: 400 })
  }

  const { data: job, error: jobErr } = await supabase
    .from('content_jobs')
    .select('*')
    .eq('id', jobId)
    .single()

  if (jobErr || !job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  // Load current draft to recover video settings
  const { data: currentDraft } = await supabase
    .from('content_drafts')
    .select('draft_data')
    .eq('job_id', jobId)
    .eq('content_type', content_type)
    .maybeSingle()

  // Reset draft to pending so UI shows "waiting" state
  await supabase
    .from('content_drafts')
    .update({ status: 'pending', is_approved: false, updated_at: new Date().toISOString() })
    .eq('job_id', jobId)
    .eq('content_type', content_type)

  // For image_post: reset generated_content so the old row isn't picked up by the poll
  if (content_type === 'image_post') {
    await supabase
      .from('generated_content')
      .update({ status: 'pending', updated_at: new Date().toISOString() })
      .eq('job_id', jobId)
      .eq('content_type', 'image_post')
  }

  // Reset job status to pending
  await supabase
    .from('content_jobs')
    .update({ status: 'pending', updated_at: new Date().toISOString() })
    .eq('id', jobId)

  const webhookUrl = REGEN_WEBHOOKS[content_type]
  if (webhookUrl) {
    const videoData = (currentDraft?.draft_data as VideoDraftData | undefined)
    const payload: Record<string, unknown> = {
      job_id:             jobId,
      topic:              job.topic,
      keywords:           job.keywords ?? '',
      category:           job.category,
      target_audience:    job.target_audience,
      language:           job.language,
      brand:              'Fresh-CAN',
      content_type,
      extra_instructions: extra_instructions || null,
      regenerate:         true,
    }

    if (content_type === 'video') {
      payload.script_type    = videoData?.script_type ?? 'SOLUTION'
      payload.video_duration = String(videoData?.script_config?.total_duration ?? '36')
    }

    const secret = process.env.N8N_WEBHOOK_SECRET ?? ''
    fetch(webhookUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'x-n8n-secret': secret },
      body:    JSON.stringify(payload),
      signal:  AbortSignal.timeout(8000),
    }).catch(() => {})
  }

  return NextResponse.json({ success: true })
}
