// src/pages/dashboard/CreateParty.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Calendar, MapPin, FileText, Image, Loader2, PartyPopper, Clock, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { partyService } from '../../services/partyService';
import { partySchema, type PartyFormData } from '../../validations';
import { compressCover } from '../../utils/imageCompressor';

export default function CreateParty() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [sizeInfo, setSizeInfo] = useState<{ original: number; compressed: number } | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<PartyFormData>({
    resolver: zodResolver(partySchema),
  });

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCompressing(true);
    setSizeInfo(null);
    try {
      const compressed = await compressCover(file);
      setCoverFile(compressed);
      setCoverPreview(URL.createObjectURL(compressed));
      setSizeInfo({ original: file.size, compressed: compressed.size });
    } catch {
      // Fallback: use original if compression fails
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    } finally {
      setCompressing(false);
    }
  };

  const onSubmit = async (data: PartyFormData) => {
    if (!user) return;
    setLoading(true);
    try {
      const party = await partyService.createParty(user.id, data);

      // Upload cover image if provided
      if (coverFile) {
        const imageUrl = await partyService.uploadCoverImage(coverFile, party.id);
        await partyService.updateParty(party.id, { cover_image: imageUrl });
      }

      toast.success('Party created successfully!');
      navigate(`/dashboard/parties/${party.id}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create party.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all";
  const labelClass = "block text-sm font-medium text-textPrimary mb-1.5";

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-textPrimary flex items-center gap-2">
          <PartyPopper className="w-6 h-6 text-primary" /> Create New Party
        </h1>
        <p className="text-textSecondary text-sm mt-1">Fill in the details to set up your food review event</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-border shadow-sm p-6 sm:p-8"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Cover Image */}
          <div>
            <label className={labelClass}>Cover Image</label>
            <div
              className="relative border-2 border-dashed border-border rounded-xl overflow-hidden cursor-pointer hover:border-primary transition-colors"
              onClick={() => document.getElementById('cover-input')?.click()}
            >
              {compressing ? (
                <div className="h-48 flex flex-col items-center justify-center gap-2 text-textSecondary">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-sm">Compressing image…</p>
                </div>
              ) : coverPreview ? (
                <div className="relative">
                  <img src={coverPreview} alt="Cover preview" className="w-full h-48 object-cover" />
                  {sizeInfo && (
                    <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-lg flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-green-400" />
                      {(sizeInfo.original / 1024).toFixed(0)} KB → {(sizeInfo.compressed / 1024).toFixed(0)} KB
                      ({Math.round((1 - sizeInfo.compressed / sizeInfo.original) * 100)}% saved)
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-48 flex flex-col items-center justify-center gap-2 text-textSecondary">
                  <Image className="w-10 h-10 text-border" />
                  <p className="text-sm font-medium">Click to upload cover image</p>
                  <p className="text-xs">PNG, JPG, WEBP — auto-compressed before upload</p>
                </div>
              )}
              <input
                id="cover-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCoverChange}
              />
            </div>
          </div>

          {/* Party Name */}
          <div>
            <label className={labelClass}>Party Name *</label>
            <input {...register('party_name')} placeholder="e.g. Summer Dinner Night 2025" className={inputClass} />
            {errors.party_name && <p className="text-red-500 text-xs mt-1">{errors.party_name.message}</p>}
          </div>

          {/* Description */}
          <div>
            <label className={labelClass}>
              <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Description</span>
            </label>
            <textarea
              {...register('description')}
              placeholder="Tell your guests what this party is about..."
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>

          {/* Event Date + Venue */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Event Date *</span>
              </label>
              <input {...register('event_date')} type="date" className={inputClass} />
              {errors.event_date && <p className="text-red-500 text-xs mt-1">{errors.event_date.message}</p>}
            </div>
            <div>
              <label className={labelClass}>
                <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Venue</span>
              </label>
              <input {...register('venue')} placeholder="Restaurant name or address" className={inputClass} />
            </div>
          </div>

          {/* Review Deadline */}
          <div>
            <label className={labelClass}>
              <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Review Deadline (optional)</span>
            </label>
            <input {...register('review_deadline')} type="datetime-local" className={inputClass} />
            <p className="text-xs text-textSecondary mt-1">After this date/time, guests cannot submit new reviews.</p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-secondary text-white font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating party…</> : '🎉 Create Party'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
