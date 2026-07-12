import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/** Ensure a valid token and redirect to login with a friendly message if missing. */
export function useRequireAuth() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!token) {
      navigate('/login', {
        replace: true,
        state: { message: 'Please log in to continue.', from: location.pathname },
      })
    }
  }, [token, navigate, location])

  return token
}
