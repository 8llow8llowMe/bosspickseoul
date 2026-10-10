'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import styled, { keyframes } from 'styled-components'

import { touchHitArea } from '@/styles/touch-target'

import {
  appendToast,
  dismissToast,
  dismissToastByKey,
  toastDurationMs,
  type Toast,
  type ToastTone,
} from '@/lib/ui/toast-state'

export type ShowToastInput = {
  message: string
  tone?: ToastTone
  /** 같은 키의 토스트는 겹쳐 쌓이지 않고 교체된다. 토글 버튼 피드백에 쓴다. */
  dedupeKey?: string
  action?: { label: string; onAction: () => void }
}

type ToastContextValue = {
  showToast: (input: ShowToastInput) => void
  /** 같은 `dedupeKey` 의 토스트를 닫는다(동작이 더는 뜻이 없을 때). 없으면 아무 일도 없다. */
  dismissToast: (dedupeKey: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

/* ------------------------------------------------------------------ *
 * 스타일
 * ------------------------------------------------------------------ */

const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`

/**
 * 뷰포트는 **고정 위치**다. 문서 흐름에 끼면 피드백이 뜰 때마다 아래 내용이 밀린다
 * (이 컴포넌트가 생긴 이유다 — 분석 화면의 보관 문구가 리포트 전체를 밀어냈다).
 *
 * `z-index: 1200` 은 저장소에서 가장 높은 레이어(모달·시트 1000) 위다. 토스트는 모달 위에서도
 * 보여야 한다 — 모달 안에서 일어난 동작의 결과를 알려주는 자리이기 때문이다.
 *
 * `pointer-events: none` 으로 뷰포트 자체는 클릭을 통과시키고, 토스트 카드만 되살린다.
 * 안 그러면 화면 하단의 실제 UI(모바일 요약 바 등)가 투명한 상자에 막힌다.
 */
const Viewport = styled.div`
  position: fixed;
  right: 16px;
  bottom: 16px;
  left: auto;
  z-index: 1200;
  display: grid;
  gap: 8px;
  justify-items: end;
  width: min(380px, calc(100vw - 32px));
  pointer-events: none;

  /* 좁은 화면에서는 하단 고정 요약 바를 피해 조금 더 띄운다. */
  @media (max-width: 1023px) {
    right: 16px;
    left: 16px;
    bottom: 88px;
    width: auto;
    justify-items: stretch;
  }
`

const Card = styled.div<{ $tone: ToastTone }>`
  pointer-events: auto;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
  border: 1px solid var(--color-border-200);
  border-left: 3px solid
    ${props =>
      props.$tone === 'error'
        ? 'var(--color-danger)'
        : props.$tone === 'success'
          ? 'var(--color-success)'
          : 'var(--color-primary-700)'};
  border-radius: var(--radius-card);
  background: var(--color-surface);
  box-shadow: var(--shadow-level-3);
  padding: 12px 12px 12px 14px;
  animation: ${slideIn} 160ms ease-out;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }

  > svg {
    width: 18px;
    height: 18px;
    flex: 0 0 auto;
    margin-top: 1px;
    stroke: currentColor;
    color: ${props =>
      props.$tone === 'error'
        ? 'var(--color-danger)'
        : props.$tone === 'success'
          ? 'var(--color-success)'
          : 'var(--color-primary-700)'};
  }
`

const Body = styled.div`
  min-width: 0;
  flex: 1 1 auto;
  display: grid;
  gap: 6px;
`

const Message = styled.p`
  color: var(--color-text-800);
  font-size: 14px;
  line-height: 21px;
  word-break: keep-all;
`

const ActionButton = styled.button`
  justify-self: start;
  border: none;
  background: none;
  padding: 0;
  color: var(--color-text-primary-on-light);
  font-size: 13px;
  font-weight: 700;
  line-height: 20px;
  cursor: pointer;
  ${touchHitArea()}

  &:hover {
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary-700);
    outline-offset: 2px;
  }
`

const CloseButton = styled.button`
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: var(--radius-control);
  background: none;
  color: var(--color-text-caption);
  cursor: pointer;
  ${touchHitArea()}

  svg {
    width: 16px;
    height: 16px;
    stroke: currentColor;
  }

  &:hover {
    background: var(--color-surface-muted);
    color: var(--color-text-700);
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary-700);
    outline-offset: 2px;
  }
`

/*
  화면에는 그리지 않고 스크린리더만 읽는 상자. body 끝에 늘 붙어 있으므로 `absolute` 면 제자리(푸터 아래)에
  1px 를 더해 문서 높이가 화면보다 1px 길어진다 — `fixed` 로 문서 흐름과 스크롤 높이에서 뺀다.
*/
const LiveRegion = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
`

const TONE_ICON = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
} as const

/* ------------------------------------------------------------------ *
 * 뷰
 * ------------------------------------------------------------------ */

