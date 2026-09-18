/**
 * 소비 값에 딸린 **면책과 출처** 한 덩어리.
 *
 * 상권 단위 소비 원천이 끊겨 백엔드가 소속 행정동 값으로 대체해 내려주기 시작했다(#416).
 * 대체값은 숫자로는 멀쩡해 보여서, 어디서 온 값인지 화면이 말하지 않으면 읽는 사람이
 * 상권 실측으로 오해한다. 그래서 대체 구간에서만 이 각주를 붙인다 — 네이티브에서는
 * 부르는 쪽이 아예 렌더하지 않는다. 늘 붙는 표시는 아무 말도 하지 못한다.
 */
export type ExpenseProvenanceNoteProps = {
  /** 면책 문장. 서버가 준 문장을 그대로 싣는다. */
  description?: string | null
  sourceLabel?: string | null
  sourceUrl?: string | null
}

export default function ExpenseProvenanceNote({
  description,
  sourceLabel,
  sourceUrl,
}: ExpenseProvenanceNoteProps) {
  const hasSource = typeof sourceLabel === 'string' && sourceLabel.length > 0
  if (!description && !hasSource) return null

  return (
    <>
      {description ? <p>{description}</p> : null}
      {hasSource ? (
        <p>
          출처{' '}
          {typeof sourceUrl === 'string' && sourceUrl.length > 0 ? (
            <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
              {sourceLabel}
            </a>
          ) : (
            sourceLabel
          )}
        </p>
      ) : null}
    </>
  )
}
