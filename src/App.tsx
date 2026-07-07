import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import { useAuth } from './context/AuthContext'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const Learning = lazy(() => import('./pages/Learning'))
const ChatPage = lazy(() => import('./pages/ChatPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))

function App() {
  const { token, user } = useAuth()
  const isAuthenticated = !!token

  const redirect = <Navigate to="/login" replace state={{ message: 'Please log in to continue.' }} />
  const protectedLayout = isAuthenticated 
    ? (user?.role === 'admin' ? <Navigate to="/admin" replace /> : <Layout />)
    : redirect
  const protectedAdmin = isAuthenticated && user?.role === 'admin' ? <AdminPage /> : <Navigate to="/dashboard" replace />

  const Fallback = () => (
    <div className="flex items-center justify-center min-h-screen bg-slate-900">
      <div className="w-6 h-6 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  )

  return (
    <Suspense fallback={<Fallback />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/admin" element={protectedAdmin} />
        
        <Route path="/" element={protectedLayout}>
          <Route index element={isAuthenticated ? <Dashboard /> : redirect} />
          <Route path="dashboard" element={isAuthenticated ? <Dashboard /> : redirect} />
          <Route path="learning" element={isAuthenticated ? <Learning /> : redirect} />
          <Route path="chat" element={isAuthenticated ? <ChatPage /> : redirect} />
          <Route path="profile" element={isAuthenticated ? <ProfilePage /> : redirect} />
          <Route path="analytics" element={isAuthenticated ? <AnalyticsPage /> : redirect} />
        </Route>
      </Routes>
    </Suspense>
  )
}

export default App
