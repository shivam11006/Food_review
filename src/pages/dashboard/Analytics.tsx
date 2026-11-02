// src/pages/dashboard/Analytics.tsx
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Cell,
} from 'recharts'
import { TrendingUp, Star, Award, ThumbsDown, Loader2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { reviewService } from '../../services/reviewService'

const COLORS = ['#dc2626', '#f97316', '#eab308', '#22c55e', '#16a34a']

export default function Analytics() {
  const { user } = useAuth()
  const [analytics, setAnalytics] = useState<{
    total: number
    average: number
    byRating: Record<number, number>
    byDish: { name: string; count: number; average: number }[]
    overTime: { date: string; count: number }[]
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    reviewService.getAnalyticsForOrganizer(user.id)
      .then(setAnalytics)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [user])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  )

  if (!analytics) return null

  const ratingData = [1, 2, 3, 4, 5].map(r => ({
    name: `${r}★`,
    count: analytics.byRating[r] || 0,
    fill: COLORS[r - 1],
  }))

  const topDish = [...(analytics.byDish)].sort((a, b) => b.average - a.average)[0]
  const worstDish = [...(analytics.byDish)].sort((a, b) => a.average - b.average)[0]
  const mostReviewed = [...(analytics.byDish)].sort((a, b) => b.count - a.count)[0]

  const statCards = [
    { label: 'Total Reviews', value: analytics.total, icon: Star, color: 'bg-yellow-100 text-yellow-600' },
    { label: 'Avg Rating', value: analytics.average > 0 ? `${analytics.average} ★` : '—', icon: TrendingUp, color: 'bg-green-100 text-green-600' },
    { label: 'Highest Rated', value: topDish?.name || '—', icon: Award, color: 'bg-violet-100 text-violet-600', small: true },
    { label: 'Most Reviewed', value: mostReviewed?.name || '—', icon: ThumbsDown, color: 'bg-blue-100 text-blue-600', small: true },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-textPrimary">Analytics</h1>
        <p className="text-textSecondary text-sm mt-1">Deep insights into your food reviews</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-2xl border border-border p-5 shadow-sm"
          >
            <div className={`inline-flex p-2.5 rounded-xl ${card.color} mb-3`}>
              <card.icon className="w-5 h-5" />
            </div>
            <p className={`font-bold text-textPrimary ${card.small ? 'text-base' : 'text-2xl'} truncate`}>{card.value}</p>
            <p className="text-sm text-textSecondary mt-0.5">{card.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Rating Distribution */}
        <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
          <h2 className="text-base font-semibold text-textPrimary mb-4">Rating Distribution</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ratingData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 13 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {ratingData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Reviews Over Time */}
        <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
          <h2 className="text-base font-semibold text-textPrimary mb-4">Review Activity</h2>
          {analytics.overTime.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={analytics.overTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#16A34A" strokeWidth={2.5} dot={{ r: 4, fill: '#16A34A' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-textSecondary text-sm">
              No activity data yet
            </div>
          )}
        </div>
      </div>

      {/* Dish Comparison */}
      {analytics.byDish.length > 0 && (
        <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
          <h2 className="text-base font-semibold text-textPrimary mb-4">Dish Average Ratings</h2>
          <ResponsiveContainer width="100%" height={Math.max(200, analytics.byDish.length * 45)}>
            <BarChart data={analytics.byDish.slice(0, 10)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={130} />
              <Tooltip formatter={(v) => [`${v} ★`, 'Avg Rating']} />
              <Bar dataKey="average" fill="#16A34A" radius={[0, 6, 6, 0]}>
                {analytics.byDish.slice(0, 10).map((_, i) => (
                  <Cell key={i} fill={`hsl(${120 + i * 8}, 60%, ${45 + i * 2}%)`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Food Popularity */}
      {analytics.byDish.length > 0 && (
        <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
          <h2 className="text-base font-semibold text-textPrimary mb-4">Food Popularity (by reviews)</h2>
          <div className="space-y-3">
            {analytics.byDish
              .sort((a, b) => b.count - a.count)
              .slice(0, 8)
              .map((dish, i) => {
                const maxCount = analytics.byDish[0]?.count || 1
                const pct = Math.round((dish.count / maxCount) * 100)
                return (
                  <div key={dish.name} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-textSecondary w-4">{i + 1}</span>
                    <span className="text-sm font-medium text-textPrimary w-28 truncate">{dish.name}</span>
                    <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: i * 0.1 }}
                        className="h-full bg-primary rounded-full"
                      />
                    </div>
                    <span className="text-xs text-textSecondary w-16 text-right">{dish.count} reviews</span>
                  </div>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}
