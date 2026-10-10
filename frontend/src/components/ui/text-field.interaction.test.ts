// @vitest-environment jsdom
import { createElement } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { PASSWORD_REVEAL_LABEL, TextField } from '@/components/ui/text-field'

/*
  비밀번호 표시 토글(#583) — 실제 DOM 에서 누르면 칸의 type 이 바뀌고 상태가 aria-pressed 로 나가는지 본다.
*/

afterEach(() => {
  cleanup()
})

describe('TextField 비밀번호 표시 토글', () => {
  it('누를 때마다 글자를 보이고 가리며, 상태를 aria-pressed 로 알린다', () => {
    render(
      createElement(TextField, {
        label: '새 비밀번호',
        type: 'password',
        revealable: true,
        defaultValue: 'secret12!',
      }),
    )

    const input = screen.getByLabelText('새 비밀번호') as HTMLInputElement
    const toggle = screen.getByRole('button', { name: PASSWORD_REVEAL_LABEL })

    expect(input.type).toBe('password')
    expect(toggle.getAttribute('aria-pressed')).toBe('false')

    fireEvent.click(toggle)
    expect(input.type).toBe('text')
    expect(toggle.getAttribute('aria-pressed')).toBe('true')
    // 값은 그대로다 — 다시 입력하게 만들지 않는다.
    expect(input.value).toBe('secret12!')

    fireEvent.click(toggle)
    expect(input.type).toBe('password')
    expect(toggle.getAttribute('aria-pressed')).toBe('false')
  })

  it('토글은 제출 버튼이 아니다 — 폼 안에서 눌러도 제출하지 않는다', () => {
    let submitted = false
    render(
      createElement(
        'form',
        {
          onSubmit: (event: { preventDefault: () => void }) => {
            event.preventDefault()
            submitted = true
          },
        },
        createElement(TextField, {
          label: '비밀번호',
          type: 'password',
          revealable: true,
        }),
      ),
    )

    fireEvent.click(screen.getByRole('button', { name: PASSWORD_REVEAL_LABEL }))
    expect(submitted).toBe(false)
  })

  /*
    리뷰 지적(B16): 토글을 누르면 입력칸이 blur 돼 「칸을 떠나면 보이는」 오류가 쓰는 중에 떴다. 마우스·터치 모두
    누르는 순간의 기본 동작(포커스 이동)을 막아 입력칸에 포커스가 남아야 한다.
  */
  it('마우스·터치로 눌러도 입력칸의 포커스를 빼앗지 않는다', () => {
    let blurs = 0
    render(
      createElement(TextField, {
        label: '새 비밀번호',
        type: 'password',
        revealable: true,
        onBlur: () => {
          blurs += 1
        },
      }),
    )

    const input = screen.getByLabelText('새 비밀번호') as HTMLInputElement
    const toggle = screen.getByRole('button', { name: PASSWORD_REVEAL_LABEL })
    input.focus()

    // fireEvent 는 preventDefault 되면 false 를 돌려준다 — 브라우저가 포커스를 옮기지 않는다는 뜻이다.
    expect(fireEvent.pointerDown(toggle, { pointerType: 'touch' })).toBe(false)
    expect(fireEvent.pointerDown(toggle, { pointerType: 'mouse' })).toBe(false)
    expect(fireEvent.mouseDown(toggle)).toBe(false)
    fireEvent.click(toggle)

    expect(document.activeElement).toBe(input)
    expect(blurs).toBe(0)
    expect(input.type).toBe('text')
  })
})
