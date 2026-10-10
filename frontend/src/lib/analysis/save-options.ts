/**
 * 상권분석 결과 「저장」 시트(#563, 결정 D-2)의 항목 모델과 연결 규칙.
 *
 * 시트 컴포넌트(`components/analysis/analysis-save-sheet`)는 그리기만 하고, 어느 항목이 어느 API 로
 * 가는지·저장 여부를 무엇에서 읽는지는 여기서 정한다 — 결과 화면이 두 북마크를 뒤바꿔 잇는 실수를
 * 단위 테스트로 잡기 위해서다.
 */

export type AnalysisSaveOptionKey = 'analysis' | 'commercial'

export type AnalysisSaveOption = {
  key: AnalysisSaveOptionKey
  title: string
  description: string
  saved: boolean
  pending: boolean
  /** 아직 저장할 수 없다(조건·상권 정보를 확인하는 중). 이때만 버튼을 잠근다. */
  disabled?: boolean
}

/**
 * 항목 → 처리. 「이 분석 화면」은 분석 북마크(보관함, `handleArchive`), 「관심 상권」은 회원 북마크
 * (`handleBookmark`)다.
 */
export type AnalysisSaveAction = 'archive' | 'bookmark'

export const resolveAnalysisSaveAction = (
  key: AnalysisSaveOptionKey,
): AnalysisSaveAction => (key === 'analysis' ? 'archive' : 'bookmark')

export const buildAnalysisSaveOptions = ({
  archived,
  archivePending,
  canArchive,
  commercialSaved,
  bookmarkPending,
  profilePending,
}: {
  /** 지금 화면 상태(업종·분기·탭)가 분석 북마크로 저장돼 있다. */
  archived: boolean
  archivePending: boolean
  /** 분석 조건(공유 payload)을 만들 수 있다. 없으면 분석 화면 저장을 잠근다. */
  canArchive: boolean
  /** 이 상권이 회원 북마크(관심 상권)에 있다. */
  commercialSaved: boolean
  bookmarkPending: boolean
  /** 상권 이름을 아직 받지 못했다 — 회원 북마크는 `targetName` 이 필요하다. */
  profilePending: boolean
}): AnalysisSaveOption[] => [
  {
    key: 'analysis',
    title: '이 분석 화면 저장',
    description: '업종·분기·보던 항목까지 지금 화면을 그대로 보관함에 남겨요.',
    saved: archived,
    pending: archivePending,
    disabled: !canArchive,
  },
  {
    key: 'commercial',
    title: '관심 상권으로 저장',
    description: '업종과 분기 없이 이 상권만 관심 상권 목록에 남겨요.',
    saved: commercialSaved,
    pending: bookmarkPending,
    disabled: profilePending,
  },
]
