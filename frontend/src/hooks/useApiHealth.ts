import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'

export function useApiHealth() {
  return useQuery({
    queryKey: ['api-health'],
    queryFn: async () => {
      const { data } = await api.get('/health')
      return data as { status: string }
    },
    staleTime: 60_000,
  })
}
