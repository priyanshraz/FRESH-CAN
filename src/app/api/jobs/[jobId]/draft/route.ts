import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  // Use service role key if available, otherwise anon key (RLS is disabled on all tables)
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params

  let body: { draft_data: Record<string, unknown>; content_type?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.draft_data) {
    return NextResponse.json({ error: 'Missing draft_data' }, { status: 400 })
  }

  const contentType = body.content_type ?? 'video'
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('content_drafts')
    .update({
      draft_data: body.draft_data,
      is_edited: true,
      updated_at: new Date().toISOString(),
    })
    .eq('job_id', jobId)
    .eq('content_type', contentType)
    .select()
    .single()

  if (error) {
    console.error('[draft-patch] Supabase error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}
