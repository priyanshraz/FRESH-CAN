import { updateJobStatus } from '@/services/contentService'

const VIDEO_APPROVE_WEBHOOK =
  process.env.NEXT_PUBLIC_N8N_VIDEO_APPROVE_WEBHOOK ?? ''

export interface ApproveVideoScriptPayload {
  job_id: string
  approved_script_parts: unknown[]
  full_script: string
  script_config: unknown
  topic: string
  category: string
  language: string
  script_type: string
  video_duration: string
  brand: null
  persona: null
  category_direction: null
}

export async function approveVideoScript(
  jobId: string,
  payload: ApproveVideoScriptPayload,
): Promise<{ success: true; status: 'generating' }> {
  const webhookUrl = VIDEO_APPROVE_WEBHOOK

  // Fire-and-forget — do not await n8n; it processes in the background
  fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-n8n-secret': process.env.N8N_WEBHOOK_SECRET ?? '',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(3000),
  }).catch(() => {
    // Ignore errors — n8n processes in background
  })

  // Immediately update job status without waiting for n8n response
  await updateJobStatus(jobId, 'generating')

  return { success: true, status: 'generating' }
}
