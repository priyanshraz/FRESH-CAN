'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import VideoToast from '@/components/VideoToast'
import type { VideoNotification } from '@/components/VideoToast'
import { supabase } from '@/lib/supabase'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [notification, setNotification] = useState<VideoNotification | null>(null)

  useEffect(() => {
    const channel = supabase
      .channel('video-complete-global')
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'generated_content',
          filter: 'content_type=eq.video',
        },
        async (payload) => {
          const row = payload.new as {
            id: string
            job_id: string
            file_url: string | null
            output_data: Record<string, unknown> | null
          }

          if (!row.file_url) return

          const { data: job } = await supabase
            .from('content_jobs')
            .select('topic, category, language')
            .eq('id', row.job_id)
            .single()

          const duration = (row.output_data as Record<string, unknown> | null)?.duration_sec
          const subtitle = job
            ? `${job.category} | ${job.language}${duration ? ` | ${duration}s` : ''}`
            : 'Video generated successfully'

          setNotification({
            title:   `Video ready! 🎉 ${job?.topic ?? 'New video'}`,
            subtitle,
            job_id:  row.job_id,
          })
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // Don't show the toast when the user is already on the library page
  const isOnLibrary = pathname === '/dashboard/library'

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main className="pl-64">
        <div className="p-8">{children}</div>
      </main>

      {notification && !isOnLibrary && (
        <VideoToast
          notification={notification}
          onDismiss={() => setNotification(null)}
        />
      )}
    </div>
  )
}
