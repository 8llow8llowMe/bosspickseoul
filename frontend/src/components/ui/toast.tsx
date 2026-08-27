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

import {
  appendToast,
  dismissToast,
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
  color: var(--color-primary-700);
  font-size: 13px;
  font-weight: 700;
  line-height: 20px;
  cursor: pointer;

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
}

/**
 * 토스트 한 장. **표시 전용**이라 타이머를 들지 않는다 — 해제는 뷰포트가 관리한다.
 *
 * 오류만 `role="alert"` 다. 성공·안내까지 alert 로 두면 스크린리더가 읽던 내용을 끊는데,
 * "저장했어요"는 그럴 만큼 급한 정보가 아니다.
 */
export function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const Icon = TONE_ICON[toast.tone]

  return (
    <Card
      $tone={toast.tone}
      role={toast.tone === 'error' ? 'alert' : 'status'}
      aria-live={toast.tone === 'error' ? 'assertive' : 'polite'}
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

/** 토스트 한 장의 수명을 재는 타이머. 카드마다 하나씩 붙는다. */
function ToastTimer({
  toast,
  onDismiss,
}: {
  toast: Toast
  onDismiss: (id: string) => void
}) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), toastDurationMs(toast))
    return () => clearTimeout(timer)
  }, [toast, onDismiss])

  return <ToastItem toast={toast} onDismiss={onDismiss} />
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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  const handleDismiss = useCallback((id: string) => {
    setToasts(current => dismissToast(current, id))
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

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* document.body 로 포털한다. 변형(transform)이 걸린 조상 안에서 렌더되면
          position: fixed 가 그 조상 기준이 되어 화면 구석이 아닌 엉뚱한 곳에 붙는다. */}
      {mounted && toasts.length > 0
        ? createPortal(
            <Viewport>
              {toasts.map(toast => (
                <ToastTimer
                  key={toast.id}
                  toast={toast}
                  onDismiss={handleDismiss}
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
    () => ({ showToast: () => undefined }),
    [],
  )

  return context ?? fallback
}
