'use client'

import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorBannerProps {
  message: string
  onRetry?: () => void
  retryLabel?: string
}

export default function ErrorBanner({
  message,
  onRetry,
  retryLabel = 'Retry',
}: ErrorBannerProps) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
      <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
      <div className="flex-1">
        <p className="text-sm font-medium text-red-700">{message}</p>
      </div>
      {onRetry && (
        <Button
          size="sm"
          variant="outline"
          className="border-red-200 text-red-600 hover:bg-red-100"
          onClick={onRetry}
        >
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          {retryLabel}
        </Button>
      )}
    </div>
  )
}
