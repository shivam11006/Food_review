// src/pages/dashboard/Overview.tsx
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { PartyPopper, Utensils, Star, TrendingUp, Loader2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { reviewService } from '../../services/reviewService';
import { partyService } from '../../services/partyService';

const COLORS = ['#dc2626', '#f97316', '#eab308', '#22c55e', '#16a34a'];

interface Stats {
  totalParties: number;
  totalFoodItems: number;
  totalReviews: number;
  averageRating: number;
}

interface Analytics {
  byRating: Record<number, number>;
  byDish: { name: string; count: number; average: number }[];
  overTime: { date: string; count: number }[];
}

export default function Overview() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({ totalParties: 0, totalFoodItems: 0, totalReviews: 0, averageRating: 0 });
  const [analytics, setAnalytics] = useState<Analytics>({ byRating: {}, byDish: [], overTime: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [parties, analyticsData] = await Promise.all([
          partyService.getMyParties(user.id),
          reviewService.getAnalyticsForOrganizer(user.id),
        ]);

        const totalFoodItems = parties.reduce((sum, p) => {
          const count = (p as unknown as { food_items?: [{ count: number }] }).food_items?.[0]?.count || 0;
          return sum + count;
        }, 0);

        setStats({
          totalParties: parties.length,
          totalFoodItems,
          totalReviews: analyticsData.total,
          averageRating: analyticsData.average,
        });
        setAnalytics(analyticsData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const statCards = [
    { label: 'Total Parties', value: stats.totalParties, icon: PartyPopper, color: 'bg-violet-100 text-violet-600' },
    { label: 'Food Items', value: stats.totalFoodItems, icon: Utensils, color: 'bg-orange-100 text-orange-600' },
    { label: 'Total Reviews', value: stats.totalReviews, icon: Star, color: 'bg-yellow-100 text-yellow-600' },
    { label: 'Avg Rating', value: stats.averageRating > 0 ? `${stats.averageRating} ★` : '—', icon: TrendingUp, color: 'bg-green-100 text-green-600' },
  ];

  const ratingChartData = [1, 2, 3, 4, 5].map((r) => ({
    name: `${r}★`,
    count: analytics.byRating[r] || 0,
    fill: COLORS[r - 1],
  }));

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-textPrimary">Dashboard Overview</h1>
        <p className="text-textSecondary text-sm mt-1">Your food review statistics at a glance</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className={`inline-flex p-2.5 rounded-xl ${card.color} mb-3`}>
              <card.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-textPrimary">{card.value}</p>
            <p className="text-sm text-textSecondary mt-0.5">{card.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Rating Distribution */}
        <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
          <h2 className="text-base font-semibold text-textPrimary mb-4">Rating Distribution</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ratingChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {ratingChartData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Reviews Over Time */}
        <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
          <h2 className="text-base font-semibold text-textPrimary mb-4">Reviews Over Time</h2>
          {analytics.overTime.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={analytics.overTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#16A34A" strokeWidth={2} dot={{ fill: '#16A34A', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-textSecondary text-sm">
              No review activity yet
            </div>
          )}
        </div>
      </div>

      {/* Dish Rating Comparison */}
      {analytics.byDish.length > 0 && (
        <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
          <h2 className="text-base font-semibold text-textPrimary mb-4">Dish Rating Comparison</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={analytics.byDish.slice(0, 10)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={120} />
              <Tooltip formatter={(v) => [`${v} ★`, 'Avg Rating']} />
              <Bar dataKey="average" fill="#16A34A" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
