'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import styled from 'styled-components'
import RequireAuth from '@/components/auth/require-auth'
import {
  communityCategories,
  getCommunityCategoryLabel,
} from '@/data/community-categories'
import {
  createCommunityData,
  getCommunityDetailData,
  resolveCommunityImages,
  updateCommunityData,
} from '@/lib/api/community'
import { getApiMessage, isApiSuccess } from '@/lib/api/response'
import { useAuthStore } from '@/stores/auth-store'
import type { CommunityDetail } from '@/types/community'

const Page = styled.main`
  width: min(1080px, calc(100% - 48px));
  margin: 0 auto;
  padding: 40px 0 72px;
  display: grid;
  gap: 24px;
`

const Hero = styled.section`
  display: grid;
  gap: 14px;
  padding: 32px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  box-shadow: var(--shadow-level-1);
`

const Eyebrow = styled.p`
  color: var(--color-primary-700);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`

const Title = styled.h1`
  color: var(--color-text-900);
  font-size: 26px;
  line-height: 1.1;
  letter-spacing: 0;
`

const Body = styled.p`
  color: var(--color-text-500);
  line-height: 1.8;
`

const Layout = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 24px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`

const FormCard = styled.section`
  display: grid;
  gap: 24px;
  padding: 28px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: white;
  box-shadow: var(--shadow-level-1);
`

const AsideCard = styled.aside`
  display: grid;
  gap: 18px;
  padding: 24px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: white;
  box-shadow: var(--shadow-level-1);
  align-self: start;
  position: sticky;
  top: 96px;

  @media (max-width: 1024px) {
    position: static;
  }
`

const Fieldset = styled.section`
  display: grid;
  gap: 12px;
`

const Label = styled.label`
  color: var(--color-text-900);
  font-size: 15px;
  font-weight: 700;
`

const Input = styled.input`
  width: 100%;
  min-height: 52px;
  padding: 0 16px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-control);
  background: white;
  color: var(--color-text-900);
`

const Select = styled.select`
  width: 100%;
  min-height: 52px;
  padding: 0 16px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-control);
  background: white;
  color: var(--color-text-900);
`

const TextArea = styled.textarea`
  width: 100%;
  min-height: 320px;
  padding: 16px 18px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  resize: vertical;
  background: white;
  color: var(--color-text-900);
  line-height: 1.85;
`

const Helper = styled.p`
  color: var(--color-text-500);
  font-size: 13px;
  line-height: 1.75;
`

const ImageInput = styled.input`
  display: none;
`

const UploadLabel = styled.label`
  min-height: 50px;
  width: fit-content;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 18px;
  border: 1px solid var(--color-primary-700);
  border-radius: var(--radius-control);
  background: white;
  color: var(--color-primary-700);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
`

const ImageGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`

const ImageCard = styled.div`
  overflow: hidden;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface-muted);
`

const PreviewImage = styled.img`
  width: 100%;
  height: 220px;
  object-fit: cover;
`

const ImageFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
`

const ImageLabel = styled.p`
  min-width: 0;
  color: var(--color-text-700);
  font-size: 13px;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const RemoveButton = styled.button`
  border: none;
  background: transparent;
  color: var(--color-danger);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
`

const Notice = styled.div<{ $tone?: 'error' | 'info' }>`
  padding: 16px 18px;
  border-radius: var(--radius-card);
  background: ${props =>
    props.$tone === 'error'
      ? 'rgba(240, 68, 82, 0.1)'
      : 'var(--color-primary-100)'};
  color: ${props =>
    props.$tone === 'error'
      ? 'var(--color-danger)'
      : 'var(--color-primary-700)'};
  line-height: 1.75;
`

const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`

const PrimaryButton = styled.button`
  min-height: 50px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 18px;
  border: 1px solid var(--color-primary-700);
  border-radius: var(--radius-control);
  background: var(--color-primary-700);
  color: white;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
