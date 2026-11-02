// src/pages/dashboard/Reviews.tsx
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Trash2, Star, Loader2, Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { reviewService } from '../../services/reviewService';
import { formatDateShort } from '../../utils';
import type { Review } from '../../types';

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`w-3.5 h-3.5 ${s <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
      ))}
    </div>
  );
}

export default function Reviews() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState<number | 'all'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const fetchReviews = async () => {
    if (!user) return;
    try {
      const data = await reviewService.getAllReviewsForOrganizer(user.id);
      setReviews(data);
    } catch { toast.error('Failed to load reviews'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchReviews(); }, [user]);

  const handleDelete = async (reviewId: string) => {
    if (!confirm('Delete this review?')) return;
    try {
      await reviewService.deleteReview(reviewId);
      setReviews(prev => prev.filter(r => r.id !== reviewId));
      toast.success('Review deleted');
    } catch { toast.error('Failed to delete review'); }
  };

  const filtered = reviews
    .filter(r => {
      const matchSearch = r.reviewer_name.toLowerCase().includes(search.toLowerCase()) ||
        (r.feedback || '').toLowerCase().includes(search.toLowerCase());
      const matchRating = ratingFilter === 'all' || r.rating === ratingFilter;
      return matchSearch && matchRating;
    })
    .sort((a, b) => {
      const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortOrder === 'newest' ? -diff : diff;
    });

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-textPrimary">Reviews</h1>
        <p className="text-textSecondary text-sm mt-1">{reviews.length} total reviews across all parties</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textSecondary" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by reviewer name or feedback…"
            className="w-full pl-9 pr-4 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            value={ratingFilter}
            onChange={e => setRatingFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="px-4 py-2.5 border border-border rounded-xl text-sm text-textSecondary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          >
            <option value="all">All Ratings</option>
            {[5, 4, 3, 2, 1].map(r => <option key={r} value={r}>{r} Stars</option>)}
          </select>
          <select
            value={sortOrder}
            onChange={e => setSortOrder(e.target.value as 'newest' | 'oldest')}
            className="px-4 py-2.5 border border-border rounded-xl text-sm text-textSecondary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
      </div>

      {/* Reviews Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-border text-textSecondary">
          <Star className="w-14 h-14 text-border mb-4" />
          <p className="font-semibold text-textPrimary text-lg">No reviews found</p>
          <p className="text-sm mt-1">Reviews will appear here after guests rate dishes</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-border">
                <tr>
                  {['Reviewer', 'Party', 'Dish', 'Rating', 'Feedback', 'Date', ''].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-textSecondary px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((review, i) => (
                  <motion.tr
                    key={review.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                          {review.reviewer_name[0].toUpperCase()}
                        </div>
                        <span className="font-medium text-sm text-textPrimary">{review.reviewer_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-textSecondary max-w-[120px] truncate">
                      {(review as unknown as { parties?: { party_name: string } }).parties?.party_name || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-textSecondary max-w-[120px] truncate">
                      {(review as unknown as { food_items?: { dish_name: string } }).food_items?.dish_name || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StarDisplay rating={review.rating} />
                    </td>
                    <td className="px-4 py-3 text-sm text-textSecondary max-w-[200px]">
                      <p className="line-clamp-2">{review.feedback || <em>No feedback</em>}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-textSecondary whitespace-nowrap">
                      {formatDateShort(review.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(review.id)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
