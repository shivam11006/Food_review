// src/pages/dashboard/MyParties.tsx
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  PlusCircle, Search, Calendar, Utensils, Star, Eye, Pencil, Trash2,
  Copy, Share2, Loader2, PartyPopper, Lock, Unlock,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { partyService } from '../../services/partyService';
import { formatDateShort } from '../../utils';
import type { Party } from '../../types';

export default function MyParties() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'closed'>('all');

  const fetchParties = async () => {
    if (!user) return;
    try {
      const data = await partyService.getMyParties(user.id);
      setParties(data);
    } catch (err) {
      toast.error('Failed to load parties');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchParties(); }, [user]);

  const handleDelete = async (partyId: string) => {
    if (!confirm('Are you sure you want to delete this party? This cannot be undone.')) return;
    try {
      await partyService.deleteParty(partyId);
      toast.success('Party deleted');
      setParties(prev => prev.filter(p => p.id !== partyId));
    } catch { toast.error('Failed to delete party'); }
  };

  const handleToggleStatus = async (party: Party) => {
    const newStatus = party.status === 'active' ? 'closed' : 'active';
    try {
      const updated = await partyService.togglePartyStatus(party.id, newStatus);
      setParties(prev => prev.map(p => p.id === party.id ? updated : p));
      toast.success(`Party ${newStatus === 'active' ? 'reopened' : 'closed'}`);
    } catch { toast.error('Failed to update party status'); }
  };

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/review/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard!');
  };

  const shareWhatsApp = (slug: string, name: string) => {
    const url = `${window.location.origin}/review/${slug}`;
    window.open(`https://wa.me/?text=Rate the food at ${encodeURIComponent(name)}! ${encodeURIComponent(url)}`, '_blank');
  };

  const filtered = parties.filter(p => {
    const matchSearch = p.party_name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || p.status === filter;
    return matchSearch && matchFilter;
  });

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-textPrimary">My Parties</h1>
          <p className="text-textSecondary text-sm mt-1">{parties.length} parties created</p>
        </div>
        <Link
          to="/dashboard/create-party"
          className="inline-flex items-center gap-2 bg-primary hover:bg-secondary text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-all shadow-md hover:shadow-lg"
        >
          <PlusCircle className="w-4 h-4" /> Create Party
        </Link>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textSecondary" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search parties…"
            className="w-full pl-9 pr-4 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'active', 'closed'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all capitalize ${
                filter === f ? 'bg-primary text-white shadow-sm' : 'bg-white border border-border text-textSecondary hover:border-primary hover:text-primary'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Parties Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-textSecondary">
          <PartyPopper className="w-16 h-16 text-border mb-4" />
          <p className="text-lg font-semibold text-textPrimary">No parties yet</p>
          <p className="text-sm mt-1 mb-6">Create your first party to start collecting reviews</p>
          <Link
            to="/dashboard/create-party"
            className="inline-flex items-center gap-2 bg-primary text-white font-semibold px-5 py-2.5 rounded-xl text-sm shadow-md"
          >
            <PlusCircle className="w-4 h-4" /> Create Party
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((party, i) => {
            const foodCount = (party as unknown as { food_item_count?: number }).food_item_count ?? 0;
            const reviewCount = (party as unknown as { review_count?: number }).review_count ?? 0;
            return (
              <motion.div
                key={party.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="bg-white rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                {/* Cover */}
                <div className="relative h-44 bg-gradient-to-br from-green-100 to-emerald-200 overflow-hidden">
                  {party.cover_image ? (
                    <img src={party.cover_image} alt={party.party_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <PartyPopper className="w-16 h-16 text-primary/30" />
                    </div>
                  )}
                  <span className={`absolute top-3 right-3 text-xs font-bold px-2.5 py-1 rounded-full ${
                    party.status === 'active' ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'
                  }`}>
                    {party.status}
                  </span>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-bold text-textPrimary text-base truncate">{party.party_name}</h3>
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-textSecondary">
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {formatDateShort(party.event_date)}</span>
                    <span className="flex items-center gap-1"><Utensils className="w-3.5 h-3.5" /> {foodCount} dishes</span>
                    <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5" /> {reviewCount} reviews</span>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    <button onClick={() => navigate(`/dashboard/parties/${party.id}`)} className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-secondary bg-green-50 px-3 py-1.5 rounded-lg transition-colors">
                      <Eye className="w-3.5 h-3.5" /> View
                    </button>
                    <button onClick={() => navigate(`/dashboard/parties/${party.id}/edit`)} className="flex items-center gap-1.5 text-xs font-medium text-textSecondary hover:text-primary bg-gray-50 px-3 py-1.5 rounded-lg transition-colors">
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button onClick={() => copyLink(party.public_slug)} className="flex items-center gap-1.5 text-xs font-medium text-textSecondary hover:text-primary bg-gray-50 px-3 py-1.5 rounded-lg transition-colors">
                      <Copy className="w-3.5 h-3.5" /> Copy Link
                    </button>
                    <button onClick={() => shareWhatsApp(party.public_slug, party.party_name)} className="flex items-center gap-1.5 text-xs font-medium text-textSecondary hover:text-primary bg-gray-50 px-3 py-1.5 rounded-lg transition-colors">
                      <Share2 className="w-3.5 h-3.5" /> Share
                    </button>
                    <button onClick={() => handleToggleStatus(party)} className="flex items-center gap-1.5 text-xs font-medium text-textSecondary hover:text-primary bg-gray-50 px-3 py-1.5 rounded-lg transition-colors">
                      {party.status === 'active' ? <><Lock className="w-3.5 h-3.5" /> Close</> : <><Unlock className="w-3.5 h-3.5" /> Reopen</>}
                    </button>
                    <button onClick={() => handleDelete(party.id)} className="flex items-center gap-1.5 text-xs font-medium text-red-500 hover:text-red-700 bg-red-50 px-3 py-1.5 rounded-lg transition-colors">
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
