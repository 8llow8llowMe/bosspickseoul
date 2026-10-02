import styled from 'styled-components'
import { legalCopy } from '@/lib/legal/copy'
import type { Block, LegalDocument } from '@/lib/legal/types'
import { centeredColumn } from '@/styles/layout'

/**
 * 약관·개인정보 처리방침 렌더러.
 *
 * **서버 컴포넌트다.** 상태도 세션 분기도 없다 — 두 문서가 같은 트리 모양을 쓰므로 화면을 둘로 만들지
 * 않는다. 본문이 마크다운이 아니라 구조체라 `dangerouslySetInnerHTML` 도 쓰지 않는다(`types.ts`).
 *
 * **폭은 중앙 묶음이다**(DESIGN §5). 목차 240 + 간격 32 + 본문 `--w-read`(720). 법률문서는 이 제품에서
 * 가장 긴 산문이라 상한이 없으면 1920 에서 한 줄이 1,800px 로 늘어난다. 헤더는 셸 그대로다.
 *
 * **목차는 `≥1080` 에서 왼쪽 고정 열**이고, 그보다 좁으면 제목과 본문 사이에 서서 조문 수만큼 길어지지
 * 않게 여러 칸으로 흐른다. DOM 은 `머리 → 목차 → 본문` 한 줄이라 두 번 그리지 않는다(스크린리더 중복 방지).
 *
 * **본문은 카드 한 장이다.** 조문마다 카드를 주지 않는다 — 열다섯 조는 한 문서의 조항이지 열다섯 개의
 * 답이 아니다. 조문 경계는 구분선이 긋는다. 개정 이력만 문서에 딸린 메타라 카드를 따로 받는다.
 *
 * **prop 이름이 `document` 가 아니라 `doc` 이다** — 전역 `document` 를 가리는 이름은 브라우저 API 를
 * 쓰는 코드가 이 파일에 들어올 때 조용히 틀린다.
 */

const HEADING_ID = 'legal-document-title'

const Page = styled.main`
  min-height: calc(100vh - 160px);
  padding: 32px 0 64px;
  background: var(--color-background-muted);

  @media (max-width: 767px) {
    padding: 24px 0 48px;
  }
`

const Layout = styled.div`
  ${centeredColumn('calc(240px + 32px + var(--w-read))')}
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;

  @media (min-width: 1080px) {
    grid-template-columns: 240px minmax(0, 1fr);
    column-gap: 32px;
    align-items: start;
  }
`

const Card = styled.section`
  min-width: 0;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
`

const Head = styled(Card).attrs({ as: 'header' })`
  display: grid;
  gap: 8px;
  padding: 24px;

  @media (min-width: 1080px) {
    grid-column: 2;
  }

  h1 {
    color: var(--color-text-900);
    font-size: 26px;
    font-weight: 700;
    line-height: 36px;
    word-break: keep-all;
  }

  p {
    color: var(--color-text-caption);
    font-size: 14px;
    line-height: 22px;
  }
`

const Toc = styled(Card).attrs({ as: 'nav' })`
  padding: 16px 8px;

  @media (min-width: 1080px) {
    grid-column: 1;
    grid-row: 1 / span 3;
    position: sticky;
    top: 96px;
    max-height: calc(100dvh - 120px);
    overflow-y: auto;
  }

  h2 {
    padding: 0 12px 8px;
    color: var(--color-text-caption);
    font-size: 13px;
    font-weight: 600;
    line-height: 20px;
  }

  ol {
    list-style: none;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));

    @media (min-width: 1080px) {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  a {
    display: block;
    padding: 8px 12px;
    border-radius: 8px;
    color: var(--color-text-600);
    font-size: 14px;
    line-height: 20px;
    word-break: keep-all;
    transition: background var(--motion-fast) var(--ease-standard);

    &:hover {
      background: var(--color-background-muted);
      color: var(--color-text-900);
    }
  }
`

const Body = styled(Card)`
  @media (min-width: 1080px) {
    grid-column: 2;
  }
`

