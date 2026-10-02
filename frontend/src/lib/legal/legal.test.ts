import { describe, expect, it } from 'vitest'

import { LEGAL_DOCUMENTS } from '@/lib/legal'
import { LEGAL_CONTACT } from '@/lib/legal/contact'
import { LEGAL_HREF, LEGAL_LINKS } from '@/lib/legal/links'
import { privacyPolicy } from '@/lib/legal/privacy-policy'

/**
 * 법률 문서의 **구조**를 지킨다. 내용이 맞는지는 사람이 읽어야 하지만, 조 번호가 끊기거나 표의 행 길이가
 * 어긋나는 것은 기계가 잡을 수 있다. **개정할 때 한 조를 빠뜨리는 것이 가장 흔한 사고다.**
 */
describe('법률 문서 구조', () => {
  /* 아래 단언은 전부 순회 안에 있어서 배열이 비면 실행 가능한 테스트가 없는 파일이 된다 */
  it('검증 대상이 이용약관과 처리방침 둘이다', () => {
    expect(LEGAL_DOCUMENTS.map(doc => doc.id)).toEqual(['terms', 'privacy'])
  })

  for (const doc of LEGAL_DOCUMENTS) {
    describe(doc.title, () => {
      it('조 번호가 1부터 연속이다', () => {
        expect(doc.articles.map(article => article.no)).toEqual(
          doc.articles.map((_, index) => index + 1),
        )
      })

      it('표의 모든 행 길이가 머리글 수와 같다', () => {
        for (const article of doc.articles) {
          for (const block of article.blocks) {
            if (block.kind !== 'table') continue

            for (const row of block.rows) {
              expect(row, `제${article.no}조 표의 행`).toHaveLength(
                block.headers.length,
              )
            }
          }
        }
      })

      /* 화면이 행·셀 key 로 첫 칸·머리글을 쓴다 — 겹치면 React key 중복이다 */
      it('표의 첫 칸과 머리글이 겹치지 않는다', () => {
        for (const article of doc.articles) {
          for (const block of article.blocks) {
            if (block.kind !== 'table') continue

            const firstCells = block.rows.map(row => row[0])
            expect(new Set(firstCells).size, `제${article.no}조 행`).toBe(
              firstCells.length,
            )
            expect(
              new Set(block.headers).size,
              `제${article.no}조 머리글`,
            ).toBe(block.headers.length)
          }
        }
      })

      it('목록 항목이 겹치지 않는다 — 화면이 항목 문장을 key 로 쓴다', () => {
        for (const article of doc.articles) {
          for (const block of article.blocks) {
            if (block.kind !== 'list') continue

            expect(new Set(block.items).size, `제${article.no}조`).toBe(
              block.items.length,
            )
          }
        }
      })

      it('시행일이 YYYY-MM-DD 형식이다', () => {
        expect(doc.effectiveDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      })

      /* 이력에 현재 버전이 없으면 화면이 「지금 무엇을 보고 있는지」를 말하지 못한다 */
      it('개정 이력에 현재 버전이 있다', () => {
        expect(doc.history.map(revision => revision.version)).toContain(
          doc.version,
        )
      })

      it('빈 조문이 없다', () => {
        for (const article of doc.articles) {
          expect(article.blocks.length, `제${article.no}조`).toBeGreaterThan(0)
        }
      })
    })
  }
})

/**
 * **코드가 잡을 수 없는 값을 빌드가 잡게 만든다.** 보호책임자 성명·연락처는 사람이 정하는 값이라 자동으로
 * 채울 수 없다. 이메일은 서비스 도메인 주소여야 한다 — 공개 페이지라 크롤러가 그대로 수집하므로 개인
 * 메일 주소를 두면 스팸이 개인 메일함으로 간다.
 */
describe('개인정보 보호책임자', () => {
  it('성명이 비어 있지 않다', () => {
    expect(LEGAL_CONTACT.officerName.trim().length).toBeGreaterThan(0)
  })

  it('연락처가 서비스 도메인 이메일이다 — 개인 메일 주소를 두지 않는다', () => {
    expect(LEGAL_CONTACT.email).toMatch(/^[^@\s]+@bosspickseoul\.com$/)
  })
})

/**
 * 개인정보보호위원회 **표준 처리방침 양식(보호법 제30조)** 의 12개 절. 한 절을 지우거나 제목을 바꾸면 여기서
 * 걸린다. 개정하면서 절을 통째로 날리는 것이 실제로 일어나는 사고이고, 그 결과가 법정 기재사항 누락이다.
 */
const REQUIRED_SECTIONS = [
  '개인정보의 처리 목적',
  '개인정보의 처리 및 보유 기간',
  '처리하는 개인정보의 항목',
  '개인정보의 제3자 제공',
  '개인정보 처리의 위탁',
  '개인정보의 파기',
  '정보주체와 법정대리인의 권리·의무 및 행사방법',
  '개인정보의 안전성 확보조치',
  '개인정보 자동 수집 장치의 설치·운영 및 거부',
  '개인정보 보호책임자',
  '권익침해 구제방법',
  '개인정보 처리방침의 변경',
] as const

describe('개인정보 처리방침 — 법정 기재사항', () => {
  const titles = privacyPolicy.articles.map(article => article.title)

  for (const section of REQUIRED_SECTIONS) {
    it(`"${section}" 절이 있다`, () => {
      expect(titles).toContain(section)
    })
  }

  /* 법정 12개 절이 앞에 오고 그 뒤에 추가 절이 온다 — 심사자가 순서대로 훑는다 */
  it('법정 12개 절이 표준 양식 순서대로 제1조부터 놓인다', () => {
    expect(titles.slice(0, REQUIRED_SECTIONS.length)).toEqual([
      ...REQUIRED_SECTIONS,
    ])
  })

  it('보호책임자 절이 연락처 값을 그대로 싣는다', () => {
    const article = privacyPolicy.articles.find(
      item => item.title === '개인정보 보호책임자',
    )
    const text = JSON.stringify(article)

    expect(text).toContain(LEGAL_CONTACT.officerName)
    expect(text).toContain(LEGAL_CONTACT.email)
  })
})

/**
 * 처리방침은 코드 실측이다(privacy-policy.ts 머리 주석). GA4 태그가 코드에 있는 동안
 * 「분석 도구를 쓰지 않는다」는 문장이 되살아나면 문서가 거짓이 된다.
 */
describe('개인정보 처리방침 — 이용 통계(GA4)', () => {
  const text = JSON.stringify(privacyPolicy)

  it('분석 도구를 쓰지 않는다는 문장이 없다', () => {
    expect(text).not.toContain('분석 도구를 사용하지 않습니다')
  })

  it('GA 쿠키와 거부 방법을 고지한다', () => {
    expect(text).toContain('_ga')
    expect(text).toContain('tools.google.com/dlpage/gaoptout')
  })
})

describe('약관 링크', () => {
  it('푸터 링크가 두 문서의 경로를 가리킨다', () => {
    expect(LEGAL_LINKS.map(link => link.href)).toEqual([
      LEGAL_HREF.terms,
      LEGAL_HREF.privacy,
    ])
  })
})
