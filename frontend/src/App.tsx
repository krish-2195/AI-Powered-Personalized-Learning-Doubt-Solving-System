import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import { useAuth } from './context/AuthContext'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'))
const AcceptInvite = lazy(() => import('./pages/AcceptInvite'))
const Learning = lazy(() => import('./pages/Learning'))
const ChatPage = lazy(() => import('./pages/ChatPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'))
const VideoLearningPage = lazy(() => import('./pages/VideoLearningPage'))

// Admin pages (Phase 3)
const AdminLayout = lazy(() => import('./components/AdminLayout'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminUsers = lazy(() => import('./pages/admin/UserManagement'))
const AdminContent = lazy(() => import('./pages/admin/ContentModeration'))
const AdminReports = lazy(() => import('./pages/admin/ReportsAnalytics'))
const SystemSettings = lazy(() => import('./pages/admin/SystemSettings'))

// Instructor pages (Phase 2)
const InstructorLayout = lazy(() => import('./components/InstructorLayout'))
const InstructorDashboard = lazy(() => import('./pages/instructor/InstructorDashboard'))
const UploadContent = lazy(() => import('./pages/instructor/UploadContent'))
const QuestionBank = lazy(() => import('./pages/instructor/QuestionBank'))
const AIAnalytics = lazy(() => import('./pages/instructor/AIAnalytics'))
const InstructorCourses = lazy(() => import('./pages/instructor/InstructorCourses'))
const StudentAnalytics = lazy(() => import('./pages/instructor/StudentAnalytics'))

function App() {
  const { token, user } = useAuth()
  const isAuthenticated = !!token
  const role = user?.role

  const redirect = <Navigate to="/login" replace state={{ message: 'Please log in to continue.' }} />

  // Determine where authenticated users should go based on role
  const getHomeRedirect = () => {
    if (!isAuthenticated) return redirect
    if (role === 'admin' || role === 'super_admin') return <Navigate to="/admin" replace />
    if (role === 'instructor') return <Navigate to="/instructor" replace />
    return <Layout />
  }

  const protectedLayout = getHomeRedirect()

  const protectedAdmin = isAuthenticated && (role === 'admin' || role === 'super_admin')
    ? <AdminLayout />
    : <Navigate to="/dashboard" replace />

  const protectedInstructor = isAuthenticated && (role === 'instructor' || role === 'admin' || role === 'super_admin')
    ? <InstructorLayout />
    : <Navigate to="/dashboard" replace />

  const Fallback = () => (
    <div className="flex items-center justify-center min-h-screen bg-slate-900">
      <div className="w-6 h-6 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  )

  return (
    <Suspense fallback={<Fallback />}>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/accept-invite" element={<AcceptInvite />} />

        {/* Admin routes */}
        <Route path="/admin" element={protectedAdmin}>
          <Route element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="content" element={<AdminContent />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="settings" element={<SystemSettings />} />
          </Route>
        </Route>

        {/* Instructor routes */}
        <Route path="/instructor" element={protectedInstructor}>
          <Route index element={<InstructorDashboard />} />
          <Route path="dashboard" element={<InstructorDashboard />} />
          <Route path="upload" element={<UploadContent />} />
          <Route path="questions" element={<QuestionBank />} />
          <Route path="courses" element={<InstructorCourses />} />
          <Route path="analytics" element={<StudentAnalytics />} />
          <Route path="ai-analytics" element={<AIAnalytics />} />
        </Route>
        
        {/* Student routes */}
        <Route path="/" element={protectedLayout}>
          <Route index element={isAuthenticated ? <Dashboard /> : redirect} />
          <Route path="dashboard" element={isAuthenticated ? <Dashboard /> : redirect} />
          <Route path="learning" element={isAuthenticated ? <Learning /> : redirect} />
          <Route path="learning/video/:id" element={isAuthenticated ? <VideoLearningPage /> : redirect} />
          <Route path="chat" element={isAuthenticated ? <ChatPage /> : redirect} />
          <Route path="profile" element={isAuthenticated ? <ProfilePage /> : redirect} />
          <Route path="analytics" element={isAuthenticated ? <AnalyticsPage /> : redirect} />
        </Route>
      </Routes>
    </Suspense>
  )
}

export default App
