import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const width = 800
const height = 620
const simplificationTolerance = 0.25
const pointOnSurfaceGridSize = 40
const epsilon = 1e-9

const round = value => Math.round(value * 100) / 100
const roundPoint = ([x, y]) => [round(x), round(y)]
const pointsEqual = ([firstX, firstY], [secondX, secondY]) =>
  firstX === secondX && firstY === secondY

function assertValidRing(ring, featureCode) {
  if (!Array.isArray(ring) || ring.length < 4) {
    throw new Error(
      `District ${JSON.stringify(featureCode)} has an invalid ring.`,
    )
  }

  for (const point of ring) {
    if (
      !Array.isArray(point) ||
      point.length < 2 ||
      !Number.isFinite(point[0]) ||
      !Number.isFinite(point[1])
    ) {
      throw new Error(
        `District ${JSON.stringify(featureCode)} has an invalid coordinate pair.`,
      )
    }
  }

  if (!pointsEqual(ring[0], ring.at(-1))) {
    throw new Error(
      `District ${JSON.stringify(featureCode)} ring must be closed.`,
    )
  }

  if (Math.abs(ringArea(ring)) <= epsilon) {
    throw new Error(
      `District ${JSON.stringify(featureCode)} ring has zero area.`,
    )
  }
}

function getPolygons(geometry, featureCode) {
  if (geometry?.type === 'Polygon') {
    return [geometry.coordinates]
  }

  if (geometry?.type === 'MultiPolygon') {
    return geometry.coordinates
  }

  throw new Error(
    `District ${JSON.stringify(featureCode)} must use Polygon or MultiPolygon geometry.`,
  )
}

function validateAndNormalizeFeatures(geoJson) {
  if (!Array.isArray(geoJson?.features) || geoJson.features.length === 0) {
    throw new Error(
      'GeoJSON FeatureCollection must include at least one feature.',
    )
  }

  const codes = new Set()
  const features = geoJson.features.map(feature => {
    const sourceCode = feature?.properties?.SIG_CD

    if (typeof sourceCode !== 'string' || sourceCode.trim() === '') {
      throw new Error(
        'Every feature must include a non-empty properties.SIG_CD.',
      )
    }

    const code = sourceCode.trim()
    if (codes.has(code)) {
      throw new Error(`Duplicate district code: ${JSON.stringify(code)}.`)
    }
    codes.add(code)

    const polygons = getPolygons(feature.geometry, code)
    if (!Array.isArray(polygons) || polygons.length === 0) {
      throw new Error(`District ${JSON.stringify(code)} must include polygons.`)
    }

    for (const polygon of polygons) {
      if (!Array.isArray(polygon) || polygon.length === 0) {
        throw new Error(`District ${JSON.stringify(code)} must include rings.`)
      }

      for (const ring of polygon) {
        assertValidRing(ring, code)
      }
    }

    return { code, polygons }
  })

  return features.sort((first, second) => first.code.localeCompare(second.code))
}

function getBounds(features) {
  let bounds

  for (const { polygons } of features) {
    for (const polygon of polygons) {
      for (const ring of polygon) {
        for (const [x, y] of ring) {
          if (!bounds) {
            bounds = { minX: x, maxX: x, minY: y, maxY: y }
            continue
          }

          bounds.minX = Math.min(bounds.minX, x)
          bounds.maxX = Math.max(bounds.maxX, x)
          bounds.minY = Math.min(bounds.minY, y)
          bounds.maxY = Math.max(bounds.maxY, y)
        }
      }
    }
  }

  if (!bounds || bounds.minX === bounds.maxX || bounds.minY === bounds.maxY) {
    throw new Error('GeoJSON bounds must have non-zero width and height.')
  }

  return bounds
}

function projectPolygons(polygons, bounds) {
  return polygons.map(polygon =>
    polygon.map(ring =>
      ring.map(([longitude, latitude]) =>
        roundPoint([
          ((longitude - bounds.minX) / (bounds.maxX - bounds.minX)) * width,
          ((bounds.maxY - latitude) / (bounds.maxY - bounds.minY)) * height,
        ]),
      ),
    ),
  )
}

function ringArea(ring) {
  let area = 0

  for (let index = 0; index < ring.length - 1; index += 1) {
    const [firstX, firstY] = ring[index]
    const [secondX, secondY] = ring[index + 1]
    area += firstX * secondY - secondX * firstY
  }

  return area / 2
}

