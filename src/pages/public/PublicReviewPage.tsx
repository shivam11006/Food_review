// src/pages/public/PublicReviewPage.tsx
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Star, UtensilsCrossed, Calendar, MapPin, User, MessageSquare,
  CheckCircle, X, Loader2, Send,
} from 'lucide-react'
import { toast } from 'sonner'
import { partyService } from '../../services/partyService'
import { foodService } from '../../services/foodService'
import { reviewService } from '../../services/reviewService'
import { formatDate, getOrCreateReviewerToken, hasDishBeenReviewed, markDishReviewed, isDeadlinePassed } from '../../utils'
import type { Party, FoodItem } from '../../types'

const categoryColors: Record<string, string> = {
  'Starter': 'bg-orange-100 text-orange-700',
  'Main Course': 'bg-green-100 text-green-700',
  'Dessert': 'bg-pink-100 text-pink-700',
  'Beverage': 'bg-blue-100 text-blue-700',
  'Snack': 'bg-yellow-100 text-yellow-700',
  'Other': 'bg-gray-100 text-gray-700',
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          className="transition-transform hover:scale-110"
        >
          <Star
            className={`w-8 h-8 transition-colors ${
              s <= (hovered || value) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        </button>
      ))}
    </div>
  )
}

function StarDisplay({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(s => (
          <Star key={s} className={`w-3.5 h-3.5 ${s <= Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
        ))}
      </div>
      {count > 0 && <span className="text-xs text-textSecondary">{rating.toFixed(1)} ({count})</span>}
    </div>
  )
}

