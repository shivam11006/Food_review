import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

// Auth pages
import Login from './pages/auth/Login'
import Signup from './pages/auth/Signup'
import ForgotPassword from './pages/auth/ForgotPassword'

// Dashboard pages
import DashboardLayout from './layouts/DashboardLayout'
import Overview from './pages/dashboard/Overview'
import MyParties from './pages/dashboard/MyParties'
import CreateParty from './pages/dashboard/CreateParty'
import PartyDetails from './pages/dashboard/PartyDetails'
import Reviews from './pages/dashboard/Reviews'
import Analytics from './pages/dashboard/Analytics'
import Settings from './pages/dashboard/Settings'

// Public page
import PublicReviewPage from './pages/public/PublicReviewPage'

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
  return user ? <>{children}</> : <Navigate to="/login" replace />
}

// Redirect logged-in users away from auth pages
function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? <Navigate to="/dashboard" replace /> : <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Root redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Auth */}
        <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
        <Route path="/signup" element={<AuthRoute><Signup /></AuthRoute>} />
        <Route path="/forgot-password" element={<AuthRoute><ForgotPassword /></AuthRoute>} />

        {/* Public review page */}
        <Route path="/review/:slug" element={<PublicReviewPage />} />

        {/* Dashboard (protected) */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardLayout>
              <Overview />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        <Route path="/dashboard/parties" element={
          <ProtectedRoute>
            <DashboardLayout>
              <MyParties />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        <Route path="/dashboard/create-party" element={
          <ProtectedRoute>
            <DashboardLayout>
              <CreateParty />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        <Route path="/dashboard/parties/:partyId" element={
          <ProtectedRoute>
            <DashboardLayout>
              <PartyDetails />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        <Route path="/dashboard/reviews" element={
          <ProtectedRoute>
            <DashboardLayout>
              <Reviews />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        <Route path="/dashboard/analytics" element={
          <ProtectedRoute>
            <DashboardLayout>
              <Analytics />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        <Route path="/dashboard/settings" element={
          <ProtectedRoute>
            <DashboardLayout>
              <Settings />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
