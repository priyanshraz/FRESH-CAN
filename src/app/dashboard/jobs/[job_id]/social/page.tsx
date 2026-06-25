'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import SocialApprovalCard from '@/components/SocialApprovalCard'
import StatusBadge from '@/components/StatusBadge'
import TopBar from '@/components/layout/TopBar'
import { SocialPageSkeleton } from '@/components/skeletons/Skeleton'
import {
  getContentJob,
  getGeneratedContent,
  getSocialPostsForJob,
  upsertSocialPost,
  updateSocialPostStatus,
  getPlatformLogsForPost,
} from '@/services/contentService'
import type {
  ContentJob,
  ContentType,
  GeneratedContent,
  SocialPost,
  SocialPlatformLog,
  PlatformType,
} from '@/types/content'
import {
  AlertCircle,
  FileVideo,
  Image,
  FileText,
  RefreshCw,
} from 'lucide-react'

const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  image_post: 'Image Post',
  video: 'Video',
  blog: 'Blog Post',
}

const typeIcons: Record<ContentType, React.ReactNode> = {
  video: <FileVideo className="h-3.5 w-3.5" />,
  image_post: <Image className="h-3.5 w-3.5" />,
  blog: <FileText className="h-3.5 w-3.5" />,
}

function ContentPreview({
  contentType,
  generated,
}: {
  contentType: ContentType
  generated: GeneratedContent | null
}) {
  if (!generated?.file_url) {
    return (
      <div className="flex h-48 flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 text-center">
        <div className="text-2xl mb-2">🎬</div>
        <p className="text-sm text-gray-400">Content not yet generated</p>
      </div>
    )
  }

  if (contentType === 'video') {
    return (
      <video
        src={generated.file_url}
        controls
        poster={generated.thumbnail_url ?? undefined}
        className="w-full rounded-xl shadow-sm"
      />
    )
  }

  if (contentType === 'image_post') {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={generated.file_url}
        alt="Generated image"
        className="w-full rounded-xl object-cover shadow-sm"
      />
    )
  }

  return (
    <a
      href={generated.file_url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2.5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-100"
    >
      <FileText className="h-4 w-4" />
      Open Blog Post →
    </a>
  )
}

export default function SocialPage() {
  const { job_id } = useParams<{ job_id: string }>()
  const router = useRouter()
  const [job, setJob] = useState<ContentJob | null>(null)
  const [generated, setGenerated] = useState<GeneratedContent[]>([])
  const [socialPosts, setSocialPosts] = useState<SocialPost[]>([])
  const [platformLogs, setPlatformLogs] = useState<Record<string, SocialPlatformLog[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [jobData, gen, posts] = await Promise.all([
        getContentJob(job_id),
        getGeneratedContent(job_id),
        getSocialPostsForJob(job_id),
      ])
      if (!jobData) throw new Error('Job not found')
      if (jobData.status !== 'ready') {
        router.push(`/dashboard/jobs/${job_id}`)
        return
      }
      setJob(jobData)
      setGenerated(gen)
      setSocialPosts(posts)
      const logs: Record<string, SocialPlatformLog[]> = {}
      await Promise.all(
        posts.map(async (post) => {
          logs[post.id] = await getPlatformLogsForPost(post.id)
        }),
      )
      setPlatformLogs(logs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [job_id, router])

  useEffect(() => { load() }, [load])

  const getSocialPostForType = (type: ContentType): SocialPost | null =>
    socialPosts.find((p) => p.content_type === type) ?? null

  const getGeneratedForType = (type: ContentType): GeneratedContent | null =>
    generated.find((g) => g.content_type === type) ?? null

  const handleApprovePost = async (
    contentType: ContentType,
    caption: string,
    hashtags: string[],
    platforms: PlatformType[],
  ) => {
    const post = await upsertSocialPost(job_id, contentType, caption, hashtags, platforms)
    await updateSocialPostStatus(post.id, 'posting')

    // Fix #16 — use server-side proxy instead of exposing n8n URL in browser
    const res = await fetch('/api/n8n/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'social',
        payload: {
          job_id,
          social_post_id: post.id,
          content_type: contentType,
          caption,
          hashtags,
          platforms,
          brand: 'Fresh-CAN',
        },
      }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error ?? `Social webhook returned ${res.status}`)
    }

    await load()
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-14 w-full animate-pulse rounded-xl bg-gray-100" />
        <div className="h-10 w-64 animate-pulse rounded-lg bg-gray-100" />
        <SocialPageSkeleton />
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
          <AlertCircle className="h-8 w-8 text-red-400" />
        </div>
        <h3 className="text-base font-semibold text-gray-700">{error ?? 'Job not found'}</h3>
        <div className="mt-6 flex gap-3">
          <Button variant="outline" onClick={() => router.push('/dashboard')}>
            Back to Dashboard
          </Button>
          <Button onClick={() => { setLoading(true); setError(null); load() }}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  const contentTypes = job.content_types as ContentType[]

  return (
    <div className="space-y-6">
      <TopBar
        title="Social Approval"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Jobs', href: `/dashboard/jobs/${job_id}` },
          { label: job.topic.length > 28 ? job.topic.slice(0, 28) + '…' : job.topic },
          { label: 'Social' },
        ]}
        actions={<StatusBadge status={job.status} />}
      />

      <Tabs defaultValue={contentTypes[0]}>
        <TabsList
          className="grid w-full"
          style={{ gridTemplateColumns: `repeat(${contentTypes.length}, 1fr)` }}
        >
          {contentTypes.map((type) => {
            const post = getSocialPostForType(type)
            return (
              <TabsTrigger key={type} value={type} className="gap-1.5">
                {typeIcons[type]}
                {CONTENT_TYPE_LABELS[type]}
                {post && <StatusBadge status={post.status} className="text-[10px]" />}
              </TabsTrigger>
            )
          })}
        </TabsList>

        {contentTypes.map((type) => {
          // Fix #10 — cache lookup once per tab instead of calling getSocialPostForType 3×
          const socialPost = getSocialPostForType(type)
          return (
          <TabsContent key={type} value={type} className="mt-4">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Preview */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700">
                  Generated Content Preview
                </h3>
                <ContentPreview
                  contentType={type}
                  generated={getGeneratedForType(type)}
                />
              </div>

              {/* Social approval + logs */}
              <div className="space-y-4">
                <SocialApprovalCard
                  socialPost={socialPost}
                  contentType={type}
                  onApprove={(caption, hashtags, platforms) =>
                    handleApprovePost(type, caption, hashtags, platforms)
                  }
                />

                {/* Platform posting logs */}
                {socialPost && (
                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Platform Status
                    </h4>
                    <div className="space-y-2">
                      {(platformLogs[socialPost.id] ?? []).length === 0 ? (
                        <p className="text-xs text-gray-400">No platform activity yet.</p>
                      ) : (
                        (platformLogs[socialPost.id] ?? []).map((log) => (
                          <div
                            key={log.id}
                            className="flex items-center justify-between rounded-lg border bg-white px-3 py-2.5 text-xs shadow-sm"
                          >
                            <span className="font-medium capitalize text-gray-700">
                              {log.platform}
                            </span>
                            <div className="flex items-center gap-2">
                              <StatusBadge
                                status={log.status as Parameters<typeof StatusBadge>[0]['status']}
                              />
                              {log.post_url && (
                                <a
                                  href={log.post_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-500 underline hover:text-blue-700"
                                >
                                  View post
                                </a>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          )
        })}
      </Tabs>
    </div>
  )
}
