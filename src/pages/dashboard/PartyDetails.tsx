// src/pages/dashboard/PartyDetails.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Copy, Share2, PlusCircle, Utensils, Trash2,
  Loader2, Image, X, Calendar, MapPin, Users, Star, CheckCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { partyService } from '../../services/partyService';
import { foodService } from '../../services/foodService';
import { formatDate } from '../../utils';
import { foodItemSchema, type FoodItemFormData } from '../../validations';
import { compressFood } from '../../utils/imageCompressor';
import type { Party, FoodItem } from '../../types';

const CATEGORIES: FoodItem['category'][] = ['Starter', 'Main Course', 'Dessert', 'Beverage', 'Snack', 'Other'];
const categoryColors: Record<string, string> = {
  'Starter': 'bg-orange-100 text-orange-700',
  'Main Course': 'bg-green-100 text-green-700',
  'Dessert': 'bg-pink-100 text-pink-700',
  'Beverage': 'bg-blue-100 text-blue-700',
  'Snack': 'bg-yellow-100 text-yellow-700',
  'Other': 'bg-gray-100 text-gray-700',
};

export default function PartyDetails() {
  const { partyId } = useParams<{ partyId: string }>();
  const navigate = useNavigate();
  const [party, setParty] = useState<Party | null>(null);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddFood, setShowAddFood] = useState(false);
  const [foodImage, setFoodImage] = useState<File | null>(null);
  const [foodImagePreview, setFoodImagePreview] = useState<string | null>(null);
  const [foodCompressing, setFoodCompressing] = useState(false);
  const [foodSizeInfo, setFoodSizeInfo] = useState<{ original: number; compressed: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FoodItemFormData>({
    resolver: zodResolver(foodItemSchema),
    defaultValues: { category: 'Main Course' },
  });

  const fetchData = async () => {
    if (!partyId) return;
    try {
      const [p, items] = await Promise.all([
        partyService.getPartyById(partyId),
        foodService.getFoodItemsByParty(partyId),
      ]);
      setParty(p);
      setFoodItems(items);
    } catch { toast.error('Failed to load party'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [partyId]);

  const handleAddFood = async (data: FoodItemFormData) => {
    if (!partyId) return;
    setSubmitting(true);
    try {
      const item = await foodService.addFoodItem(partyId, data);
      let imageUrl = item.image_url;
      if (foodImage) {
        imageUrl = await foodService.uploadFoodImage(foodImage, item.id);
        await foodService.updateFoodItem(item.id, { image_url: imageUrl });
      }
      toast.success('Dish added!');
      setShowAddFood(false);
      reset();
      setFoodImage(null);
      setFoodImagePreview(null);
      setFoodSizeInfo(null);
      fetchData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to add dish');
    } finally { setSubmitting(false); }
  };

  const handleDeleteFood = async (itemId: string) => {
    if (!confirm('Delete this dish?')) return;
    try {
      await foodService.deleteFoodItem(itemId);
      setFoodItems(prev => prev.filter(i => i.id !== itemId));
      toast.success('Dish deleted');
    } catch { toast.error('Failed to delete dish'); }
  };

  const copyLink = () => {
    if (!party) return;
    const url = `${window.location.origin}/review/${party.public_slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied!');
  };

  if (loading) return <div className="flex justify-center h-64"><Loader2 className="w-8 h-8 text-primary animate-spin mt-20" /></div>;
  if (!party) return <div className="text-center py-20 text-textSecondary">Party not found.</div>;

  const inputClass = "w-full px-4 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-green-50 rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5 text-textSecondary" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-textPrimary">{party.party_name}</h1>
          <div className="flex flex-wrap gap-3 mt-1 text-sm text-textSecondary">
            <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {formatDate(party.event_date)}</span>
            {party.venue && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {party.venue}</span>}
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${party.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              {party.status}
            </span>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={copyLink} className="flex items-center gap-1.5 text-sm font-medium border border-border px-4 py-2 rounded-xl hover:border-primary hover:text-primary transition-all">
            <Copy className="w-4 h-4" /> Copy Link
          </button>
          <button
            onClick={() => window.open(`/review/${party.public_slug}`, '_blank')}
            className="flex items-center gap-1.5 text-sm font-medium bg-primary text-white px-4 py-2 rounded-xl hover:bg-secondary transition-all shadow-sm"
          >
            <Share2 className="w-4 h-4" /> Preview
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: Utensils, label: 'Food Items', value: foodItems.length },
          { icon: Users, label: 'Total Reviews', value: foodItems.reduce((s, f) => s + (f.review_count || 0), 0) },
          {
            icon: Star, label: 'Avg Rating',
            value: foodItems.length ? (foodItems.filter(f => f.average_rating && f.average_rating > 0).reduce((s, f) => s + (f.average_rating || 0), 0) / (foodItems.filter(f => (f.average_rating || 0) > 0).length || 1)).toFixed(1) + ' ★' : '—'
          },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-white rounded-2xl border border-border p-4 shadow-sm text-center">
            <Icon className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-xl font-bold text-textPrimary">{value}</p>
            <p className="text-xs text-textSecondary">{label}</p>
          </div>
        ))}
      </div>

      {/* Food Items */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-textPrimary">Food Items</h2>
          <button
            onClick={() => setShowAddFood(true)}
            className="inline-flex items-center gap-2 bg-primary hover:bg-secondary text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-sm"
          >
            <PlusCircle className="w-4 h-4" /> Add Dish
          </button>
        </div>

        {foodItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-dashed border-border text-textSecondary">
            <Utensils className="w-12 h-12 text-border mb-3" />
            <p className="font-semibold text-textPrimary">No dishes yet</p>
            <p className="text-sm mt-1">Add food items for guests to review</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {foodItems.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="h-36 bg-gradient-to-br from-green-50 to-emerald-100 relative">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.dish_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Utensils className="w-10 h-10 text-primary/20" />
                    </div>
                  )}
                  <span className={`absolute top-2 left-2 text-xs font-semibold px-2 py-0.5 rounded-full ${categoryColors[item.category] || 'bg-gray-100 text-gray-600'}`}>
                    {item.category}
                  </span>
                </div>
                <div className="p-3">
                  <h3 className="font-bold text-textPrimary truncate">{item.dish_name}</h3>
                  {item.description && <p className="text-xs text-textSecondary mt-1 line-clamp-2">{item.description}</p>}
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-textSecondary">
                      {item.review_count || 0} review{item.review_count !== 1 ? 's' : ''} · {item.average_rating ? `${item.average_rating}★` : 'No rating'}
                    </span>
                    <button onClick={() => handleDeleteFood(item.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Add Food Modal */}
      {showAddFood && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-textPrimary">Add New Dish</h2>
              <button onClick={() => {
                setShowAddFood(false); reset();
                setFoodImage(null); setFoodImagePreview(null); setFoodSizeInfo(null);
              }} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-textSecondary" />
              </button>
            </div>
            <form onSubmit={handleSubmit(handleAddFood)} className="space-y-4">
              {/* Image */}
              <div>
                <label className="block text-sm font-medium text-textPrimary mb-1.5">Food Image</label>
                <div
                  className="border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary transition-colors overflow-hidden"
                  onClick={() => document.getElementById('food-img')?.click()}
                >
                  {foodCompressing ? (
                    <div className="h-32 flex flex-col items-center justify-center gap-1 text-textSecondary">
                      <Loader2 className="w-6 h-6 text-primary animate-spin" />
                      <p className="text-xs">Compressing…</p>
                    </div>
                  ) : foodImagePreview ? (
                    <div className="relative">
                      <img src={foodImagePreview} alt="preview" className="w-full h-32 object-cover" />
                      {foodSizeInfo && (
                        <div className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-green-400" />
                          {(foodSizeInfo.compressed / 1024).toFixed(0)} KB saved
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-32 flex flex-col items-center justify-center gap-1 text-textSecondary">
                      <Image className="w-8 h-8 text-border" />
                      <p className="text-xs">Click to upload</p>
                    </div>
                  )}
                  <input id="food-img" type="file" accept="image/*" className="hidden" onChange={async e => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setFoodCompressing(true);
                    setFoodSizeInfo(null);
                    try {
                      const compressed = await compressFood(f);
                      setFoodImage(compressed);
                      setFoodImagePreview(URL.createObjectURL(compressed));
                      setFoodSizeInfo({ original: f.size, compressed: compressed.size });
                    } catch {
                      setFoodImage(f);
                      setFoodImagePreview(URL.createObjectURL(f));
                    } finally {
                      setFoodCompressing(false);
                    }
                  }} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-textPrimary mb-1.5">Dish Name *</label>
                <input {...register('dish_name')} placeholder="e.g. Butter Chicken" className={inputClass} />
                {errors.dish_name && <p className="text-red-500 text-xs mt-1">{errors.dish_name.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-textPrimary mb-1.5">Description</label>
                <textarea {...register('description')} rows={2} placeholder="Describe this dish…" className={`${inputClass} resize-none`} />
              </div>

              <div>
                <label className="block text-sm font-medium text-textPrimary mb-1.5">Category *</label>
                <select {...register('category')} className={inputClass}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-primary hover:bg-secondary text-white font-semibold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding…</> : 'Add Dish'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
