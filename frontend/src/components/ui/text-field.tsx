'use client'

import { Eye, EyeOff, X } from 'lucide-react'
import type { InputHTMLAttributes, ReactNode } from 'react'
import { forwardRef, useId, useState } from 'react'
import styled, { css } from 'styled-components'

import { touchHitArea } from '@/styles/touch-target'
import { visuallyHidden } from '@/styles/visually-hidden'

export type TextFieldSize = 'medium' | 'large'

export type TextFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'size'
> & {
  /**
   * 테두리를 grey300(DESIGN.md §Border Strong "emphasized borders")으로 올린다.
   *
   * 기본값 false — 기존 사용처(로그인·회원가입·커뮤니티 등)의 모양을 바꾸지 않는다.
   * 흰 카드 위에 칩 격자와 나란히 놓여 "입력 가능한 칸"임이 grey200 테두리로는 읽히지 않는
   * 자리에서만 켠다.
   */
  emphasized?: boolean
  errorText?: ReactNode
  fieldSize?: TextFieldSize
  fullWidth?: boolean
  helperText?: ReactNode
  label?: ReactNode
  /**
   * 라벨을 화면에서만 감춘다(sr-only). `<label>` 연결은 그대로라 접근 이름은 남는다. placeholder 가 같은
   * 말을 하는 좁은 자리(상권분석 모바일 시트, #648)에서만 켠다. 기본값 false.
   */
  labelVisuallyHidden?: boolean
  leftSlot?: ReactNode
  /**
   * 검색어 지우기. 넘기면 값이 있을 때만 라벨 있는 ✕ 버튼이 뜬다.
   *
   * `rightSlot` 으로 직접 넣지 못하는 이유: 그 자리는 아이콘용이라 `aria-hidden` 이다.
   * 버튼을 그 안에 넣으면 **포커스는 받는데 스크린리더에는 없는** 컨트롤이 된다.
   */
  onClear?: () => void
  /**
   * 비밀번호 표시 토글(#583). `type="password"` 와 함께 넘기면 칸 오른쪽에 눈 모양 버튼이 생겨
   * 누를 때마다 글자를 보이고 가린다. 버튼 이름은 「비밀번호 표시」로 고정하고 상태는
   * `aria-pressed` 로 알린다 — 이름을 「표시/숨기기」로 바꾸면 스크린리더가 상태와 동작을 헷갈린다.
   *
   * 기본값 false — 기존 사용처는 그대로다. password 가 아닌 칸에서는 무시한다.
   */
  revealable?: boolean
  rightSlot?: ReactNode
}

/** 비밀번호 표시 토글의 접근 이름. 상태는 `aria-pressed` 가 말한다. */
export const PASSWORD_REVEAL_LABEL = '비밀번호 표시'

/**
 * 입력칸이 가리킬 설명 id 들. 도움말과 오류를 **둘 다** 잇는다 — 오류가 생겨도 규칙 문구가
 * 사라지지 않으므로(#583) 보조기술도 둘을 함께 읽어야 한다. 호출부가 넘긴 id 는 앞에 둔다.
 */
export const joinDescribedBy = (
  ...ids: readonly (string | null | undefined | false)[]
): string | undefined => {
  const joined = ids.filter(Boolean).join(' ')
  return joined || undefined
}

const sizeStyles = {
  medium: css`
    min-height: 44px;
    font-size: 14px;

    @media (max-width: 1023px) {
      font-size: 16px;
    }
  `,
  large: css`
    min-height: 48px;
    font-size: 15px;

    @media (max-width: 1023px) {
      font-size: 16px;
    }
  `,
}

const Field = styled.label<{ $fullWidth: boolean }>`
  width: ${props => (props.$fullWidth ? '100%' : 'auto')};
  display: grid;
  gap: 8px;
`

const FieldLabel = styled.span<{ $visuallyHidden: boolean }>`
  color: var(--color-text-700);
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;

  ${props => (props.$visuallyHidden ? visuallyHidden : '')}
`

