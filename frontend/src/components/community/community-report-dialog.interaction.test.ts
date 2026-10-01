// @vitest-environment jsdom
import { createElement, useState } from 'react'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import CommunityReportDialog, {
  type CommunityReportDialogProps,
} from '@/components/community/community-report-dialog'

/*
  신고 다이얼로그의 사유 선택 계약(community.md §S4 「신고 다이얼로그」, CM-012, CM-036)을 실제 DOM 에서
  잠근다. 마크업 계약은 community-shared-ui.test.ts, 조립·검증 순수 함수는 lib/community/report-reason.test.ts.
*/

afterEach(() => {
  cleanup()
  document.body.style.overflow = ''
  vi.restoreAllMocks()
})

/* 첫 포커스는 requestAnimationFrame 뒤에 간다. */
const flushFrames = async (count = 2) => {
  for (let index = 0; index < count; index += 1) {
    await act(async () => {
      await new Promise(resolve => requestAnimationFrame(() => resolve(null)))
    })
  }
}

const renderDialog = (overrides: Partial<CommunityReportDialogProps> = {}) => {
  const props: CommunityReportDialogProps = {
    open: true,
    targetKind: 'POST',
    targetId: '7',
    pending: false,
    errorMessage: null,
    onClose: vi.fn(),
    onSubmit: vi.fn(),
    ...overrides,
  }
  const result = render(createElement(CommunityReportDialog, props))
  return { ...result, props }
}

const getRadios = () =>
  Array.from(
    document.body.querySelectorAll<HTMLInputElement>('input[type="radio"]'),
  )

const getRadio = (label: string) => {
  const radio = getRadios().find(input => input.value === label)
  if (!radio) {
    throw new Error(`사유 라디오가 없다: ${label}`)
  }
  return radio
}

const getTextArea = () => {
  const textarea = document.body.querySelector<HTMLTextAreaElement>('textarea')
  if (!textarea) {
    throw new Error('상세 입력칸이 없다')
  }
  return textarea
}

const getDetailLabel = () =>
  document.body.querySelector<HTMLLabelElement>(
    `label[for="${getTextArea().id}"]`,
  )?.textContent

const submit = () => {
  const button = Array.from(
    document.body.querySelectorAll<HTMLButtonElement>('button[type="submit"]'),
  ).find(element => element.textContent === '신고하기')
  if (!button) {
    throw new Error('신고하기 버튼이 없다')
  }
  fireEvent.click(button)
}

const alertTexts = () =>
  Array.from(document.body.querySelectorAll('[role="alert"]')).map(
    element => element.textContent,
  )

