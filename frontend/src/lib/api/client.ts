import axios, {
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios'
import { env } from '@/lib/env'
import { getAccessTokenCookie, setCookie } from '@/lib/auth/cookies'
import { getStoredSessionEmail } from '@/lib/auth/storage'

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean
}

const createApiClient = (baseURL = env.apiUrl): AxiosInstance => {
  const instance = axios.create({
    baseURL,
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json;charset=utf-8',
    },
  })

  instance.interceptors.request.use(
    config => {
      const accessToken = getAccessTokenCookie()

      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`
      }

      return config
    },
    error => Promise.reject(error),
  )

  instance.interceptors.response.use(
    response => response,
    async error => {
      const originalRequest = error.config as RetriableRequestConfig | undefined

      if (
        error.response?.status === 401 &&
        originalRequest &&
        !originalRequest._retry
      ) {
        originalRequest._retry = true
        return reissueTokenAndRetryRequest(originalRequest, instance)
      }

      if (error.response) {
        return error.response as AxiosResponse
      }

      return Promise.reject(error)
    },
  )

  return instance
}

async function reissueTokenAndRetryRequest(
  originalRequest: RetriableRequestConfig,
  instance: AxiosInstance,
) {
  try {
    const memberEmail = getStoredSessionEmail()

    if (!memberEmail) {
      return
    }

    const response = await axios.post(
      `${env.apiUrl}/member/reissue/accessToken/${memberEmail}`,
      undefined,
      {
        withCredentials: true,
      },
    )

    if (response.data?.dataHeader?.successCode !== 0) {
      return
    }

    const nextAccessToken = response.data?.dataBody

    if (!nextAccessToken) {
      return
    }

    setCookie('accessToken', nextAccessToken, {
      path: '/',
    })

    originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`

    return instance.request(originalRequest)
  } catch (error) {
    console.error('Token reissue failed:', error)
    throw error
  }
}

export const apiClient = createApiClient()
export { createApiClient }
