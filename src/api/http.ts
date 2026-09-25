import axios from 'axios'
import { Message } from '@arco-design/web-vue'
import router from '../router'
import type { Result } from '../types/api'
import { clearToken, getToken } from '../utils/token'

const http = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

http.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `${token}`
  }
  return config
})

http.interceptors.response.use(
  (response) => {
    const body = response.data as Result<unknown> | undefined
    if (body && typeof body === 'object' && 'code' in body) {
      if (body.code === 401) {
        // token 过期/无效：清空 token + 提示 + 跳登录页
        clearToken()
        Message.warning('登录已过期，请重新登录')
        router.replace('/login')
        return Promise.reject(new Error(body.msg || '认证失败'))
      }
      if (body.code !== 200) {
        return Promise.reject(new Error(body.msg || '请求失败'))
      }
      return body.data
    }
    return response.data
  },
  (error) => {
    const message = error?.response?.data?.msg || error?.message || '网络异常'
    return Promise.reject(new Error(message))
  },
)

export default http