describe('CommunityReportDialog — 사유 선택', () => {
  it('열면 첫 사유 라디오로 포커스가 가고, 아무것도 골라져 있지 않다', async () => {
    renderDialog()
    await flushFrames()

    const radios = getRadios()
    expect(radios.map(radio => radio.value)).toEqual([
      '스팸·홍보',
      '욕설·비방',
      '개인정보 노출',
      '거짓 정보',
      '기타',
    ])
    expect(document.activeElement).toBe(radios[0])
    expect(radios.some(radio => radio.checked)).toBe(false)
    expect(document.body.querySelector('fieldset legend')?.textContent).toBe(
      '신고 사유',
    )
  })

  it('사유를 고르지 않으면 보내지 않고 안내한 뒤 첫 라디오로 포커스를 옮긴다', async () => {
    const { props } = renderDialog()
    await flushFrames()
    fireEvent.change(getTextArea(), { target: { value: '상세만 썼어요' } })
    getTextArea().focus()

    submit()

    expect(props.onSubmit).not.toHaveBeenCalled()
    expect(alertTexts()).toContain('신고 사유를 골라 주세요.')
    expect(document.activeElement).toBe(getRadios()[0])
    const fieldset = document.body.querySelector('fieldset')!
    expect(fieldset.getAttribute('aria-invalid')).toBe('true')
  })

  it('CM-036: 스팸·홍보 만 고르면 [스팸·홍보] 로 한 번 보낸다', async () => {
    const { props } = renderDialog()
    await flushFrames()

    fireEvent.click(getRadio('스팸·홍보'))
    expect(getRadio('스팸·홍보').checked).toBe(true)
    submit()

    expect(props.onSubmit).toHaveBeenCalledTimes(1)
    expect(props.onSubmit).toHaveBeenCalledWith('[스팸·홍보]')
  })

  it('상세를 쓰면 [사유] 상세 로 합쳐 보낸다', async () => {
    const { props } = renderDialog()
    await flushFrames()

    fireEvent.click(getRadio('개인정보 노출'))
    fireEvent.change(getTextArea(), {
      target: { value: '  본문에 전화번호가 있어요 \n' },
    })
    submit()

    expect(props.onSubmit).toHaveBeenCalledTimes(1)
    expect(props.onSubmit).toHaveBeenCalledWith(
      '[개인정보 노출] 본문에 전화번호가 있어요',
    )
  })

  it('CM-036: 기타를 고르면 상세가 필수가 되고, 비우면 보내지 않고 입력칸으로 보낸다', async () => {
    const { props } = renderDialog()
    await flushFrames()

    expect(getDetailLabel()).toBe('자세한 내용(선택)')
    fireEvent.click(getRadio('기타'))
    expect(getDetailLabel()).toBe('자세한 내용')
    expect(getTextArea().getAttribute('aria-required')).toBe('true')

    fireEvent.change(getTextArea(), { target: { value: '   ' } })
    submit()

    expect(props.onSubmit).not.toHaveBeenCalled()
    expect(alertTexts()).toContain('기타 사유를 적어 주세요.')
    expect(document.activeElement).toBe(getTextArea())
    expect(getTextArea().getAttribute('aria-invalid')).toBe('true')

    fireEvent.change(getTextArea(), { target: { value: '같은 글을 도배해요' } })
    expect(alertTexts()).not.toContain('기타 사유를 적어 주세요.')
    submit()
    expect(props.onSubmit).toHaveBeenCalledWith('[기타] 같은 글을 도배해요')
  })

  it('CM-012: 합친 길이가 500자를 넘으면 보내지 않고, 카운터는 합친 길이를 센다', async () => {
    const { props } = renderDialog()
    await flushFrames()

    expect(document.body.textContent).toContain('0 / 500')
    fireEvent.click(getRadio('스팸·홍보'))
    expect(document.body.textContent).toContain('7 / 500')
    // '[스팸·홍보] ' 8자 + 상세 492자 = 500자가 상세 한도다.
    expect(getTextArea().maxLength).toBe(492)

    // 키보드 입력은 maxLength 가 막지만, 접두가 긴 사유로 바꾸면 넘칠 수 있다.
    fireEvent.change(getTextArea(), { target: { value: '가'.repeat(492) } })
    expect(document.body.textContent).toContain('500 / 500')
    fireEvent.click(getRadio('개인정보 노출'))
    expect(document.body.textContent).toContain('502 / 500')

    submit()

    expect(props.onSubmit).not.toHaveBeenCalled()
    expect(alertTexts()).toContain('신고 사유는 500자 이하로 입력해 주세요.')
  })

  it('닫았다 다시 열면 고른 사유·상세·안내가 초기화된다', async () => {
    const onSubmit = vi.fn()
    const Harness = () => {
      const [open, setOpen] = useState(true)
      return createElement(
        'div',
        null,
        createElement(
          'button',
          { type: 'button', onClick: () => setOpen(true) },
          '다시 열기',
        ),
        createElement(CommunityReportDialog, {
          open,
          targetKind: 'POST',
          targetId: '7',
          pending: false,
          errorMessage: null,
          onClose: () => setOpen(false),
          onSubmit,
        }),
      )
    }
    render(createElement(Harness))
    await flushFrames()

    fireEvent.click(getRadio('기타'))
    submit()
    expect(alertTexts()).toContain('기타 사유를 적어 주세요.')
    fireEvent.change(getTextArea(), { target: { value: '적던 내용' } })

    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: 'Escape',
    })
    await flushFrames()
    expect(document.body.querySelector('[role="dialog"]')).toBeNull()

    fireEvent.click(
      Array.from(document.body.querySelectorAll('button')).find(
        button => button.textContent === '다시 열기',
      )!,
    )
    await flushFrames()

    expect(getRadios().some(radio => radio.checked)).toBe(false)
    expect(getTextArea().value).toBe('')
    expect(getDetailLabel()).toBe('자세한 내용(선택)')
    expect(alertTexts()).toEqual([])
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('보내는 중에는 Esc 로 닫히지 않고 사유를 바꿀 수 없다', async () => {
    const { props } = renderDialog({ pending: true })
    await flushFrames()

    expect(getRadios()).toHaveLength(5)
    expect(getRadios().every(radio => radio.matches(':disabled'))).toBe(true)
    expect(getTextArea().disabled).toBe(true)
    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: 'Escape',
    })
    expect(props.onClose).not.toHaveBeenCalled()
  })

  it('서버 오류 문구는 입력 안내와 따로 보인다', async () => {
    renderDialog({ errorMessage: '이미 신고한 글이에요.' })
    await flushFrames()

    expect(alertTexts()).toEqual(['이미 신고한 글이에요.'])
  })
})
