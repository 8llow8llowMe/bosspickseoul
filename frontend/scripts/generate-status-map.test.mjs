import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  buildStatusMapData,
  generateStatusMapSource,
  isPointInFeature,
  simplifyRing,
} from './generate-status-map.mjs'

const closeRing = points => [...points, points[0]]

const polygonFeature = (code, rings) => ({
  type: 'Feature',
  properties: { SIG_CD: code },
  geometry: { type: 'Polygon', coordinates: rings },
})

const featureCollection = features => ({ type: 'FeatureCollection', features })

describe('generate-status-map', () => {
  it('uses a point inside a concave district instead of its outside bbox center', () => {
    const geoJson = featureCollection([
      polygonFeature('01001', [
        closeRing([
          [0, 0],
          [10, 0],
          [10, 2],
          [2, 2],
          [2, 10],
          [0, 10],
        ]),
      ]),
    ])

    const map = buildStatusMapData(geoJson)
    const [feature] = map.features
    const bboxCenter = { x: 400, y: 310 }

    assert.equal(isPointInFeature(bboxCenter, feature.projectedPolygons), false)
    assert.equal(
      isPointInFeature(map.centers['01001'], feature.projectedPolygons),
      true,
    )
  })

  it('keeps centers out of holes and within a separated MultiPolygon district', () => {
    const geoJson = featureCollection([
      polygonFeature('01001', [
        closeRing([
          [0, 0],
          [10, 0],
          [10, 10],
          [0, 10],
        ]),
        closeRing([
          [3, 3],
          [7, 3],
          [7, 7],
          [3, 7],
        ]),
      ]),
      {
        type: 'Feature',
        properties: { SIG_CD: '01002' },
        geometry: {
          type: 'MultiPolygon',
          coordinates: [
            [
              closeRing([
                [20, 0],
                [22, 0],
                [22, 2],
                [20, 2],
              ]),
            ],
            [
              closeRing([
                [30, 0],
                [40, 0],
                [40, 10],
                [30, 10],
              ]),
            ],
          ],
        },
      },
    ])

    const map = buildStatusMapData(geoJson)

    for (const feature of map.features) {
      assert.equal(
        isPointInFeature(map.centers[feature.code], feature.projectedPolygons),
        true,
      )
    }
  })

  it('simplifies projected rings while preserving closure and valid ring shape', () => {
    const ring = closeRing([
      [0, 0],
      [1, 0.02],
      [2, -0.01],
      [3, 0.01],
      [4, 0],
      [4, 4],
      [0, 4],
    ])

    const simplified = simplifyRing(ring, 0.25)

    assert.ok(simplified.length < ring.length)
    assert.ok(simplified.length >= 4)
    assert.deepEqual(simplified[0], simplified.at(-1))
  })

  it('rejects invalid coordinates and duplicate district codes', () => {
    const square = closeRing([
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ])

    assert.throws(() =>
      buildStatusMapData(
        featureCollection([
          polygonFeature('01001', [square]),
          polygonFeature('01001', [square]),
        ]),
      ),
    )
    assert.throws(() =>
      buildStatusMapData(
        featureCollection([
          polygonFeature('01001', [
            closeRing([
              [0, 0],
              [Infinity, 0],
              [1, 1],
              [0, 1],
            ]),
          ]),
        ]),
      ),
    )
  })

  it('sorts features and emits deterministic, safely serialized source', () => {
    const geoJson = featureCollection([
      polygonFeature('01002', [
        closeRing([
          [10, 0],
          [20, 0],
          [20, 10],
          [10, 10],
        ]),
      ]),
      polygonFeature('01001', [
        closeRing([
          [0, 0],
          [10, 0],
          [10, 10],
          [0, 10],
        ]),
      ]),
    ])

    const options = { sourceName: 'fixture.geojson', sourceHash: 'abc123' }
    const first = generateStatusMapSource(geoJson, options)
    const second = generateStatusMapSource(geoJson, options)

    assert.equal(first, second)
    assert.ok(first.indexOf("'01001'") < first.indexOf("'01002'"))
    assert.match(first, /Source: "fixture\.geojson"/)
    assert.match(first, /SHA-256: "abc123"/)
    assert.match(
      first,
      /node scripts\/generate-status-map\.mjs <input-geojson> src\/data\/seoul-status-map\.ts/,
    )
  })
})
