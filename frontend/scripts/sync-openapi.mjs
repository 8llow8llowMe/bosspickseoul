import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import prettier from 'prettier'

const frontendRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)
const outputDir = path.join(frontendRoot, 'docs', 'api', 'openapi')
const baseUrl =
  process.env.BOSSPICK_API_DOCS_URL ?? 'https://api-dev.bosspickseoul.com'

const services = [
  {
    id: 'region-map',
    label: '지역/지도',
    prefix: 'district-service',
  },
  {
    id: 'auth-member',
    label: '인증/회원',
    prefix: 'auth-service',
  },
  {
    id: 'commercial-analysis',
    label: '상권 분석',
    prefix: 'commercial-service',
  },
  {
    id: 'ai-report',
    label: 'AI 리포트',
    prefix: 'ai-service',
  },
  {
    id: 'community',
    label: '커뮤니티',
    prefix: 'community-service',
  },
]

const httpMethods = new Set(['get', 'post', 'put', 'patch', 'delete'])

const assertOpenApiDocument = (service, document) => {
  if (!document.openapi?.startsWith('3.')) {
    throw new Error(`${service.label}: OpenAPI 3.x 문서가 아닙니다.`)
  }

  if (!document.info?.title || !document.paths) {
    throw new Error(`${service.label}: info.title 또는 paths가 없습니다.`)
  }
}

const getOperations = document =>
  Object.entries(document.paths).flatMap(([apiPath, pathItem]) =>
    Object.entries(pathItem)
      .filter(([method]) => httpMethods.has(method))
      .map(([method, operation]) => ({
        method: method.toUpperCase(),
        path: apiPath,
        summary: operation.summary ?? '',
        requiresAuth:
          Array.isArray(operation.security) && operation.security.length > 0,
      })),
  )

const escapeTableCell = value => String(value).replaceAll('|', '\\|')

const formatOutput = async (contents, filepath) =>
  prettier.format(contents, {
    ...(await prettier.resolveConfig(filepath)),
    filepath,
  })

const buildEndpointMarkdown = snapshots => {
  const lines = [
    '# BossPickSeoul dev API endpoint snapshot',
    '',
    '> 이 파일은 `node frontend/scripts/sync-openapi.mjs`로 생성합니다.',
    '> 인증 여부는 각 operation의 OpenAPI `security` 선언만 기준으로 표시합니다.',
    '',
  ]

  for (const snapshot of snapshots) {
    lines.push(
      `## ${snapshot.service.label}`,
      '',
      `- OpenAPI: \`${snapshot.document.openapi}\``,
      `- 버전: \`${snapshot.document.info.version ?? '-'}\``,
      `- 원문: ${snapshot.sourceUrl}`,
      '',
      '| Method | Path | 요약 | 인증 |',
      '| --- | --- | --- | --- |',
    )

    for (const operation of snapshot.operations) {
      lines.push(
        `| ${operation.method} | \`${escapeTableCell(operation.path)}\` | ${escapeTableCell(operation.summary)} | ${operation.requiresAuth ? '필요' : '불필요'} |`,
      )
    }

    lines.push('')
  }

  return `${lines.join('\n')}\n`
}

await mkdir(outputDir, { recursive: true })

const snapshots = await Promise.all(
  services.map(async service => {
    const sourceUrl = `${baseUrl}/${service.prefix}/v3/api-docs`
    const response = await fetch(sourceUrl)

    if (!response.ok) {
      throw new Error(
        `${service.label}: OpenAPI 다운로드 실패 (HTTP ${response.status})`,
      )
    }

    const document = await response.json()
    assertOpenApiDocument(service, document)

    return {
      service,
      sourceUrl,
      document,
      operations: getOperations(document),
    }
  }),
)

const manifestServices = []

for (const snapshot of snapshots) {
  const filename = `${snapshot.service.id}.json`
  const filepath = path.join(outputDir, filename)
  const contents = await formatOutput(
    `${JSON.stringify(snapshot.document, null, 2)}\n`,
    filepath,
  )

  await writeFile(filepath, contents)
  manifestServices.push({
    id: snapshot.service.id,
    label: snapshot.service.label,
    title: snapshot.document.info.title,
    version: snapshot.document.info.version ?? null,
    openapi: snapshot.document.openapi,
    sourceUrl: snapshot.sourceUrl,
    pathCount: Object.keys(snapshot.document.paths).length,
    operationCount: snapshot.operations.length,
    schemaCount: Object.keys(snapshot.document.components?.schemas ?? {})
      .length,
    sha256: createHash('sha256').update(contents).digest('hex'),
  })
}

const manifest = {
  sourceBaseUrl: baseUrl,
  fetchedAt: new Date().toISOString(),
  services: manifestServices,
}

const manifestPath = path.join(outputDir, 'manifest.json')
await writeFile(
  manifestPath,
  await formatOutput(`${JSON.stringify(manifest, null, 2)}\n`, manifestPath),
)

const endpointsPath = path.join(outputDir, 'endpoints.md')
await writeFile(
  endpointsPath,
  await formatOutput(buildEndpointMarkdown(snapshots), endpointsPath),
)

for (const service of manifestServices) {
  console.log(
    `${service.label}: ${service.operationCount} operations, ${service.schemaCount} schemas`,
  )
}
