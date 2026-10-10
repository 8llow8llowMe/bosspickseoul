import type { UndoBatchCopy } from '@/lib/ui/undo-batch'

/*
  프로필 보관함에서 연달아 지운 항목을 되돌리기 토스트 하나로 묶을 때의 문구(#631). 항목이 하나면 그 항목의 이름이 든
  문구(`UndoableRemovalCopy`)를 쓰고, 둘 이상일 때만 여기 문구를 쓴다. 모두 무엇을 몇 개 했는지 말하는 완결 문장이다.
*/

/**
 * 묶음 되돌리기 문구 + 지연 삭제가 여러 건 실패했을 때의 문구. 실패 토스트도 화면마다 한 장으로 묶는다 — 여러 장이 쌓이면
 * 토스트 상한(3)에 묶음 되돌리기 토스트가 밀려 남은 항목을 되돌릴 수 없게 된다.
 */
export type ProfileRemovalBatchCopy = UndoBatchCopy & {
  /** 화면에 있는 동안 실패해 되살렸을 때. 예) count 2 → 「북마크 2개를 해제하지 못해 다시 보여 드려요.」 */
  restoredOnFailureMany: (count: number) => string
  /** 화면을 떠난 뒤 실패했을 때(되살릴 카드가 없다). 예) count 2 → 「북마크 2개를 해제하지 못했어요.」 */
  failedMany: (count: number) => string
}

/**
 * 「주어 + 조사부터의 꼬리」로 문구를 만든다. 꼬리는 개수 주어 바로 뒤에 붙는다(「북마크 3개」 + 「를 해제했어요.」).
 */
const countedCopy = ({
  subject,
  done,
  pending,
  undone,
  alreadyDone,
  failStem,
}: {
  /** 개수가 붙은 주어. 예) count 3 → 「북마크 3개」 */
  subject: (count: number) => string
  done: string
  pending: string
  undone: string
  alreadyDone: string
  /** 실패 문구의 줄기. 예) 「를 해제하지 못」 → 「…못했어요.」·「…못해 다시 보여 드려요.」 */
  failStem: string
}): ProfileRemovalBatchCopy => ({
  removedMany: count => `${subject(count)}${done}`,
  pendingMany: count => `${subject(count)}${pending}`,
  restoredMany: count => `${subject(count)}${undone}`,
  alreadyDoneMany: count => `${subject(count)}${alreadyDone}`,
  restoredOnFailureMany: count =>
    `${subject(count)}${failStem}해 다시 보여 드려요.`,
  failedMany: count => `${subject(count)}${failStem}했어요.`,
})

/** 지역·상권 북마크 해제. */
export const BOOKMARK_REMOVAL_BATCH_COPY = countedCopy({
  subject: count => `북마크 ${count}개`,
  done: '를 해제했어요.',
  pending: '는 아직 되돌릴 수 있어요.',
  undone: '의 해제를 되돌렸어요.',
  alreadyDone: '는 이미 해제됐어요.',
  failStem: '를 해제하지 못',
})

/** 화면 보관함 삭제. */
export const ARCHIVE_REMOVAL_BATCH_COPY = countedCopy({
  subject: count => `보관한 화면 ${count}개`,
  done: '를 삭제했어요.',
  pending: '는 아직 되돌릴 수 있어요.',
  undone: '를 되살렸어요.',
  alreadyDone: '는 이미 삭제됐어요.',
  failStem: '를 삭제하지 못',
})

/** 시뮬레이션 기록 삭제. */
export const SIMULATION_HISTORY_REMOVAL_BATCH_COPY = countedCopy({
  subject: count => `시뮬레이션 기록 ${count}개`,
  done: '를 삭제했어요.',
  pending: '는 아직 되돌릴 수 있어요.',
  undone: '를 되살렸어요.',
  alreadyDone: '는 이미 삭제됐어요.',
  failStem: '를 삭제하지 못',
})

/** 로그인 기기 해제. 기기는 「대」로 센다. */
export const SESSION_REVOKE_BATCH_COPY = countedCopy({
  subject: count => `기기 ${count}대`,
  done: '의 로그인을 해제했어요.',
  pending: '의 로그인 해제는 아직 되돌릴 수 있어요.',
  undone: '의 로그인 해제를 되돌렸어요.',
  alreadyDone: '는 이미 해제됐어요.',
  failStem: '의 로그인을 해제하지 못',
})