function ringCentroid(ring) {
  const area = ringArea(ring)
  let x = 0
  let y = 0

  for (let index = 0; index < ring.length - 1; index += 1) {
    const [firstX, firstY] = ring[index]
    const [secondX, secondY] = ring[index + 1]
    const cross = firstX * secondY - secondX * firstY
    x += (firstX + secondX) * cross
    y += (firstY + secondY) * cross
  }

  return { x: x / (6 * area), y: y / (6 * area) }
}

function pointOnSegment(point, start, end) {
  const [x, y] = Array.isArray(point) ? point : [point.x, point.y]
  const [startX, startY] = start
  const [endX, endY] = end
  const cross = (x - startX) * (endY - startY) - (y - startY) * (endX - startX)

  if (Math.abs(cross) > epsilon) {
    return false
  }

  return (
    x >= Math.min(startX, endX) - epsilon &&
    x <= Math.max(startX, endX) + epsilon &&
    y >= Math.min(startY, endY) - epsilon &&
    y <= Math.max(startY, endY) + epsilon
  )
}

function pointInRing(point, ring) {
  let inside = false

  for (
    let index = 0, previous = ring.length - 1;
    index < ring.length;
    previous = index++
  ) {
    const currentPoint = ring[index]
    const previousPoint = ring[previous]

    if (pointOnSegment(point, previousPoint, currentPoint)) {
      return 0
    }

    const [currentX, currentY] = currentPoint
    const [previousX, previousY] = previousPoint
    const intersects =
      currentY > point.y !== previousY > point.y &&
      point.x <
        ((previousX - currentX) * (point.y - currentY)) /
          (previousY - currentY) +
          currentX

    if (intersects) {
      inside = !inside
    }
  }

  return inside ? 1 : -1
}

function isPointInPolygon(point, polygon) {
  if (pointInRing(point, polygon[0]) === -1) {
    return false
  }

  return polygon.slice(1).every(hole => pointInRing(point, hole) === -1)
}

function isPointStrictlyInPolygon(point, polygon) {
  return (
    pointInRing(point, polygon[0]) === 1 &&
    polygon.slice(1).every(hole => pointInRing(point, hole) === -1)
  )
}

export function isPointInFeature(point, polygons) {
  return polygons.some(polygon => isPointInPolygon(point, polygon))
}

function distanceToSegment(point, start, end) {
  const [startX, startY] = start
  const [endX, endY] = end
  const deltaX = endX - startX
  const deltaY = endY - startY
  const lengthSquared = deltaX * deltaX + deltaY * deltaY
  const projection =
    lengthSquared === 0
      ? 0
      : Math.max(
          0,
          Math.min(
            1,
            ((point.x - startX) * deltaX + (point.y - startY) * deltaY) /
              lengthSquared,
          ),
        )
  const closestX = startX + projection * deltaX
  const closestY = startY + projection * deltaY

  return Math.hypot(point.x - closestX, point.y - closestY)
}

function getRingBounds(ring) {
  return ring.reduce(
    (bounds, [x, y]) => ({
      minX: Math.min(bounds.minX, x),
      maxX: Math.max(bounds.maxX, x),
      minY: Math.min(bounds.minY, y),
      maxY: Math.max(bounds.maxY, y),
    }),
    { minX: ring[0][0], maxX: ring[0][0], minY: ring[0][1], maxY: ring[0][1] },
  )
}

function minimumDistanceToPolygonEdges(point, polygon) {
  let minimumDistance = Infinity

  for (const ring of polygon) {
    for (let index = 0; index < ring.length - 1; index += 1) {
      minimumDistance = Math.min(
        minimumDistance,
        distanceToSegment(point, ring[index], ring[index + 1]),
      )
    }
  }

  return minimumDistance
}

function findPointOnSurface(polygon) {
  const bounds = getRingBounds(polygon[0])
  let bestPoint = null
  let bestDistance = -Infinity

  for (let row = 1; row < pointOnSurfaceGridSize; row += 1) {
    for (let column = 1; column < pointOnSurfaceGridSize; column += 1) {
      const point = {
        x: round(
          bounds.minX +
            ((bounds.maxX - bounds.minX) * column) / pointOnSurfaceGridSize,
        ),
        y: round(
          bounds.minY +
            ((bounds.maxY - bounds.minY) * row) / pointOnSurfaceGridSize,
        ),
      }

      if (!isPointStrictlyInPolygon(point, polygon)) {
        continue
      }

      const distance = minimumDistanceToPolygonEdges(point, polygon)
      if (distance > bestDistance) {
        bestDistance = distance
        bestPoint = point
      }
    }
  }

  return bestPoint ?? { x: polygon[0][0][0], y: polygon[0][0][1] }
}

