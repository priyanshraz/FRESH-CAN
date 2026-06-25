import { Card, CardContent } from '@/components/ui/card'
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KPICardProps {
  title: string
  value: number
  icon: LucideIcon
  /** e.g. +12 means +12% vs last period, -5 means -5%, 0 means no change */
  trendPercent?: number
  /** Label shown below the trend, e.g. "vs last week" */
  trendLabel?: string
  iconColor?: string
  iconBg?: string
}

export default function KPICard({
  title,
  value,
  icon: Icon,
  trendPercent,
  trendLabel = 'vs last week',
  iconColor = 'text-gray-600',
  iconBg = 'bg-gray-100',
}: KPICardProps) {
  const hasTrend = trendPercent !== undefined
  const isPositive = (trendPercent ?? 0) > 0
  const isNegative = (trendPercent ?? 0) < 0
  const isNeutral = (trendPercent ?? 0) === 0

  const trendColor = isPositive
    ? 'text-green-600'
    : isNegative
      ? 'text-red-500'
      : 'text-gray-400'

  const TrendIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus

  return (
    <Card className="border bg-white shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-500">{title}</p>
            <p className="mt-1 text-3xl font-bold tracking-tight text-gray-900">
              {value.toLocaleString()}
            </p>
            {hasTrend && (
              <div className="mt-2 flex items-center gap-1">
                <TrendIcon className={cn('h-3.5 w-3.5 flex-shrink-0', trendColor)} />
                <span className={cn('text-xs font-semibold', trendColor)}>
                  {isPositive ? '+' : ''}
                  {trendPercent}%
                </span>
                <span className="text-xs text-gray-400">{trendLabel}</span>
              </div>
            )}
            {!hasTrend && (
              <p className="mt-2 flex items-center gap-1 text-xs text-gray-400">
                <Minus className="h-3 w-3" />
                No comparison data
              </p>
            )}
          </div>
          <div className={cn('ml-4 flex-shrink-0 rounded-xl p-3', iconBg)}>
            <Icon className={cn('h-5 w-5', iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