`

const SecondaryLink = styled(Link)`
  min-height: 50px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 18px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-control);
  background: white;
  color: var(--color-text-700);
  font-size: 15px;
  font-weight: 700;
`

const SummaryList = styled.div`
  display: grid;
  gap: 12px;
`

const SummaryItem = styled.div`
  display: grid;
  gap: 6px;
  padding: 16px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface-muted);
`

const SummaryLabel = styled.p`
  color: var(--color-text-500);
  font-size: 13px;
`

const SummaryValue = styled.p`
  color: var(--color-text-900);
  font-size: 16px;
  font-weight: 700;
  line-height: 1.5;
`

type DraftImage = {
  key: string
  imageId: number | null
  url: string
  label: string
  file?: File
}

type CommunityRegisterFormProps = {
  editCommunityId: number
  initialPost: CommunityDetail | null
  isEditMode: boolean
  memberId: number | null
  memberNickname: string
}

const MAX_TITLE_LENGTH = 20
const MAX_CONTENT_LENGTH = 500

export default function CommunityRegisterPage() {
  const searchParams = useSearchParams()
  const memberInfo = useAuthStore(state => state.memberInfo)
  const editCommunityId = Number(searchParams.get('communityId') ?? 0)
  const isEditMode = Number.isFinite(editCommunityId) && editCommunityId > 0

  const detailQuery = useQuery({
    queryKey: ['community-register-detail', editCommunityId],
    queryFn: () => getCommunityDetailData(editCommunityId),
    enabled: isEditMode,
  })

  const isAuthor =
    detailQuery.data &&
    isApiSuccess(detailQuery.data) &&
    memberInfo?.id === detailQuery.data.dataBody.writerId

  const shouldRenderForm =
    !isEditMode ||
    (Boolean(detailQuery.data) && isApiSuccess(detailQuery.data) && isAuthor)

  const initialPost =
    detailQuery.data && isApiSuccess(detailQuery.data)
      ? detailQuery.data.dataBody
      : null

  return (
    <RequireAuth>
      <Page>
        <Hero>
          <Eyebrow>{isEditMode ? 'Community Edit' : 'Community Write'}</Eyebrow>
          <Title>
            {isEditMode
              ? '게시글을 수정해 내용을 최신 상태로 유지합니다.'
              : '운영 경험과 현장 관찰을 게시글로 정리합니다.'}
          </Title>
          <Body>
            제목은 짧고 명확하게, 본문은 실제 경험과 수치 중심으로 작성하면 다른
            운영자들이 더 빠르게 맥락을 이해할 수 있습니다.
          </Body>
        </Hero>

        {isEditMode && detailQuery.isLoading ? (
          <Notice>수정할 게시글 정보를 불러오는 중입니다.</Notice>
        ) : null}

        {isEditMode && detailQuery.data && !isApiSuccess(detailQuery.data) ? (
          <Notice $tone="error">{getApiMessage(detailQuery.data)}</Notice>
        ) : null}

        {isEditMode &&
        detailQuery.data &&
        isApiSuccess(detailQuery.data) &&
        !isAuthor ? (
          <Notice $tone="error">
            본인이 작성한 게시글만 수정할 수 있습니다.
          </Notice>
        ) : null}

        {shouldRenderForm ? (
          <CommunityRegisterForm
            key={isEditMode ? `edit-${editCommunityId}` : 'create'}
            editCommunityId={editCommunityId}
            initialPost={initialPost}
            isEditMode={isEditMode}
            memberId={memberInfo?.id ?? null}
            memberNickname={memberInfo?.nickname ?? '로그인 사용자'}
          />
        ) : null}
      </Page>
    </RequireAuth>
  )
}

function CommunityRegisterForm({
  editCommunityId,
  initialPost,
  isEditMode,
  memberId,
  memberNickname,
}: CommunityRegisterFormProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const initialImages =
    initialPost?.images.map(image => ({
      key: `${image.imageId ?? image.url}`,
      imageId: image.imageId,
      url: image.url,
      label: '기존 이미지',
    })) ?? []

  const [titleValue, setTitleValue] = useState(initialPost?.title ?? '')
  const [categoryValue, setCategoryValue] = useState(
    initialPost?.category ?? '',
  )
  const [contentValue, setContentValue] = useState(initialPost?.content ?? '')
  const [images, setImages] = useState<DraftImage[]>(initialImages)
  const [formMessage, setFormMessage] = useState<string | null>(null)
  const imageStateRef = useRef<DraftImage[]>(initialImages)

  useEffect(() => {
    imageStateRef.current = images
  }, [images])

  useEffect(() => {
    return () => {
      imageStateRef.current.forEach(image => {
        if (image.file) {
          URL.revokeObjectURL(image.url)
        }
      })
    }
  }, [])

  const refreshCommunityListQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ['community-list'],
      }),
      queryClient.invalidateQueries({
        queryKey: ['community-popular'],
      }),
      queryClient.invalidateQueries({
        queryKey: ['community-detail'],
      }),
    ])
  }

  const submitMutation = useMutation({
    mutationFn: async () => {
      const trimmedTitle = titleValue.trim()
      const trimmedContent = contentValue.trim()

      if (!categoryValue) {
        throw new Error('카테고리를 선택해 주세요.')
      }

      if (!trimmedTitle) {
        throw new Error('제목을 입력해 주세요.')
      }

      if (!trimmedContent) {
        throw new Error('본문을 입력해 주세요.')
      }

      const resolvedImages = await resolveCommunityImages(images, memberId)

      if (isEditMode) {
        return updateCommunityData(editCommunityId, {
          title: trimmedTitle,
          content: trimmedContent,
          images: resolvedImages,
        })
      }

      return createCommunityData({
        category: categoryValue,
        title: trimmedTitle,
        content: trimmedContent,
        images: resolvedImages.map(image => image.url),
      })
    },
    onSuccess: async response => {
      if (!isApiSuccess(response)) {
        setFormMessage(getApiMessage(response))
        return
      }

      await refreshCommunityListQueries()

      if (isEditMode) {
        router.replace(`/community/${editCommunityId}`)
        return
      }

      if (typeof response.dataBody === 'number') {
        router.replace(`/community/${response.dataBody}`)
        return
      }

      router.replace('/community/list')
    },
    onError: error => {
      setFormMessage(
        error instanceof Error
          ? error.message
          : '게시글 제목과 내용을 확인한 뒤 다시 저장해주세요.',
      )
    },
  })

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFiles = Array.from(event.target.files ?? [])

    if (nextFiles.length === 0) {
      return
    }

    const nextImages = nextFiles.map((file, index) => ({
      key: `${file.name}-${file.size}-${Date.now()}-${index.toString()}`,
      imageId: null,
      url: URL.createObjectURL(file),
      label: file.name,
      file,
    }))

    setImages(currentImages => [...currentImages, ...nextImages])
    event.target.value = ''
  }

  const handleRemoveImage = (targetKey: string) => {
    setImages(currentImages => {
      const targetImage = currentImages.find(image => image.key === targetKey)

      if (targetImage?.file) {
        URL.revokeObjectURL(targetImage.url)
      }

      return currentImages.filter(image => image.key !== targetKey)
    })
  }

  const selectedCategoryLabel = categoryValue
    ? getCommunityCategoryLabel(categoryValue)
    : '미선택'

  return (
    <Layout>
      <FormCard>
        <Fieldset>
          <Label htmlFor="community-category">카테고리</Label>
          <Select
            id="community-category"
            value={categoryValue}
            onChange={event => {
              setCategoryValue(event.target.value)
            }}
          >
            <option value="">카테고리를 선택해 주세요.</option>
            {communityCategories
              .filter(category => category.value !== '')
              .map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
          </Select>
          <Helper>
            카테고리는 게시글이 노출되는 흐름과 비슷한 게시글 추천에 함께
            사용됩니다.
          </Helper>
        </Fieldset>

        <Fieldset>
          <Label htmlFor="community-title">제목</Label>
          <Input
            id="community-title"
            value={titleValue}
            maxLength={MAX_TITLE_LENGTH}
            placeholder="예: 성수동 골목 상권에서 체감한 점심 매출 변화"
            onChange={event => {
              setTitleValue(event.target.value)
            }}
          />
          <Helper>
            {titleValue.length}/{MAX_TITLE_LENGTH}자
          </Helper>
        </Fieldset>

        <Fieldset>
          <Label htmlFor="community-content">본문</Label>
          <TextArea
            id="community-content"
            value={contentValue}
            maxLength={MAX_CONTENT_LENGTH}
            placeholder="현장에서 관찰한 변화, 실제 수치, 고민, 질문을 자유롭게 작성해 주세요."
            onChange={event => {
              setContentValue(event.target.value)
            }}
          />
          <Helper>
            {contentValue.length}/{MAX_CONTENT_LENGTH}자
          </Helper>
        </Fieldset>

        <Fieldset>
          <Label>이미지</Label>
          <ImageInput
            id="community-image-upload"
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageChange}
          />
          <UploadLabel htmlFor="community-image-upload">
            이미지 추가
          </UploadLabel>
          <Helper>
            여러 이미지를 첨부할 수 있습니다. 기존 이미지를 유지한 채 새
            이미지를 추가하는 것도 가능합니다.
          </Helper>
          {images.length > 0 ? (
            <ImageGrid>
              {images.map(image => (
                <ImageCard key={image.key}>
                  <PreviewImage src={image.url} alt={image.label} />
                  <ImageFooter>
                    <ImageLabel>{image.label}</ImageLabel>
                    <RemoveButton
                      type="button"
                      onClick={() => {
                        handleRemoveImage(image.key)
                      }}
                    >
                      제거
                    </RemoveButton>
                  </ImageFooter>
                </ImageCard>
              ))}
            </ImageGrid>
          ) : null}
        </Fieldset>

        {formMessage ? <Notice $tone="error">{formMessage}</Notice> : null}

        <ActionRow>
          <PrimaryButton
            type="button"
            onClick={() => {
              setFormMessage(null)
              submitMutation.mutate()
            }}
          >
            {submitMutation.isPending
              ? '저장 중'
              : isEditMode
                ? '수정 완료'
                : '게시글 등록'}
          </PrimaryButton>
          <SecondaryLink
            href={
              isEditMode ? `/community/${editCommunityId}` : '/community/list'
            }
          >
            취소
          </SecondaryLink>
        </ActionRow>
      </FormCard>

      <AsideCard>
        <SummaryList>
          <SummaryItem>
            <SummaryLabel>작성 상태</SummaryLabel>
            <SummaryValue>
              {isEditMode ? '수정 모드' : '새 글 작성'}
            </SummaryValue>
          </SummaryItem>
          <SummaryItem>
            <SummaryLabel>선택 카테고리</SummaryLabel>
            <SummaryValue>{selectedCategoryLabel}</SummaryValue>
          </SummaryItem>
          <SummaryItem>
            <SummaryLabel>이미지 수</SummaryLabel>
            <SummaryValue>{images.length}장</SummaryValue>
          </SummaryItem>
          <SummaryItem>
            <SummaryLabel>작성자</SummaryLabel>
            <SummaryValue>{memberNickname}</SummaryValue>
          </SummaryItem>
        </SummaryList>
        <Notice>
          게시글을 등록하면 커뮤니티 목록과 비슷한 카테고리 추천 영역에 함께
          노출됩니다.
        </Notice>
      </AsideCard>
    </Layout>
  )
}