function createCenter(projectedPolygons) {
  const largestPolygon = projectedPolygons.reduce((largest, polygon) =>
    Math.abs(ringArea(polygon[0])) > Math.abs(ringArea(largest[0]))
      ? polygon
      : largest,
  )
  const candidate = ringCentroid(largestPolygon[0])
  const center = {
    x: round(candidate.x),
    y: round(candidate.y),
  }
  const insideCenter = isPointStrictlyInPolygon(center, largestPolygon)
    ? center
    : findPointOnSurface(largestPolygon)

  if (!isPointInFeature(insideCenter, projectedPolygons)) {
    throw new Error(
      'Unable to calculate a district center inside its geometry.',
    )
  }

  return insideCenter
}

function squaredDistanceToSegment(point, start, end) {
  const distance = distanceToSegment({ x: point[0], y: point[1] }, start, end)

  return distance * distance
}

function simplifyOpenPath(points, toleranceSquared) {
  if (points.length <= 2) {
    return points
  }

  let greatestDistance = -1
  let greatestIndex = 0
  const start = points[0]
  const end = points.at(-1)

  for (let index = 1; index < points.length - 1; index += 1) {
    const distance = squaredDistanceToSegment(points[index], start, end)
    if (distance > greatestDistance) {
      greatestDistance = distance
      greatestIndex = index
    }
  }

  if (greatestDistance <= toleranceSquared) {
    return [start, end]
  }

  return [
    ...simplifyOpenPath(
      points.slice(0, greatestIndex + 1),
      toleranceSquared,
    ).slice(0, -1),
    ...simplifyOpenPath(points.slice(greatestIndex), toleranceSquared),
  ]
}

function orientation(first, second, third) {
  return (
    (second[0] - first[0]) * (third[1] - first[1]) -
    (second[1] - first[1]) * (third[0] - first[0])
  )
}

function segmentsIntersect(firstStart, firstEnd, secondStart, secondEnd) {
  const first = orientation(firstStart, firstEnd, secondStart)
  const second = orientation(firstStart, firstEnd, secondEnd)
  const third = orientation(secondStart, secondEnd, firstStart)
  const fourth = orientation(secondStart, secondEnd, firstEnd)

  if (first * second < 0 && third * fourth < 0) {
    return true
  }

  return (
    (Math.abs(first) <= epsilon &&
      pointOnSegment(secondStart, firstStart, firstEnd)) ||
    (Math.abs(second) <= epsilon &&
      pointOnSegment(secondEnd, firstStart, firstEnd)) ||
    (Math.abs(third) <= epsilon &&
      pointOnSegment(firstStart, secondStart, secondEnd)) ||
    (Math.abs(fourth) <= epsilon &&
      pointOnSegment(firstEnd, secondStart, secondEnd))
  )
}

function hasSelfIntersection(ring) {
  const segmentCount = ring.length - 1

  for (let first = 0; first < segmentCount; first += 1) {
    for (let second = first + 1; second < segmentCount; second += 1) {
      if (
        second === first + 1 ||
        (first === 0 && second === segmentCount - 1)
      ) {
        continue
      }

      if (
        segmentsIntersect(
          ring[first],
          ring[first + 1],
          ring[second],
          ring[second + 1],
        )
      ) {
        return true
      }
    }
  }

  return false
}

export function simplifyRing(ring, tolerance = simplificationTolerance) {
  const simplified = simplifyOpenPath(ring, tolerance * tolerance)

  if (
    simplified.length < 4 ||
    !pointsEqual(simplified[0], simplified.at(-1)) ||
    Math.abs(ringArea(simplified)) <= epsilon ||
    hasSelfIntersection(simplified)
  ) {
    return ring
  }

  return simplified
}

function ringsIntersect(firstRing, secondRing) {
  for (let first = 0; first < firstRing.length - 1; first += 1) {
    for (let second = 0; second < secondRing.length - 1; second += 1) {
      if (
        segmentsIntersect(
          firstRing[first],
          firstRing[first + 1],
          secondRing[second],
          secondRing[second + 1],
        )
      ) {
        return true
      }
    }
  }

  return false
}

