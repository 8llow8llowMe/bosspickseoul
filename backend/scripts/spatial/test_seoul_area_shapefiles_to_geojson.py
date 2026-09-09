# -*- coding: utf-8 -*-
"""seoul_area_shapefiles_to_geojson 단위 테스트. 합성 shapefile ZIP 을 메모리에서 만들어 변환 규칙을 고정한다.

실행: python -m unittest backend/scripts/spatial/test_seoul_area_shapefiles_to_geojson.py
"""

from __future__ import annotations

import json
import struct
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import seoul_area_shapefiles_to_geojson as converter  # noqa: E402

PRJ = (b'PROJCS["Korea_2000_Korea_Central_Belt",GEOGCS["GCS_Korea_2000",DATUM["D_Korea_2000",'
       b'SPHEROID["GRS_1980",6378137.0,298.257222101]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],'
       b'PROJECTION["Transverse_Mercator"],PARAMETER["False_Easting",200000.0],PARAMETER["False_Northing",500000.0],'
       b'PARAMETER["Central_Meridian",127.0],PARAMETER["Scale_Factor",1.0],PARAMETER["Latitude_Of_Origin",38.0],UNIT["Meter",1.0]]')


def square(x: float, y: float, size: float, clockwise: bool) -> list[tuple[float, float]]:
    ring = [(x, y), (x, y + size), (x + size, y + size), (x + size, y), (x, y)]
    return ring if clockwise else ring[::-1]


def polygon_record(rings: list[list[tuple[float, float]]]) -> bytes:
    points = [point for ring in rings for point in ring]
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    parts = []
    offset = 0
    for ring in rings:
        parts.append(offset)
        offset += len(ring)
    body = struct.pack("<i", 5) + struct.pack("<4d", min(xs), min(ys), max(xs), max(ys))
    body += struct.pack("<ii", len(rings), len(points)) + struct.pack(f"<{len(parts)}i", *parts)
    body += b"".join(struct.pack("<dd", *p) for p in points)
    return body


