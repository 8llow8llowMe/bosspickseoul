import axios, { AxiosInstance } from 'axios'

const createApiClient = (baseURL = '/api/bff'): AxiosInstance =>
  axios.create({
    baseURL,
    withCredentials: true,
    headers: { 'Content-Type': 'application/json;charset=utf-8' },
  })

export const apiClient = createApiClient()
export { createApiClient }