const InputShell = styled.span<{
  $emphasized: boolean
  $hasError: boolean
  $size: TextFieldSize
}>`
  display: flex;
  align-items: center;
  gap: 8px;
  /* 채움형 필드는 평상시 테두리를 그리지 않는다 — 회색 면이 이미 입력칸임을
     말해주는데 테두리까지 있으면 처리가 겹쳐 테두리만 떠 보인다(DESIGN.md
     §Inputs & Forms). 자리는 2px transparent 로 잡아 둬서 포커스·에러로 바뀔 때
     칸이 흔들리지 않는다. emphasized 는 면 대비가 필요한 자리라 테두리를 유지한다. */
  border: 2px solid
    ${props => (props.$hasError ? 'var(--color-danger)' : 'transparent')};
  /* emphasized 는 면 대비가 부족한 자리에서 칸 경계를 살리는 변형이다. 테두리를
     2px 로 그리면 개편 전(1px)보다 두 배 무거워지므로, 자리를 잡는 2px 투명
     테두리는 그대로 두고 **1px inset 링**으로 두께만 되돌린다. */
  box-shadow: ${props =>
    !props.$hasError && props.$emphasized
      ? 'inset 0 0 0 1px var(--color-border-300)'
      : 'none'};
  border-radius: var(--radius-field);
  background: ${props =>
    props.$hasError
      ? 'color-mix(in srgb, var(--color-danger) 6%, var(--color-surface))'
      : 'var(--color-surface-muted)'};
  padding: 0 14px;
  transition:
    border-color var(--motion-fast) var(--ease-standard),
    box-shadow var(--motion-fast) var(--ease-standard),
    background-color var(--motion-fast) var(--ease-standard);

  ${props => sizeStyles[props.$size]}

  &:focus-within {
    border-color: ${props =>
      props.$hasError ? 'var(--color-danger)' : 'var(--color-primary-700)'};
    /* 포커스에서는 emphasized 의 inset 링을 지운다 — 테두리와 겹쳐 이중선이 된다. */
    box-shadow: none;
    background: ${props =>
      props.$hasError
        ? 'color-mix(in srgb, var(--color-danger) 6%, var(--color-surface))'
        : 'var(--color-surface)'};
  }
`

const Slot = styled.span`
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  color: var(--color-text-caption);

  svg {
    width: 18px;
    height: 18px;
    stroke: currentColor;
  }
`

const Input = styled.input<{ $hasClear: boolean }>`
  width: 100%;
  min-width: 0;
  border: none;
  background: transparent;
  color: var(--color-text-900);
  font: inherit;

  /*
    포커스 신호는 **칸 자체의 2px 테두리 하나**다(DESIGN.md §Inputs & Forms — "focus
    2px #0ea5e9"). 전역 :focus-visible 아웃라인(같은 색, offset 2px)이 그 위에 겹치면
    파란 선이 두 줄로 보인다. 클래스 선택자 'outline: none' 은 전역 규칙과 특이도가
    같아 순서에 밀려 눌리지 않았으므로, :focus-visible 을 함께 붙여 확실히 이긴다.

    포커스를 **지우는** 것이 아니라 두 신호 중 하나를 고르는 것이다 — 칸 테두리는
    그대로 2px 파랑으로 바뀐다.
  */
  &,
  &:focus,
  &:focus-visible {
    outline: none;
  }

  /*
    WebKit 이 type="search" 에 붙이는 기본 지우기 버튼. 우리 ClearButton 과 겹쳐 같은 ✕
    가 두 개 나란히 보인다 — 라벨 있는 쪽만 남긴다. onClear 를 넘기지 않은 칸에서는
    네이티브 버튼이 유일한 지우기 수단이므로 건드리지 않는다.
  */
  ${props =>
    props.$hasClear
      ? css`
          &::-webkit-search-cancel-button {
            display: none;
          }
        `
      : null}

  /* DESIGN.md §Disabled: 비활성 입력도 테두리(grey200)를 유지한다 — 다시 활성화될 때
     칸의 형태가 흔들리지 않게. 그래서 커서와 글자색만 비활성으로 바꾼다. */
  &:disabled {
    color: var(--color-text-caption);
    cursor: not-allowed;
  }
`

/*
  `Slot` 과 나란히 서지만 **aria-hidden 이 아니다.** 지우기는 장식이 아니라 컨트롤이라
  접근 이름을 갖고 포커스 순서에도 있어야 한다.
*/
const ClearButton = styled.button`
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--color-text-caption);
  cursor: pointer;

  svg {
    width: 14px;
    height: 14px;
  }

  &:hover {
    background: var(--color-surface-muted);
    color: var(--color-text-800);
  }
`

/* 지우기 버튼과 같은 자리·크기. 보이는 크기는 24px, 모바일 히트 영역만 44px 로 넓힌다. */
const RevealButton = styled.button`
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--color-text-caption);
  cursor: pointer;

  svg {
    width: 20px;
    height: 20px;
  }

  &:hover {
    color: var(--color-text-800);
  }

  ${touchHitArea()}
`

