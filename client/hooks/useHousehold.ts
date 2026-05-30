import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

export type HouseholdMember = {
  id: string
  name: string
  email: string
  role: 'SHOPPER' | 'DEPENDENT'
  avatarColor: string
  avatarInitials: string
}

export type Household = {
  id: string
  name: string
  inviteCode: string
  members: HouseholdMember[]
}

export function useHousehold() {
  return useQuery<Household>({
    queryKey: ['household'],
    queryFn: async () => {
      const res = await api.get<{ household: Household }>('/household')
      return res.household
    },
  })
}

export function useUpdateMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: 'SHOPPER' | 'DEPENDENT' }) =>
      api.patch(`/household/member/${id}`, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['household'] }),
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useRemoveMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/household/member/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['household'] }),
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useRegenerateInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<{ inviteCode: string }>('/household/invite/regenerate'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['household'] })
      toast.success('Código de convite regenerado')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