export default function PublicReviewPage() {
  const { slug } = useParams<{ slug: string }>()
  const [party, setParty] = useState<Party | null>(null)
  const [foodItems, setFoodItems] = useState<FoodItem[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Review modal state
  const [selectedDish, setSelectedDish] = useState<FoodItem | null>(null)
  const [reviewerName, setReviewerName] = useState('')
  const [rating, setRating] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [reviewedDishes, setReviewedDishes] = useState<Set<string>>(new Set())

  const fetchData = async () => {
    if (!slug) return
    try {
      const p = await partyService.getPartyBySlug(slug)
      const items = await foodService.getFoodItemsByParty(p.id)
      setParty(p)
      setFoodItems(items)

      // Check which dishes current browser already reviewed
      const token = getOrCreateReviewerToken()
      const reviewed = new Set<string>()
      for (const item of items) {
        if (hasDishBeenReviewed(item.id)) reviewed.add(item.id)
      }
      setReviewedDishes(reviewed)
    } catch {
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [slug])

  const openReviewModal = (dish: FoodItem) => {
    setSelectedDish(dish)
    setRating(0)
    setFeedback('')
    setSuccess(false)
  }

  const closeModal = () => {
    setSelectedDish(null)
    setSuccess(false)
  }

  const submitReview = async () => {
    if (!selectedDish || !party) return
    if (!reviewerName.trim()) { toast.error('Please enter your name'); return }
    if (rating === 0) { toast.error('Please select a rating'); return }

    setSubmitting(true)
    try {
      const token = getOrCreateReviewerToken()
      const alreadyReviewed = await reviewService.checkAlreadyReviewed(selectedDish.id, token)
      if (alreadyReviewed) {
        toast.error('You already reviewed this dish!')
        setSubmitting(false)
        return
      }

      await reviewService.submitReview({
        food_item_id: selectedDish.id,
        party_id: party.id,
        reviewer_name: reviewerName.trim(),
        rating,
        feedback: feedback.trim() || undefined,
        reviewer_token: token,
      })

      markDishReviewed(selectedDish.id)
      setReviewedDishes(prev => new Set([...prev, selectedDish.id]))
      setSuccess(true)

      // Refresh food items to show updated ratings
      const items = await foodService.getFoodItemsByParty(party.id)
      setFoodItems(items)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit review')
    } finally {
      setSubmitting(false)
    }
  }

  const deadlinePassed = party?.review_deadline ? isDeadlinePassed(party.review_deadline) : false
  const isClosed = party?.status === 'closed' || deadlinePassed

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-10 h-10 text-primary animate-spin" />
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-textSecondary">
      <UtensilsCrossed className="w-16 h-16 text-border" />
      <h1 className="text-2xl font-bold text-textPrimary">Party not found</h1>
      <p className="text-sm">The review link you followed may be invalid or expired.</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {/* Hero / Header */}
      <div className="relative">
        {party?.cover_image ? (
          <div className="h-64 sm:h-80 overflow-hidden">
            <img src={party.cover_image} alt={party?.party_name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          </div>
        ) : (
          <div className="h-48 bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <UtensilsCrossed className="w-20 h-20 text-white/30" />
          </div>
        )}

        <div className={`${party?.cover_image ? 'absolute bottom-0 left-0 right-0 text-white' : ''} px-4 sm:px-8 pb-6 pt-4`}>
          <div className="max-w-4xl mx-auto">
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl sm:text-4xl font-bold drop-shadow-sm"
            >
              {party?.party_name}
            </motion.h1>
            {party?.description && (
              <p className={`mt-2 text-sm sm:text-base ${party.cover_image ? 'text-white/80' : 'text-textSecondary'}`}>
                {party.description}
              </p>
            )}
            <div className={`flex flex-wrap gap-4 mt-3 text-sm ${party?.cover_image ? 'text-white/70' : 'text-textSecondary'}`}>
              <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {formatDate(party?.event_date || '')}</span>
              {party?.venue && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {party.venue}</span>}
              <span className="flex items-center gap-1.5"><User className="w-4 h-4" />
                Organized by {(party as unknown as { profiles?: { full_name: string } })?.profiles?.full_name || 'Organizer'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Closed Banner */}
      {isClosed && (
        <div className="bg-orange-50 border-y border-orange-200 px-4 py-3 text-center text-orange-700 text-sm font-medium">
          🔒 Reviews are currently closed for this event.
        </div>
      )}

      {/* Food Items */}
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-10">
        <h2 className="text-xl font-bold text-textPrimary mb-6 flex items-center gap-2">
          <UtensilsCrossed className="w-5 h-5 text-primary" /> Food Items ({foodItems.length})
        </h2>

        {foodItems.length === 0 ? (
          <div className="text-center py-20 text-textSecondary">
            <UtensilsCrossed className="w-12 h-12 text-border mx-auto mb-3" />
            <p>No food items added yet.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {foodItems.map((item, i) => {
              const alreadyReviewed = reviewedDishes.has(item.id)
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="h-44 relative overflow-hidden bg-gradient-to-br from-green-50 to-emerald-100">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.dish_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <UtensilsCrossed className="w-14 h-14 text-primary/20" />
                      </div>
                    )}
                    <span className={`absolute top-2 left-2 text-xs font-semibold px-2 py-0.5 rounded-full ${categoryColors[item.category] || 'bg-gray-100 text-gray-600'}`}>
                      {item.category}
                    </span>
                    {alreadyReviewed && (
                      <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Reviewed
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-textPrimary">{item.dish_name}</h3>
                    {item.description && (
                      <p className="text-xs text-textSecondary mt-1 line-clamp-2">{item.description}</p>
                    )}
                    <div className="mt-2">
                      {(item.review_count || 0) > 0 ? (
                        <StarDisplay rating={item.average_rating || 0} count={item.review_count || 0} />
                      ) : (
                        <p className="text-xs text-textSecondary">No reviews yet</p>
                      )}
                    </div>
                    <button
                      onClick={() => !isClosed && openReviewModal(item)}
                      disabled={isClosed || alreadyReviewed}
                      className={`mt-3 w-full py-2 rounded-xl text-sm font-semibold transition-all ${
                        alreadyReviewed
                          ? 'bg-green-50 text-green-600 border border-green-200 cursor-default'
                          : isClosed
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-primary hover:bg-secondary text-white shadow-sm hover:shadow-md'
                      }`}
                    >
                      {alreadyReviewed ? '✓ You reviewed this' : isClosed ? 'Reviews Closed' : '⭐ Rate This Dish'}
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Review Modal */}
      <AnimatePresence>
        {selectedDish && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50"
              onClick={closeModal}
            />
            <motion.div
              initial={{ opacity: 0, y: 80 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 80 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md p-6"
            >
              {success ? (
                <div className="text-center py-8">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}>
                    <CheckCircle className="w-20 h-20 text-primary mx-auto mb-4" />
                  </motion.div>
                  <h2 className="text-2xl font-bold text-textPrimary">Thank you!</h2>
                  <p className="text-textSecondary mt-2">Your review for <strong>{selectedDish.dish_name}</strong> has been submitted.</p>
                  <button
                    onClick={closeModal}
                    className="mt-6 bg-primary text-white font-semibold px-8 py-3 rounded-xl hover:bg-secondary transition-all shadow-md"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h2 className="text-lg font-bold text-textPrimary">Rate: {selectedDish.dish_name}</h2>
                      <p className="text-sm text-textSecondary">{selectedDish.category}</p>
                    </div>
                    <button onClick={closeModal} className="p-1.5 hover:bg-gray-100 rounded-lg">
                      <X className="w-5 h-5 text-textSecondary" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Name */}
                    <div>
                      <label className="block text-sm font-medium text-textPrimary mb-1.5 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" /> Your Name *
                      </label>
                      <input
                        value={reviewerName}
                        onChange={e => setReviewerName(e.target.value)}
                        placeholder="Enter your name"
                        className="w-full px-4 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      />
                    </div>

                    {/* Stars */}
                    <div>
                      <label className="block text-sm font-medium text-textPrimary mb-2">
                        Rating *
                      </label>
                      <StarRating value={rating} onChange={setRating} />
                      {rating > 0 && (
                        <p className="text-xs text-textSecondary mt-1">
                          {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
                        </p>
                      )}
                    </div>

                    {/* Feedback */}
                    <div>
                      <label className="block text-sm font-medium text-textPrimary mb-1.5 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5" /> Feedback (optional)
                      </label>
                      <textarea
                        value={feedback}
                        onChange={e => setFeedback(e.target.value)}
                        placeholder="Tell us what you think about this dish…"
                        rows={3}
                        className="w-full px-4 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
                      />
                    </div>

                    <button
                      onClick={submitReview}
                      disabled={submitting}
                      className="w-full bg-primary hover:bg-secondary text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-60"
                    >
                      {submitting
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
                        : <><Send className="w-4 h-4" /> Submit Review</>
                      }
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="text-center py-8 text-xs text-textSecondary border-t border-border mt-10">
        Powered by <span className="font-bold text-primary">FoodReview</span> · Share your honest feedback 🍽️
      </footer>
    </div>
  )
}