export type ToastItemProps = {
  toast: Toast
  onDismiss: (id: string) => void
  /** 카드 위에 포인터가 있거나 카드 안에 포커스가 있는 동안 `true` 로 부른다(타이머 멈춤). */
  onHoldChange?: (id: string, held: boolean) => void
}

/**
 * 토스트 한 장. **표시 전용**이라 타이머를 들지 않는다 — 해제는 뷰포트가 관리한다.
 *
 * 카드 자신은 live region 이 아니다. 내용과 함께 생기는 live region 은 많은 스크린리더가 읽지
 * 않으므로, 읽기는 처음부터 마운트된 `ToastAnnouncer` 가 맡는다(#584). 카드에 role 을 또 달면
 * 같은 문구를 두 번 읽는다.
 *
 * 포인터가 올라가 있거나 안쪽에 포커스가 있으면 `onHoldChange` 로 알려 타이머를 멈춘다
 * (WCAG 2.2.1 — 읽거나 되돌리기를 누르려는 사이에 사라지지 않게).
 */
export function ToastItem({ toast, onDismiss, onHoldChange }: ToastItemProps) {
  const Icon = TONE_ICON[toast.tone]
  const pointerInside = useRef(false)
  const focusInside = useRef(false)

  const report = () =>
    onHoldChange?.(toast.id, pointerInside.current || focusInside.current)

  return (
    <Card
      $tone={toast.tone}
      onPointerEnter={() => {
        pointerInside.current = true
        report()
      }}
      onPointerLeave={() => {
        pointerInside.current = false
        report()
      }}
      onFocus={() => {
        focusInside.current = true
        report()
      }}
      onBlur={event => {
        // 카드 안의 다른 버튼으로 옮겨 가는 blur 는 무시한다.
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
          return
        }
        focusInside.current = false
        report()
      }}
    >
      <Icon aria-hidden="true" />
      <Body>
        <Message>{toast.message}</Message>
        {toast.action ? (
          <ActionButton
            type="button"
            onClick={() => {
              toast.action?.onAction()
              onDismiss(toast.id)
            }}
          >
            {toast.action.label}
          </ActionButton>
        ) : null}
      </Body>
      <CloseButton
        type="button"
        aria-label="알림 닫기"
        onClick={() => onDismiss(toast.id)}
      >
        <X aria-hidden="true" />
      </CloseButton>
    </Card>
  )
}

/**
 * 토스트 한 장의 수명을 재는 타이머. 카드마다 하나씩 붙는다.
 *
 * `paused` 동안에는 타이머를 걷고 남은 시간만 기억했다가, 풀리면 **남은 시간부터** 다시 잰다.
 * 처음부터 다시 재면 포인터를 잠깐 올렸다 뗄 때마다 수명이 늘어난다.
 */
function ToastTimer({
  toast,
  paused,
  onDismiss,
  onHoldChange,
}: {
  toast: Toast
  paused: boolean
  onDismiss: (id: string) => void
  onHoldChange: (id: string, held: boolean) => void
}) {
  // 같은 키로 교체된 토스트는 id 가 새로 붙어 key 가 바뀐다 — 다시 마운트되어 수명을 처음부터 잰다.
  const remaining = useRef(toastDurationMs(toast))

  useEffect(() => {
    if (paused) {
      return
    }

    const startedAt = Date.now()
    const timer = setTimeout(() => onDismiss(toast.id), remaining.current)

    return () => {
      clearTimeout(timer)
      remaining.current = Math.max(
        0,
        remaining.current - (Date.now() - startedAt),
      )
    }
  }, [toast, paused, onDismiss])

  return (
    <ToastItem
      toast={toast}
      onDismiss={onDismiss}
      onHoldChange={onHoldChange}
    />
  )
}

/**
 * 스크린리더가 읽는 문장. 동작 버튼이 달렸으면 그 버튼이 있다는 것을 끝에 붙인다 — 문구만 읽으면 되돌릴 수 있다는
 * 것을 모른 채 지나간다. 버튼 이름은 카드의 버튼과 같다.
 */
export const announcementOf = (toast: Toast): string =>
  toast.action
    ? `${toast.message} 알림에 「${toast.action.label}」 버튼이 있어요.`
    : toast.message

/**
 * 스크린리더용 live region 두 개. **처음부터 비어 있는 채로 DOM 에 있고 내용만 바뀐다**(#584).
 * 내용과 같이 생기는 live region 은 많은 스크린리더가 읽지 않는다.
 *
 * - 성공·안내는 `role="status"`(polite) — 읽던 내용을 끊지 않는다.
 * - 오류만 `role="alert"`(assertive) — "저장했어요"는 읽던 내용을 끊을 만큼 급하지 않다.
 *
 * 토스트마다 문단을 하나씩 넣는다. 추가된 문단만 읽히고(aria-relevant 기본값), 같은 키로 교체되면
 * 문구가 바뀌어 다시 읽힌다. 화면에는 보이지 않는다 — 보이는 건 카드다.
 */
