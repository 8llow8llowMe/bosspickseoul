import { apiClient } from '@/lib/api/client'
import type { ApiResponse } from '@/types/api'
import type {
  CommunityComment,
  CommunityCommentPayload,
  CommunityCreatePayload,
  CommunityDetail,
  CommunityImage,
  CommunityListItem,
  CommunityUpdatePayload,
} from '@/types/community'

export const getCommunityListData = async (category: string, lastId = 0) => {
  const response = await apiClient.get<ApiResponse<CommunityListItem[]>>(
    '/community',
    {
      params: {
        category,
        lastId,
      },
    },
  )

  return response.data
}

export const getPopularCommunityPostsData = async () => {
  const response =
    await apiClient.get<ApiResponse<CommunityListItem[]>>('/community/popular')

  return response.data
}

export const getCommunityDetailData = async (communityId: number) => {
  const response = await apiClient.get<ApiResponse<CommunityDetail>>(
    `/community/${communityId}`,
  )

  return response.data
}

export const createCommunityData = async (payload: CommunityCreatePayload) => {
  const response = await apiClient.post<ApiResponse<number | null>>(
    '/community',
    payload,
  )

  return response.data
}

export const updateCommunityData = async (
  communityId: number,
  payload: CommunityUpdatePayload,
) => {
  const response = await apiClient.patch<ApiResponse<null>>(
    `/community/${communityId}`,
    payload,
  )

  return response.data
}

export const deleteCommunityData = async (communityId: number) => {
  const response = await apiClient.delete<ApiResponse<null>>(
    `/community/${communityId}`,
  )

  return response.data
}

export const uploadCommunityImage = async (payload: FormData) => {
  const response = await apiClient.post<ApiResponse<string>>(
    '/firebase/upload',
    payload,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  )

  return response.data
}

export const getCommunityCommentsData = async (communityId: number) => {
  const response = await apiClient.get<ApiResponse<CommunityComment[]>>(
    `/community/${communityId}/comment`,
  )

  return response.data
}

export const createCommunityComment = async (
  communityId: number,
  payload: CommunityCommentPayload,
) => {
  const response = await apiClient.post<ApiResponse<CommunityComment[]>>(
    `/community/${communityId}/comment`,
    payload,
  )

  return response.data
}

export const updateCommunityComment = async (
  communityId: number,
  commentId: number,
  payload: CommunityCommentPayload,
) => {
  const response = await apiClient.patch<ApiResponse<null>>(
    `/community/${communityId}/comment/${commentId}`,
    payload,
  )

  return response.data
}

export const deleteCommunityComment = async (
  communityId: number,
  commentId: number,
) => {
  const response = await apiClient.delete<ApiResponse<null>>(
    `/community/${communityId}/comment/${commentId}`,
  )

  return response.data
}

export const resolveCommunityImages = async (
  images: Array<{
    file?: File
    imageId: CommunityImage['imageId']
    url: string
  }>,
  memberId?: number | null,
) => {
  const uploadedImages: CommunityImage[] = []

  for (const [index, image] of images.entries()) {
    if (!image.file) {
      uploadedImages.push({
        imageId: image.imageId,
        url: image.url,
      })
      continue
    }

    const formData = new FormData()
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:.TZ]/g, '')
      .slice(0, 14)

    formData.append('file', image.file)
    formData.append(
      'fileName',
      `${memberId ?? 'guest'}-${timestamp}-${index.toString()}`,
    )

    const response = await uploadCommunityImage(formData)

    if (!response.dataBody) {
      throw new Error('이미지 업로드 결과를 확인할 수 없습니다.')
    }

    uploadedImages.push({
      imageId: null,
      url: response.dataBody,
    })
  }

  return uploadedImages
}