function simplifyPolygon(polygon) {
  const simplified = polygon.map(ring => simplifyRing(ring))
  const [outerRing, ...holes] = simplified
  const hasInvalidHole = holes.some(
    hole =>
      hole.some(
        point => pointInRing({ x: point[0], y: point[1] }, outerRing) !== 1,
      ) || ringsIntersect(outerRing, hole),
  )
  const hasIntersectingHoles = holes.some((hole, index) =>
    holes.slice(index + 1).some(otherHole => ringsIntersect(hole, otherHole)),
  )

  return hasInvalidHole || hasIntersectingHoles ? polygon : simplified
}

function createPath(polygons) {
  return polygons
    .flatMap(polygon => polygon)
    .map(ring =>
      ring
        .map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x} ${y}`)
        .join('')
        .concat('Z'),
    )
    .join('')
}

function countRingPoints(polygons) {
  return polygons.reduce(
    (total, polygon) =>
      total + polygon.reduce((ringTotal, ring) => ringTotal + ring.length, 0),
    0,
  )
}

export function buildStatusMapData(geoJson) {
  const features = validateAndNormalizeFeatures(geoJson)
  const bounds = getBounds(features)
  const mapFeatures = features.map(({ code, polygons }) => {
    const projectedPolygons = projectPolygons(polygons, bounds)
    const simplifiedPolygons = projectedPolygons.map(simplifyPolygon)
    const center = createCenter(projectedPolygons)

    if (!isPointInFeature(center, projectedPolygons)) {
      throw new Error(
        `District ${JSON.stringify(code)} center is outside its geometry.`,
      )
    }

    return {
      code,
      center,
      path: createPath(simplifiedPolygons),
      projectedPolygons,
      inputPointCount: countRingPoints(projectedPolygons),
      outputPointCount: countRingPoints(simplifiedPolygons),
    }
  })

  return {
    viewBox: `0 0 ${width} ${height}`,
    features: mapFeatures,
    paths: mapFeatures.map(feature => feature.path),
    centers: Object.fromEntries(
      mapFeatures.map(({ code, center }) => [code, center]),
    ),
    inputPointCount: mapFeatures.reduce(
      (total, feature) => total + feature.inputPointCount,
      0,
    ),
    outputPointCount: mapFeatures.reduce(
      (total, feature) => total + feature.outputPointCount,
      0,
    ),
  }
}

export function generateStatusMapSource(
  geoJson,
  { sourceName = 'input.geojson', sourceHash = 'unknown' } = {},
) {
  const map = buildStatusMapData(geoJson)
  const sourceFileName = path.basename(sourceName)
  const featureLines = map.features.flatMap(
    ({ code, path: mapPath, center }) => [
      '  {',
      '    districtCode: ' + JSON.stringify(code) + ',',
      '    path: ' + JSON.stringify(mapPath) + ',',
      '    center: { x: ' + center.x + ', y: ' + center.y + ' },',
      '  },',
    ],
  )

  return [
    '// Generated by scripts/generate-status-map.mjs. Do not edit manually.',
    `// Source: ${JSON.stringify(sourceFileName)}`,
    `// SHA-256: ${JSON.stringify(sourceHash)}`,
    '// Regenerate: node scripts/generate-status-map.mjs <input-geojson> src/data/seoul-status-map.ts',
    '',
    '// prettier-ignore',
    `export const SEOUL_STATUS_VIEW_BOX = ${JSON.stringify(map.viewBox)}`,
    '',
    '// prettier-ignore',
    'export const SEOUL_STATUS_FEATURES = [',
    ...featureLines,
    '] as const',
    '',
  ].join('\n')
}

function createSourceHash(source) {
  return createHash('sha256').update(source).digest('hex')
}

export async function runStatusMapGenerator(args = process.argv.slice(2)) {
  const [inputPath, outputPath] = args

  if (!inputPath || !outputPath) {
    throw new Error(
      'Usage: node scripts/generate-status-map.mjs <input-geojson> <output-ts>',
    )
  }

  const input = await readFile(inputPath, 'utf8')
  const source = generateStatusMapSource(JSON.parse(input), {
    sourceName: path.basename(inputPath),
    sourceHash: createSourceHash(input),
  })

  await mkdir(path.dirname(path.resolve(outputPath)), { recursive: true })
  await writeFile(outputPath, source)
}

if (process.argv[1] && path.resolve(process.argv[1]) === import.meta.filename) {
  await runStatusMapGenerator()
}