const HelperText = styled.span<{ $hasError: boolean }>`
  color: ${props =>
    props.$hasError ? 'var(--color-danger)' : 'var(--color-text-caption)'};
  font-size: 13px;
  line-height: 20px;
`

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  (
    {
      emphasized = false,
      errorText,
      fieldSize = 'large',
      fullWidth = true,
      helperText,
      label,
      labelVisuallyHidden = false,
      leftSlot,
      onClear,
      revealable = false,
      rightSlot,
      type,
      'aria-describedby': describedBy,
      ...props
    },
    ref,
  ) => {
    const baseId = useId()
    const [revealed, setRevealed] = useState(false)
    const hasError = Boolean(errorText)
    // 빈 칸에 ✕ 를 두면 누를 것이 없는 버튼이 포커스 순서에 남는다.
    const showClear = Boolean(onClear) && Boolean(props.value)
    const canReveal = revealable && type === 'password'
    /*
      오류가 있어도 도움말(규칙 문구)을 지우지 않는다(#583) — 틀린 순간에 요구사항이 사라지면
      무엇을 고쳐야 하는지 읽을 곳이 없다. 둘이 함께면 도움말 아래에 오류 줄을 따로 둔다.
      오류만 있는 기존 사용처는 예전처럼 한 줄이다.
    */
    const helperId = helperText ? `${baseId}-helper` : null
    const errorId = hasError ? `${baseId}-error` : null
    /*
      토글 버튼이 `<label>` 안에 있어 그 이름(「비밀번호 표시」)이 입력칸 이름에 섞여 든다. 라벨 글자만
      이름이 되도록 aria-labelledby 로 고정한다. 호출부가 이름을 직접 줬으면 그쪽이 이긴다.
    */
    const labelId =
      canReveal && label && !props['aria-label'] && !props['aria-labelledby']
        ? `${baseId}-label`
        : undefined

    return (
      <Field $fullWidth={fullWidth}>
        {label ? (
          <FieldLabel id={labelId} $visuallyHidden={labelVisuallyHidden}>
            {label}
          </FieldLabel>
        ) : null}
        <InputShell
          $emphasized={emphasized}
          $hasError={hasError}
          $size={fieldSize}
        >
          {leftSlot ? <Slot aria-hidden="true">{leftSlot}</Slot> : null}
          <Input
            ref={ref}
            $hasClear={Boolean(onClear)}
            aria-invalid={hasError || undefined}
            aria-describedby={joinDescribedBy(describedBy, helperId, errorId)}
            aria-labelledby={labelId}
            type={canReveal && revealed ? 'text' : type}
            {...props}
          />
          {rightSlot ? <Slot aria-hidden="true">{rightSlot}</Slot> : null}
          {canReveal ? (
            <RevealButton
              type="button"
              aria-label={PASSWORD_REVEAL_LABEL}
              aria-pressed={revealed}
              /*
                누를 때 포커스가 버튼으로 옮겨 가지 않게 한다. 옮겨 가면 입력칸이 blur 돼, 쓰는 중인 칸에 「칸을 떠나면
                보이는」 오류가 뜨고 캐럿도 사라진다. 터치는 pointerdown 에서 막아야 뒤따르는 호환 mousedown 까지 막힌다.
                클릭(토글)은 그대로 온다. 키보드로 Tab 해 들어온 경우는 이미 칸을 떠난 것이라 그대로 둔다.
              */
              onPointerDown={event => event.preventDefault()}
              onMouseDown={event => event.preventDefault()}
              onClick={() => setRevealed(current => !current)}
            >
              {revealed ? (
                <EyeOff aria-hidden="true" />
              ) : (
                <Eye aria-hidden="true" />
              )}
            </RevealButton>
          ) : null}
          {showClear ? (
            <ClearButton
              type="button"
              aria-label="검색어 지우기"
              onClick={onClear}
            >
              <X aria-hidden="true" />
            </ClearButton>
          ) : null}
        </InputShell>
        {helperText ? (
          <HelperText id={helperId ?? undefined} $hasError={false}>
            {helperText}
          </HelperText>
        ) : null}
        {hasError ? (
          <HelperText id={errorId ?? undefined} $hasError>
            {errorText}
          </HelperText>
        ) : null}
      </Field>
    )
  },
)

TextField.displayName = 'TextField'