def shp_bytes(records: list[bytes]) -> bytes:
    contents = b""
    for number, body in enumerate(records, start=1):
        contents += struct.pack(">ii", number, len(body) // 2) + body
    header = struct.pack(">i", 9994) + b"\x00" * 20 + struct.pack(">i", (100 + len(contents)) // 2)
    header += struct.pack("<ii", 1000, 5) + struct.pack("<8d", 0, 0, 0, 0, 0, 0, 0, 0)
    return header + contents


def dbf_bytes(fields: list[tuple[str, int]], rows: list[dict[str, str]]) -> bytes:
    record_length = 1 + sum(length for _, length in fields)
    header_length = 32 + 32 * len(fields) + 1
    header = bytes([3, 124, 1, 1]) + struct.pack("<IHH", len(rows), header_length, record_length) + b"\x00" * 20
    for name, length in fields:
        header += name.encode("ascii").ljust(11, b"\x00") + b"C" + b"\x00" * 4 + bytes([length, 0]) + b"\x00" * 14
    header += b"\x0d"
    body = b""
    for row in rows:
        body += b" "
        for name, length in fields:
            body += row.get(name, "").encode("utf-8").ljust(length, b" ")
    return header + body + b"\x1a"


def write_zip(path: Path, stem: str, shp: bytes, dbf: bytes, prj: bytes | None = PRJ) -> Path:
    members = {f"{stem}.shp": shp, f"{stem}.dbf": dbf, f"{stem}.cpg": b"UTF-8"}
    if prj is not None:
        members[f"{stem}.prj"] = prj
    with zipfile.ZipFile(path, "w") as archive:
        for name, data in members.items():
            archive.writestr(zipfile.ZipInfo(name, date_time=(2023, 10, 20, 11, 9, 18)), data)
    return path


class ProjectionTest(unittest.TestCase):
    def test_known_point_matches_reference(self):
        # 배화여자대학교 상권(3110008) 중심점: pyproj 3.8 로 구한 참조값
        lon, lat = converter.epsg5181_to_wgs84(197093, 453418)
        self.assertAlmostEqual(lon, 126.9670895683088, places=9)
        self.assertAlmostEqual(lat, 37.5803094383525, places=9)

    def test_origin_maps_to_projection_center(self):
        lon, lat = converter.epsg5181_to_wgs84(200000, 500000)
        self.assertAlmostEqual(lon, 127.0, places=9)
        self.assertAlmostEqual(lat, 38.0, places=9)


class GeometryTest(unittest.TestCase):
    def test_outer_and_hole_are_grouped_and_reoriented(self):
        outer = square(190000, 450000, 1000, clockwise=True)
        hole = square(190400, 450400, 200, clockwise=False)
        geometry = converter.rings_to_geometry([outer, hole], "T")
        self.assertEqual(geometry["type"], "Polygon")
        self.assertEqual(len(geometry["coordinates"]), 2)
        self.assertGreater(signed_area(geometry["coordinates"][0]), 0, "외곽은 반시계(RFC 7946)")
        self.assertLess(signed_area(geometry["coordinates"][1]), 0, "구멍은 시계(RFC 7946)")
        for ring in geometry["coordinates"]:
            self.assertEqual(ring[0], ring[-1])

    def test_two_outers_become_multipolygon(self):
        geometry = converter.rings_to_geometry(
            [square(190000, 450000, 100, True), square(195000, 455000, 100, True)], "T")
        self.assertEqual(geometry["type"], "MultiPolygon")
        self.assertEqual(len(geometry["coordinates"]), 2)

    def test_unclosed_ring_is_closed(self):
        geometry = converter.rings_to_geometry([square(190000, 450000, 100, True)[:-1]], "T")
        ring = geometry["coordinates"][0]
        self.assertEqual(ring[0], ring[-1])
        self.assertEqual(len(ring), 5)

    def test_orphan_hole_fails(self):
        with self.assertRaises(SystemExit):
            converter.rings_to_geometry([square(190000, 450000, 100, True), square(199000, 459000, 10, False)], "T")


class EndToEndTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = Path(self.tmp.name)
        self.original_counts = dict(converter.EXPECTED_COUNTS)
        converter.EXPECTED_COUNTS.update({"DISTRICT": 1, "ADMINISTRATION": 1, "COMMERCIAL": 2})

    def tearDown(self):
        converter.EXPECTED_COUNTS.clear()
        converter.EXPECTED_COUNTS.update(self.original_counts)
        self.tmp.cleanup()

    def zips(self, commercial_parent: str = "11110515"):
        district = write_zip(self.dir / "d.zip", "d",
                             shp_bytes([polygon_record([square(190000, 450000, 5000, True)])]),
                             dbf_bytes([("SIGNGU_CD", 5), ("SIGNGU_NM", 30)], [{"SIGNGU_CD": "11110", "SIGNGU_NM": "종로구"}]))
        administration = write_zip(self.dir / "a.zip", "a",
                                   shp_bytes([polygon_record([square(190000, 450000, 2000, True)])]),
                                   dbf_bytes([("ADSTRD_CD", 8), ("ADSTRD_NM", 30)],
                                             [{"ADSTRD_CD": "11110515", "ADSTRD_NM": "청운효자동"}]))
        commercial = write_zip(self.dir / "c.zip", "c",
                               shp_bytes([polygon_record([square(190000, 450000, 500, True)]),
                                          polygon_record([square(191000, 451000, 300, True), square(191600, 451000, 300, True)])]),
                               dbf_bytes([("TRDAR_CD", 10), ("TRDAR_CD_N", 254), ("ADSTRD_CD", 8)],
                                         [{"TRDAR_CD": "3110008", "TRDAR_CD_N": "배화여자대학교", "ADSTRD_CD": commercial_parent},
                                          {"TRDAR_CD": "3110009", "TRDAR_CD_N": "자하문터널", "ADSTRD_CD": commercial_parent}]))
        return district, administration, commercial

    def test_builds_feature_collection_contract(self):
        district, administration, commercial = self.zips()
        output = self.dir / "out.geojson"
        code = converter.main(["--district", str(district), "--administration", str(administration),
                               "--commercial", str(commercial), "--spatial-version", "test-v1", "--output", str(output)])
        self.assertEqual(code, 0)
        collection = json.loads(output.read_text(encoding="utf-8"))
        self.assertEqual(collection["type"], "FeatureCollection")
        self.assertNotIn("crs", collection)
        self.assertEqual(collection["spatialVersion"], "test-v1")
        self.assertEqual(collection["sourceUpdatedAt"], "2023-10-20T11:09:18Z", "ZIP 내부 파일 시각을 UTC 로 쓴다")
        self.assertEqual(collection["expectedCounts"], {"DISTRICT": 1, "ADMINISTRATION": 1, "COMMERCIAL": 2})
        by_code = {f["properties"]["areaCode"]: f for f in collection["features"]}
        self.assertEqual(by_code["11110"]["properties"], {"areaType": "DISTRICT", "areaCode": "11110", "areaName": "종로구", "parentCode": None})
        self.assertEqual(by_code["11110515"]["properties"]["parentCode"], "11110", "행정동의 상위는 코드 앞 5자리")
        self.assertEqual(by_code["3110008"]["properties"]["parentCode"], "11110515", "상권의 상위는 ADSTRD_CD")
        self.assertEqual(by_code["3110009"]["geometry"]["type"], "MultiPolygon")
        lon, lat = by_code["11110"]["geometry"]["coordinates"][0][0]
        self.assertTrue(126.0 < lon < 128.0 and 37.0 < lat < 38.0)

    def test_missing_parent_fails_closed(self):
        district, administration, commercial = self.zips(commercial_parent="11110999")
        with self.assertRaises(SystemExit):
            converter.main(["--district", str(district), "--administration", str(administration),
                            "--commercial", str(commercial), "--spatial-version", "test-v1",
                            "--output", str(self.dir / "out.geojson")])
        self.assertFalse((self.dir / "out.geojson").exists())

    def test_wrong_crs_fails(self):
        district, administration, commercial = self.zips()
        bad = write_zip(self.dir / "bad.zip", "bad",
                        shp_bytes([polygon_record([square(190000, 450000, 5000, True)])]),
                        dbf_bytes([("SIGNGU_CD", 5), ("SIGNGU_NM", 30)], [{"SIGNGU_CD": "11110", "SIGNGU_NM": "종로구"}]),
                        prj=b'PROJCS["WGS_1984_UTM_Zone_52N",PROJECTION["Transverse_Mercator"]]')
        with self.assertRaises(SystemExit):
            converter.main(["--district", str(bad), "--administration", str(administration),
                            "--commercial", str(commercial), "--spatial-version", "test-v1",
                            "--output", str(self.dir / "out.geojson")])

    def test_explicit_source_updated_at_requires_timezone(self):
        district, administration, commercial = self.zips()
        with self.assertRaises(SystemExit):
            converter.main(["--district", str(district), "--administration", str(administration),
                            "--commercial", str(commercial), "--spatial-version", "test-v1",
                            "--source-updated-at", "2024-01-01T00:00:00", "--output", str(self.dir / "out.geojson")])


def signed_area(ring: list[list[float]]) -> float:
    return sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in zip(ring, ring[1:] + ring[:1])) / 2


if __name__ == "__main__":
    unittest.main()