export function ToastAnnouncer({ toasts }: { toasts: readonly Toast[] }) {
  const polite = toasts.filter(toast => toast.tone !== 'error')
  const assertive = toasts.filter(toast => toast.tone === 'error')

  return (
    <>
      <LiveRegion role="status" aria-live="polite" data-toast-live="polite">
        {polite.map(toast => (
          <p key={toast.id}>{announcementOf(toast)}</p>
        ))}
      </LiveRegion>
      <LiveRegion
        role="alert"
        aria-live="assertive"
        data-toast-live="assertive"
      >
        {assertive.map(toast => (
          <p key={toast.id}>{announcementOf(toast)}</p>
        ))}
      </LiveRegion>
    </>
  )
}

/* ------------------------------------------------------------------ *
 * 프로바이더
 * ------------------------------------------------------------------ */

export default function ToastProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [mounted, setMounted] = useState(false)
  // 렌더마다 새 값이 나오면 안 되므로 카운터를 ref 로 든다.
  // (Math.random·Date.now 는 SSR 과 클라이언트가 달라 하이드레이션이 어긋난다.)
  const nextId = useRef(0)
  // 포인터가 올라가 있거나 포커스가 안에 있는 카드 id. 하나라도 있으면 **모든** 타이머를 멈춘다 —
  // 읽고 있는 카드 옆의 카드가 사라지면 목록이 흔들려 읽던 카드가 포인터 밑에서 빠져나간다.
  const [heldIds, setHeldIds] = useState<ReadonlySet<string>>(() => new Set())

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  /*
    붙잡힌 카드가 포인터·포커스를 놓기 전에 사라질 수 있다(닫기·키로 닫기·상한 밀어내기·같은 키 교체). 사라진 카드는
    pointerleave·blur 를 보내지 않으므로 그 id 가 남으면 이후 토스트가 영영 닫히지 않는다. 그래서 멈춤은 **지금 떠 있는
    카드** 기준으로 계산하고, 목록이 바뀔 때마다 사라진 id 를 걷어 낸다.
  */
  const paused = toasts.some(toast => heldIds.has(toast.id))

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHeldIds(current => {
      const live = [...current].filter(id =>
        toasts.some(toast => toast.id === id),
      )
      return live.length === current.size ? current : new Set(live)
    })
  }, [toasts])

  const handleDismiss = useCallback((id: string) => {
    setToasts(current => dismissToast(current, id))
  }, [])

  const handleHoldChange = useCallback((id: string, held: boolean) => {
    setHeldIds(current => {
      if (current.has(id) === held) {
        return current
      }
      const next = new Set(current)
      if (held) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }, [])

  const showToast = useCallback((input: ShowToastInput) => {
    nextId.current += 1
    setToasts(current =>
      appendToast(current, {
        id: `toast-${nextId.current}`,
        tone: input.tone ?? 'success',
        message: input.message,
        dedupeKey: input.dedupeKey,
        action: input.action,
      }),
    )
  }, [])

  const dismissByKey = useCallback((dedupeKey: string) => {
    setToasts(current => dismissToastByKey(current, dedupeKey))
  }, [])

  const value = useMemo(
    () => ({ showToast, dismissToast: dismissByKey }),
    [showToast, dismissByKey],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* live region 은 포털 없이 **서버 렌더부터** 그린다(#584). 마운트 뒤 포털로 붙이면 첫 화면의 effect 가 띄운
          토스트(로그인 만료 안내 등)는 영역과 내용이 한 번에 생겨 읽히지 않는다. position: fixed 라 문서 높이에
          끼지 않는다. */}
      <ToastAnnouncer toasts={toasts} />
      {/* 보이는 뷰포트는 document.body 로 포털한다. 변형(transform)이 걸린 조상 안에서 렌더되면
          position: fixed 가 그 조상 기준이 되어 화면 구석이 아닌 엉뚱한 곳에 붙는다. 토스트가 있을 때만 그린다. */}
      {mounted && toasts.length > 0
        ? createPortal(
            <Viewport>
              {toasts.map(toast => (
                <ToastTimer
                  key={toast.id}
                  toast={toast}
                  paused={paused}
                  onDismiss={handleDismiss}
                  onHoldChange={handleHoldChange}
                />
              ))}
            </Viewport>,
            document.body,
          )
        : null}
    </ToastContext.Provider>
  )
}

/**
 * 토스트를 띄운다.
 *
 * 프로바이더 밖에서 부르면 **조용히 아무 일도 하지 않는다.** 던지지 않는 이유: 토스트는
 * 부가 피드백이라, 이것 때문에 저장이나 계산 같은 본래 동작이 깨지면 안 된다.
 */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  const fallback = useMemo<ToastContextValue>(
    () => ({ showToast: () => undefined, dismissToast: () => undefined }),
    [],
  )

  return context ?? fallback
}