const Article = styled.article`
  display: grid;
  gap: 12px;
  padding: 24px;

  & + & {
    border-top: 1px solid var(--color-border-200);
  }

  /* 고정 헤더(65px) 뒤로 제목이 들어가지 않게 — 목차에서 뛰었을 때 */
  h2 {
    scroll-margin-top: 88px;
    color: var(--color-text-900);
    font-size: 16px;
    font-weight: 600;
    line-height: 24px;
    word-break: keep-all;
  }
`

const Text = styled.p`
  color: var(--color-text-600);
  font-size: 14px;
  line-height: 24px;
  word-break: keep-all;
`

/* 전역 리셋이 list-style 을 지워서 번호를 명시한다. */
const List = styled.ol`
  list-style: decimal;
  display: grid;
  gap: 4px;
  padding-left: 20px;
  color: var(--color-text-600);
  font-size: 14px;
  line-height: 24px;
  word-break: keep-all;
`

/* 표는 좁은 화면에서 자기 스크롤러를 갖는다 — 그러지 않으면 페이지가 통째로 넘친다. */
const TableScroller = styled.div`
  overflow-x: auto;

  table {
    width: 100%;
    min-width: 480px;
    border-collapse: collapse;
    text-align: left;
    font-size: 13px;
    line-height: 20px;
  }

  th,
  td {
    padding: 8px 16px 8px 0;
    border-bottom: 1px solid var(--color-border-200);
    vertical-align: top;
    word-break: keep-all;
  }

  th {
    color: var(--color-text-900);
    font-weight: 600;
  }

  td {
    color: var(--color-text-600);
  }

  tbody tr:last-child td {
    border-bottom: 0;
  }
`

const History = styled(Card)`
  display: grid;
  gap: 8px;
  padding: 24px;

  @media (min-width: 1080px) {
    grid-column: 2;
  }

  h2 {
    color: var(--color-text-900);
    font-size: 16px;
    font-weight: 600;
    line-height: 24px;
  }

  dl {
    display: grid;
    gap: 4px;
  }

  dl > div {
    display: flex;
    gap: 12px;
    color: var(--color-text-600);
    font-size: 13px;
    line-height: 20px;
  }

  dt {
    flex-shrink: 0;
    font-weight: 500;
  }
`

function BlockView({ block }: { block: Block }) {
  if (block.kind === 'text') return <Text>{block.text}</Text>

  if (block.kind === 'list') {
    return (
      <List>
        {block.items.map(item => (
          <li key={item}>{item}</li>
        ))}
      </List>
    )
  }

  return (
    <TableScroller>
      <table>
        <thead>
          <tr>
            {block.headers.map(header => (
              <th key={header} scope="col">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map(row => (
            <tr key={row[0]}>
              {row.map((cell, cellIndex) => (
                <td key={block.headers[cellIndex]}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </TableScroller>
  )
}

export default function LegalDocumentView({ doc }: { doc: LegalDocument }) {
  const { articleLabel, tocLabel, effectiveDateLabel, historyLabel } = legalCopy

  return (
    <Page>
      <Layout>
        <Head aria-labelledby={HEADING_ID}>
          <h1 id={HEADING_ID}>{doc.title}</h1>
          <p>
            {effectiveDateLabel} {doc.effectiveDate}
          </p>
        </Head>

        <Toc aria-label={tocLabel}>
          <h2>{tocLabel}</h2>
          <ol>
            {doc.articles.map(article => (
              <li key={article.no}>
                <a href={`#article-${article.no}`}>
                  {articleLabel(article.no)} {article.title}
                </a>
              </li>
            ))}
          </ol>
        </Toc>

        <Body>
          {doc.articles.map(article => (
            <Article key={article.no}>
              <h2 id={`article-${article.no}`}>
                {articleLabel(article.no)}({article.title})
              </h2>
              {article.blocks.map((block, index) => (
                <BlockView key={index} block={block} />
              ))}
            </Article>
          ))}
        </Body>

        <History>
          <h2>{historyLabel}</h2>
          <dl>
            {doc.history.map(revision => (
              <div key={revision.version}>
                <dt>
                  {revision.version} · {revision.effectiveDate}
                </dt>
                <dd>{revision.summary}</dd>
              </div>
            ))}
          </dl>
        </History>
      </Layout>
    </Page>
  )
}
