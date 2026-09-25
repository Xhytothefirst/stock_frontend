import http from './http'
import type { LoginRequest, RegisterRequest } from '../types/api'

export const login = (req: LoginRequest): Promise<string> =>
  http.post<string, string>('/auth/login', req)

export const logout = (): Promise<void> => http.post<void, void>('/auth/logout')

export const sendSignupCaptcha = (email: string): Promise<void> =>
  http.post<void, void>('/auth/signup/send-captcha', null, { params: { email } })

export const checkUsername = (username: string): Promise<boolean> =>
  http.post<boolean, boolean>('/auth/signup/check-username', null, { params: { username } })

export const checkEmail = (email: string): Promise<boolean> =>
  http.post<boolean, boolean>('/auth/signup/check-email', null, { params: { email } })

export const signup = (req: RegisterRequest): Promise<number> =>
  http.post<number, number>('/auth/signup', req)
