import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

export type Request = {
  id: string
  text: string
  status: 'PENDING' | 'APPROVED' | 'DECLINED'
  fromId: string
  from: { id: string; name: string; avatarInitials: string; avatarColor: string }
  resolvedBy: { id: string; name: string } | null
  householdId: string
  createdAt: string
  updatedAt: string
}

export function useRequests() {
  return useQuery<Request[]>({
    queryKey: ['requests'],
    queryFn: async () => {
      const res = await api.get<{ requests: Request[] }>('/requests')
      return res.requests
    },
    refetchInterval: 30000,
  })
}

export function useCreateRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (text: string) => api.post<{ request: Request }>('/requests', { text }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['requests'] })
      toast.success('Pedido enviado!')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useResolveRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'APPROVED' | 'DECLINED' }) =>
      api.patch<{ request: Request }>(`/requests/${id}/resolve`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['requests'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
