import { create } from 'zustand'

export type JobType = 'video' | 'blog' | 'image_post'

export interface TrackedJob {
  jobId:     string
  topic:     string
  type:      JobType
  status:    'generating' | 'completed'
  progress:  number
  startedAt: number
  notified:  boolean
}

interface ContentJobStore {
  jobs:               TrackedJob[]
  addJob:             (job: Omit<TrackedJob, 'startedAt' | 'notified'>) => void
  updateJob:          (jobId: string, updates: Partial<TrackedJob>) => void
  removeJob:          (jobId: string) => void
  markNotified:       (jobId: string) => void
  restoreFromSession: () => void
}

function persist(jobs: TrackedJob[]) {
  try { sessionStorage.setItem('fg_contentJobs', JSON.stringify(jobs)) } catch (_) {}
}

export const useContentJobStore = create<ContentJobStore>((set, get) => ({
  jobs: [],

  addJob: (job) => {
    if (get().jobs.some((j) => j.jobId === job.jobId)) return
    const next: TrackedJob[] = [
      ...get().jobs,
      { ...job, startedAt: Date.now(), notified: false },
    ]
    set({ jobs: next })
    persist(next)
  },

  updateJob: (jobId, updates) => {
    const next = get().jobs.map((j) => (j.jobId === jobId ? { ...j, ...updates } : j))
    set({ jobs: next })
    persist(next)
  },

  removeJob: (jobId) => {
    const next = get().jobs.filter((j) => j.jobId !== jobId)
    set({ jobs: next })
    persist(next)
  },

  markNotified: (jobId) => {
    const next = get().jobs.map((j) => (j.jobId === jobId ? { ...j, notified: true } : j))
    set({ jobs: next })
    persist(next)
  },

  restoreFromSession: () => {
    try {
      const raw = sessionStorage.getItem('fg_contentJobs')
      if (!raw) return
      const all: TrackedJob[] = JSON.parse(raw)
      // Only restore actively generating video jobs — completed ones are ephemeral
      set({ jobs: all.filter((j) => j.status === 'generating' && j.type === 'video') })
    } catch (_) {}
  },
}))
