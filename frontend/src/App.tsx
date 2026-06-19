import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Register from './pages/Register'
import Learning from './pages/Learning'
import QuizPage from './pages/QuizPage'
import ChatPage from './pages/ChatPage'
import ProfilePage from './pages/ProfilePage'
import AnalyticsPage from './pages/AnalyticsPage'
import AdminPage from './pages/AdminPage'
import { useAuth } from './context/AuthContext'

function App() {
  const { token } = useAuth()
  const isAuthenticated = !!token

  const redirect = <Navigate to="/login" replace state={{ message: 'Please log in to continue.' }} />
  const protectedLayout = isAuthenticated ? <Layout /> : redirect
  const protectedAdmin = isAuthenticated ? <AdminPage /> : redirect

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/admin" element={protectedAdmin} />
      
      <Route path="/" element={protectedLayout}>
        <Route index element={isAuthenticated ? <Dashboard /> : redirect} />
        <Route path="dashboard" element={isAuthenticated ? <Dashboard /> : redirect} />
        <Route path="learning" element={isAuthenticated ? <Learning /> : redirect} />
        <Route path="quiz/:quizId" element={isAuthenticated ? <QuizPage /> : redirect} />
        <Route path="chat" element={isAuthenticated ? <ChatPage /> : redirect} />
        <Route path="profile" element={isAuthenticated ? <ProfilePage /> : redirect} />
        <Route path="analytics" element={isAuthenticated ? <AnalyticsPage /> : redirect} />
      </Route>
    </Routes>
  )
}

export default App
