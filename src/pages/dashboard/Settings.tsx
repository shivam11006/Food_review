// src/pages/dashboard/Settings.tsx
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { motion } from 'framer-motion'
import { User, Mail, Save, Loader2, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '../../context/AuthContext'
import { authService } from '../../services/authService'


export default function Settings() {
  const { user, profile, refreshProfile } = useAuth()
  const [saving, setSaving] = useState(false)
  const [sendingReset, setSendingReset] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { full_name: profile?.full_name || '' },
  })

  const onSave = async (data: { full_name: string }) => {
    if (!user) return
    setSaving(true)
    try {
      await authService.updateProfile(user.id, { full_name: data.full_name })
      await refreshProfile()
      toast.success('Profile updated!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordReset = async () => {
    if (!user?.email) return
    setSendingReset(true)
    try {
      await authService.resetPassword(user.email)
      toast.success('Password reset email sent!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to send email')
    } finally {
      setSendingReset(false)
    }
  }

  const inputClass = "w-full px-4 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all bg-white"

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-textPrimary">Settings</h1>
        <p className="text-textSecondary text-sm mt-1">Manage your organizer account</p>
      </div>

      {/* Profile Section */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-border shadow-sm p-6"
      >
        <h2 className="text-base font-bold text-textPrimary mb-5 flex items-center gap-2">
          <User className="w-4 h-4 text-primary" /> Profile Information
        </h2>
        <form onSubmit={handleSubmit(onSave)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-textPrimary mb-1.5">Full Name</label>
            <input
              {...register('full_name', { required: 'Name is required' })}
              className={inputClass}
              placeholder="Your full name"
            />
            {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-textPrimary mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textSecondary" />
              <input
                value={user?.email || ''}
                disabled
                className={`${inputClass} pl-9 bg-gray-50 text-textSecondary cursor-not-allowed`}
              />
            </div>
            <p className="text-xs text-textSecondary mt-1">Email cannot be changed here</p>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 bg-primary hover:bg-secondary text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-all shadow-sm disabled:opacity-60"
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save Changes</>}
          </button>
        </form>
      </motion.div>

      {/* Security Section */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl border border-border shadow-sm p-6"
      >
        <h2 className="text-base font-bold text-textPrimary mb-5 flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" /> Security
        </h2>
        <p className="text-sm text-textSecondary mb-4">
          We'll send a password reset link to <strong>{user?.email}</strong>
        </p>
        <button
          onClick={handlePasswordReset}
          disabled={sendingReset}
          className="inline-flex items-center gap-2 border border-border hover:border-primary text-textSecondary hover:text-primary font-semibold px-5 py-2.5 rounded-xl text-sm transition-all disabled:opacity-60"
        >
          {sendingReset ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : 'Send Password Reset Email'}
        </button>
      </motion.div>

      {/* Account Info */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl border border-border shadow-sm p-6"
      >
        <h2 className="text-base font-bold text-textPrimary mb-3">Account Details</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-1 border-b border-border/50">
            <span className="text-textSecondary">User ID</span>
            <span className="font-mono text-xs text-textPrimary truncate max-w-[200px]">{user?.id}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-textSecondary">Member Since</span>
            <span className="text-textPrimary">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</span>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
