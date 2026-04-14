import { useQuery } from '@tanstack/react-query'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

export interface AppConfig {
  github_auth_enabled: boolean
}

export function useConfig() {
  return useQuery<AppConfig>({
    queryKey: ['config'],
    queryFn: () => fetch(`${BASE_URL}/config`).then((r) => r.json()),
    staleTime: Infinity,
  })
}
