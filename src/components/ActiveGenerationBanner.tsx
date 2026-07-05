'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { useNewContentStore } from '../stores/newContentStore'

export default function ActiveGenerationBanner() {
  const { status, pendingJobId, topic, restoreSession } = useNewContentStore()

  useEffect(() => {
    restoreSession()
  }, [restoreSession])

  if (status !== 'pending' || !pendingJobId) return null

  return (
    <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100">
        <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-amber-900">Content generation in progress</p>
        <p className="truncate text-xs text-amber-700">{topic}</p>
      </div>
      <Link
        href={`/dashboard/jobs/${pendingJobId}`}
        className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-50"
      >
        View &amp; Approve →
      </Link>
    </div>
  )
}
