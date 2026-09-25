import http from './http'
import type { AccountRequest, UserVO, PageResult } from '../types/api'

export interface AccountSearchParams {
  username?: string
  fullName?: string
  enabled?: boolean
  roleId?: number
  page?: number
  pageSize?: number
}

export const searchAccounts = (params: AccountSearchParams): Promise<PageResult<UserVO>> =>
  http.get<PageResult<UserVO>, PageResult<UserVO>>('/account/search', { params })

export const getAccount = (id: number): Promise<UserVO> =>
  http.get<UserVO, UserVO>(`/account/info/${id}`)

export const saveAccount = (req: AccountRequest): Promise<number> =>
  http.post<number, number>('/account/save', req)

export const updateAccount = (id: number, req: AccountRequest): Promise<void> =>
  http.post<void, void>(`/account/update/${id}`, req)

export const deleteAccount = (id: number): Promise<void> =>
  http.post<void, void>(`/account/delete/${id}`)
