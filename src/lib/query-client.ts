import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
})

// Query keys for better organization
export const queryKeys = {
  users: ['users'] as const,
  user: (id: string) => ['users', id] as const,
  posts: ['posts'] as const,
  post: (id: string) => ['posts', id] as const,
} as const 