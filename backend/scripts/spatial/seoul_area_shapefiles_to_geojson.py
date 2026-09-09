# -*- coding: utf-8 -*-
"""서울시 상권분석서비스 영역 shapefile 3종을 batch-service `--job=spatial --source=GEOJSON` 입력으로 변환한다.

입력 (서울 열린데이터광장, 모두 EPSG:5181 · UTF-8 DBF, 내려받은 ZIP 을 그대로 넘긴다):
  - 영역-자치구  OA-22161  25건     필드 SIGNGU_CD, SIGNGU_NM
  - 영역-행정동  OA-22160  425건    필드 ADSTRD_CD, ADSTRD_NM
  - 영역-상권    OA-15560  1,650건  필드 TRDAR_CD, TRDAR_CD_N, ADSTRD_CD(상위 행정동)
출력: `SpatialGeoJsonSourceAdapter` 가 읽는 FeatureCollection 한 파일.
  - 최상위 `spatialVersion` · `sourceUpdatedAt` · `expectedCounts{DISTRICT,ADMINISTRATION,COMMERCIAL}`
  - Feature `properties` = areaType / areaCode / areaName / parentCode, geometry = WGS84 Polygon | MultiPolygon
  - `crs` 멤버 없음 (어댑터가 거부한다). 링은 닫혀 있고 RFC 7946 방향(외곽 반시계, 구멍 시계).

사용법:
  python seoul_area_shapefiles_to_geojson.py --district <자치구.zip> --administration <행정동.zip> \\
      --commercial <상권.zip> --spatial-version seoul-v2024 [--source-updated-at 2023-10-20T00:00:00Z] \\
      --output seoul-spatial-v2024.geojson

외부 패키지를 쓰지 않는다. EPSG:5181(Korea 2000 / Central Belt, GRS80 Transverse Mercator) → WGS84 역변환은
Krüger 급수(n^4)로 직접 계산하며, 서울 범위 난수 2,000점에서 pyproj 3.8 과 0.001mm 이내로 일치했다(2026-09-09).
Korea 2000 은 GRS80 기반 ITRF 계열이라 WGS84 와의 데이텀 변환은 두지 않는다.

검증(fail-closed): 건수 25/425/1650 이 아닌 입력, 코드 중복, 상위 코드 누락(행정동 → 자치구 앞 5자리, 상권 → ADSTRD_CD),
점이 부족한 링, 좌표 범위 이탈이 하나라도 있으면 파일을 쓰지 않고 멈춘다. `SpatialImportProcessor` 의 검증과 같은 규칙이다.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import math
import re
import struct
import sys
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

EXPECTED_COUNTS = {"DISTRICT": 25, "ADMINISTRATION": 425, "COMMERCIAL": 1650}
COORD_DECIMALS = 7  # 약 1cm. 원본(m 단위 소수 6자리)보다 넉넉하면서 파일 크기를 억제한다.
MAX_OUTPUT_BYTES = 64 * 1024 * 1024  # SpatialGeoJsonSourceAdapter.MAX_BYTES

# ---------------------------------------------------------------------------
# EPSG:5181 → WGS84 (Transverse Mercator inverse, Krüger series)
# ---------------------------------------------------------------------------
_A = 6378137.0
_F = 1 / 298.257222101
_K0 = 1.0
_LON0 = math.radians(127.0)
_LAT0 = math.radians(38.0)
_FALSE_EASTING = 200000.0
_FALSE_NORTHING = 500000.0

_n = _F / (2 - _F)
_n2, _n3, _n4 = _n ** 2, _n ** 3, _n ** 4
_RECT_A = _A / (1 + _n) * (1 + _n2 / 4 + _n4 / 64)
_ALPHA = (
    _n / 2 - 2 * _n2 / 3 + 5 * _n3 / 16 + 41 * _n4 / 180,
    13 * _n2 / 48 - 3 * _n3 / 5 + 557 * _n4 / 1440,
    61 * _n3 / 240 - 103 * _n4 / 140,
    49561 * _n4 / 161280,
)
_BETA = (
    _n / 2 - 2 * _n2 / 3 + 37 * _n3 / 96 - _n4 / 360,
    _n2 / 48 + _n3 / 15 - 437 * _n4 / 1440,
    17 * _n3 / 480 - 37 * _n4 / 840,
    4397 * _n4 / 161280,
)
_E = math.sqrt(_F * (2 - _F))


def _meridian_arc(lat: float) -> float:
    xi = math.atan(math.sinh(math.atanh(math.sin(lat)) - _E * math.atanh(_E * math.sin(lat))))
    return _RECT_A * (xi + sum(a * math.sin(2 * (j + 1) * xi) for j, a in enumerate(_ALPHA)))


_M0 = _meridian_arc(_LAT0)


def epsg5181_to_wgs84(x: float, y: float) -> tuple[float, float]:
    """평면 좌표(m) → (경도, 위도) 도 단위."""
    xi = (y - _FALSE_NORTHING + _K0 * _M0) / (_K0 * _RECT_A)
    eta = (x - _FALSE_EASTING) / (_K0 * _RECT_A)
    xi_p, eta_p = xi, eta
    for j, b in enumerate(_BETA):
        k = 2 * (j + 1)
        xi_p -= b * math.sin(k * xi) * math.cosh(k * eta)
        eta_p -= b * math.cos(k * xi) * math.sinh(k * eta)
    chi = math.asin(math.sin(xi_p) / math.cosh(eta_p))
    # 등각 위도(chi) → 측지 위도: tau 고정점 반복 (Karney, 2011)
    tau_p = math.tan(chi)
    tau = tau_p
    e2 = _E * _E
    for _ in range(12):
        sigma = math.sinh(_E * math.atanh(_E * tau / math.sqrt(1 + tau * tau)))
        tau_i = tau * math.sqrt(1 + sigma * sigma) - sigma * math.sqrt(1 + tau * tau)
        delta = (tau_p - tau_i) / math.sqrt(1 + tau_i * tau_i) * (1 + (1 - e2) * tau * tau) / ((1 - e2) * math.sqrt(1 + tau * tau))
        tau += delta
        if abs(delta) < 1e-15:
            break
    lon = _LON0 + math.atan2(math.sinh(eta_p), math.cos(xi_p))
    return math.degrees(lon), math.degrees(math.atan(tau))


# ---------------------------------------------------------------------------
# Shapefile / DBF 읽기 (ESRI Shapefile Technical Description, 1998)
# ---------------------------------------------------------------------------
@dataclass
class ShapeRecord:
    rings: list[list[tuple[float, float]]]  # 평면 좌표, 파트별 링
    attributes: dict[str, str]


def _read_zip_members(zip_path: Path) -> dict[str, bytes]:
    with zipfile.ZipFile(zip_path) as archive:
        members: dict[str, bytes] = {}
        for info in archive.infolist():
            ext = info.filename.rsplit(".", 1)[-1].lower()
            if ext in ("shp", "dbf", "prj", "cpg"):
                if ext in members:
                    raise SystemExit(f"{zip_path}: .{ext} 파일이 둘 이상이다")
                members[ext] = archive.read(info)
        for required in ("shp", "dbf"):
            if required not in members:
                raise SystemExit(f"{zip_path}: .{required} 가 없다")
        return members


def _require_epsg5181(prj: bytes | None, source: Path) -> None:
    if prj is None:
        print(f"[warn] {source}: .prj 가 없어 좌표계를 확인하지 못했다. EPSG:5181 로 가정한다.", file=sys.stderr)
        return
    text = prj.decode("ascii", errors="replace").replace(" ", "")
    markers = ("Korea_2000", "Transverse_Mercator", '"Central_Meridian",127', '"False_Easting",200000', '"False_Northing",500000')
    missing = [marker for marker in markers if marker not in text]
    if missing:
        raise SystemExit(f"{source}: .prj 가 EPSG:5181(Korea 2000 / Central Belt) 이 아니다. 누락 표식: {missing}")


def _read_dbf(dbf: bytes, encoding: str) -> list[dict[str, str]]:
    record_count = struct.unpack("<I", dbf[4:8])[0]
    header_length, record_length = struct.unpack("<HH", dbf[8:12])
    fields: list[tuple[str, int]] = []
    position = 32
    while dbf[position] != 0x0D:
        descriptor = dbf[position:position + 32]
        name = descriptor[:11].split(b"\x00")[0].decode("ascii")
        fields.append((name, descriptor[16]))
        position += 32
    rows = []
    position = header_length
    for _ in range(record_count):
        record = dbf[position:position + record_length]
        position += record_length
        if record[:1] == b"*":  # 삭제 표시된 레코드
            continue
        offset = 1
        row = {}
        for name, length in fields:
            row[name] = record[offset:offset + length].decode(encoding).strip()
            offset += length
        rows.append(row)
    return rows


def _read_shp_polygons(shp: bytes, source: Path) -> list[list[list[tuple[float, float]]]]:
    if struct.unpack(">i", shp[:4])[0] != 9994:
        raise SystemExit(f"{source}: shapefile 매직 넘버가 아니다")
    shape_type = struct.unpack("<i", shp[32:36])[0]
    if shape_type not in (5, 15, 25):  # Polygon, PolygonZ, PolygonM - 파트/점 배열의 앞부분 배치는 같다
        raise SystemExit(f"{source}: Polygon shapefile 이 아니다 (type={shape_type})")
    shapes = []
    position = 100
    while position < len(shp):
        _, content_length = struct.unpack(">ii", shp[position:position + 8])
        position += 8
        content = shp[position:position + content_length * 2]
        position += content_length * 2
        record_type = struct.unpack("<i", content[:4])[0]
        if record_type == 0:  # Null shape
            shapes.append([])
            continue
        if record_type != shape_type:
            raise SystemExit(f"{source}: 레코드 타입 불일치 ({record_type} != {shape_type})")
        part_count, point_count = struct.unpack("<ii", content[36:44])
        parts = struct.unpack(f"<{part_count}i", content[44:44 + 4 * part_count])
        points_offset = 44 + 4 * part_count
        points = [struct.unpack("<dd", content[points_offset + 16 * i:points_offset + 16 * i + 16]) for i in range(point_count)]
        rings = [points[parts[i]:(parts[i + 1] if i + 1 < part_count else point_count)] for i in range(part_count)]
        shapes.append(rings)
    return shapes


def read_shapefile_zip(zip_path: Path) -> list[ShapeRecord]:
    members = _read_zip_members(zip_path)
    _require_epsg5181(members.get("prj"), zip_path)
    encoding = (members.get("cpg") or b"cp949").decode("ascii", errors="replace").strip() or "cp949"
    try:
        "".encode(encoding)
    except LookupError:
        encoding = "cp949"
    rows = _read_dbf(members["dbf"], encoding)
    shapes = _read_shp_polygons(members["shp"], zip_path)
    if len(rows) != len(shapes):
        raise SystemExit(f"{zip_path}: DBF {len(rows)}건과 SHP {len(shapes)}건이 다르다")
    return [ShapeRecord(rings=shape, attributes=row) for shape, row in zip(shapes, rows)]


# ---------------------------------------------------------------------------
# 링 → GeoJSON geometry
# ---------------------------------------------------------------------------
def _signed_area(ring: list[tuple[float, float]]) -> float:
    total = 0.0
    for (x1, y1), (x2, y2) in zip(ring, ring[1:] + ring[:1]):
        total += x1 * y2 - x2 * y1
    return total / 2


def _contains(ring: list[tuple[float, float]], point: tuple[float, float]) -> bool:
    x, y = point
    inside = False
    for (x1, y1), (x2, y2) in zip(ring, ring[1:] + ring[:1]):
        if (y1 > y) != (y2 > y):
            cross = (x2 - x1) * (y - y1) / (y2 - y1) + x1
            if x < cross:
                inside = not inside
    return inside


def rings_to_geometry(rings: Iterable[list[tuple[float, float]]], label: str) -> dict:
    """shapefile 규약(외곽 시계, 구멍 반시계)으로 링을 폴리곤에 묶고 RFC 7946 방향으로 뒤집어 WGS84 geometry 를 만든다."""
    closed: list[list[tuple[float, float]]] = []
    for ring in rings:
        ring = list(ring)
        if len(ring) < 3:
            raise SystemExit(f"{label}: 점이 3개 미만인 링이 있다")
        if ring[0] != ring[-1]:
            ring.append(ring[0])
        if len(ring) < 4:
            raise SystemExit(f"{label}: 닫힌 링의 점이 4개 미만이다")
        closed.append(ring)
    outers = [ring for ring in closed if _signed_area(ring) < 0]
    holes = [ring for ring in closed if _signed_area(ring) > 0]
    if not outers:
        raise SystemExit(f"{label}: 외곽 링이 없다")
    polygons: list[list[list[tuple[float, float]]]] = [[outer] for outer in outers]
    for hole in holes:
        owner = next((polygon for polygon in polygons if _contains(polygon[0], hole[0])), None)
        if owner is None:
            raise SystemExit(f"{label}: 어느 외곽 링에도 속하지 않는 구멍이 있다")
        owner.append(hole)

    def project(ring: list[tuple[float, float]], reverse: bool) -> list[list[float]]:
        # shapefile 은 외곽 시계·구멍 반시계, RFC 7946 은 그 반대다. 모든 링을 뒤집는다.
        ordered = ring[::-1] if reverse else ring
        projected = []
        for x, y in ordered:
            lon, lat = epsg5181_to_wgs84(x, y)
            if not (124.0 <= lon <= 132.0 and 33.0 <= lat <= 39.0):
                raise SystemExit(f"{label}: 좌표가 한반도 범위를 벗어난다 ({lon}, {lat}) - 입력 좌표계를 확인하라")
            projected.append([round(lon, COORD_DECIMALS), round(lat, COORD_DECIMALS)])
        projected[-1] = list(projected[0])  # 반올림 뒤에도 닫힘을 보장
        return projected

    coordinates = [[project(ring, True) for ring in polygon] for polygon in polygons]
    if len(coordinates) == 1:
        return {"type": "Polygon", "coordinates": coordinates[0]}
    return {"type": "MultiPolygon", "coordinates": coordinates}


# ---------------------------------------------------------------------------
# 영역 3종 → FeatureCollection
# ---------------------------------------------------------------------------
@dataclass(frozen=True)
class AreaSpec:
    area_type: str
    code_field: str
    name_field: str
    parent_field: str | None  # None 이면 최상위(자치구) 또는 코드 앞 5자리 규칙(행정동)


SPECS = {
    "district": AreaSpec("DISTRICT", "SIGNGU_CD", "SIGNGU_NM", None),
    "administration": AreaSpec("ADMINISTRATION", "ADSTRD_CD", "ADSTRD_NM", None),
    "commercial": AreaSpec("COMMERCIAL", "TRDAR_CD", "TRDAR_CD_N", "ADSTRD_CD"),
}
PARENT_TYPE = {"ADMINISTRATION": "DISTRICT", "COMMERCIAL": "ADMINISTRATION"}


def _field(row: dict[str, str], name: str, label: str) -> str:
    value = row.get(name, "")
    if not value:
        raise SystemExit(f"{label}: DBF 필드 {name} 이 비어 있거나 없다. 있는 필드: {sorted(row)}")
    return value


def build_features(records: dict[str, list[ShapeRecord]]) -> list[dict]:
    features: list[dict] = []
    codes: dict[str, set[str]] = {area_type: set() for area_type in EXPECTED_COUNTS}
    for kind, spec in SPECS.items():
        for record in records[kind]:
            code = _field(record.attributes, spec.code_field, spec.area_type)
            label = f"{spec.area_type}/{code}"
            name = _field(record.attributes, spec.name_field, label)
            if spec.area_type == "DISTRICT":
                parent = None
            elif spec.area_type == "ADMINISTRATION":
                parent = code[:5]
            else:
                parent = _field(record.attributes, spec.parent_field, label)
            if not code.isdigit() or not 5 <= len(code) <= 8:
                raise SystemExit(f"{label}: 코드는 5~8자리 숫자여야 한다")
            if len(name) > 255:
                raise SystemExit(f"{label}: 이름이 255자를 넘는다")
            if code in codes[spec.area_type]:
                raise SystemExit(f"{label}: 코드가 중복된다")
            codes[spec.area_type].add(code)
            features.append({
                "type": "Feature",
                "properties": {"areaType": spec.area_type, "areaCode": code, "areaName": name, "parentCode": parent},
                "geometry": rings_to_geometry(record.rings, label),
            })
    for area_type, expected in EXPECTED_COUNTS.items():
        if len(codes[area_type]) != expected:
            raise SystemExit(f"{area_type}: {len(codes[area_type])}건 - 기대 {expected}건과 다르다. "
                             "원천 건수가 정말 바뀌었으면 EXPECTED_COUNTS 를 근거와 함께 고쳐라")
    for feature in features:
        props = feature["properties"]
        parent_type = PARENT_TYPE.get(props["areaType"])
        if parent_type and props["parentCode"] not in codes[parent_type]:
            raise SystemExit(f"{props['areaType']}/{props['areaCode']}: 상위 {parent_type} 코드 {props['parentCode']} 가 없다")
    return features


def zip_latest_timestamp(paths: Iterable[Path]) -> dt.datetime:
    latest: dt.datetime | None = None
    for path in paths:
        with zipfile.ZipFile(path) as archive:
            for info in archive.infolist():
                stamp = dt.datetime(*info.date_time, tzinfo=dt.timezone.utc)
                latest = stamp if latest is None or stamp > latest else latest
    if latest is None:
        raise SystemExit("ZIP 이 비어 있어 수정 시각을 정할 수 없다 - --source-updated-at 을 지정하라")
    return latest


def build_collection(records: dict[str, list[ShapeRecord]], spatial_version: str, updated_at: dt.datetime) -> dict:
    return {
        "type": "FeatureCollection",
        "spatialVersion": spatial_version,
        "sourceUpdatedAt": updated_at.astimezone(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "expectedCounts": dict(EXPECTED_COUNTS),
        "features": build_features(records),
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--district", required=True, type=Path, help="영역-자치구 ZIP (OA-22161)")
    parser.add_argument("--administration", required=True, type=Path, help="영역-행정동 ZIP (OA-22160)")
    parser.add_argument("--commercial", required=True, type=Path, help="영역-상권 ZIP (OA-15560)")
    parser.add_argument("--spatial-version", required=True, help="예: seoul-v2024. 배치 --spatial-version 과 같아야 한다")
    parser.add_argument("--source-updated-at", help="ISO-8601 (예: 2023-10-20T00:00:00Z). 생략하면 ZIP 내부 파일의 최신 수정 시각")
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args(argv)
    for stream in (sys.stdout, sys.stderr):  # Windows 콘솔(cp949)에서도 메시지 출력이 죽지 않게 한다
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(errors="replace")

    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]{0,63}", args.spatial_version):
        raise SystemExit("--spatial-version 은 영숫자로 시작하는 64자 이하 [A-Za-z0-9._-] 문자열이어야 한다")
    if args.source_updated_at:
        updated_at = dt.datetime.fromisoformat(args.source_updated_at.replace("Z", "+00:00"))
        if updated_at.tzinfo is None:
            raise SystemExit("--source-updated-at 에는 시간대(Z 또는 +09:00)가 필요하다")
    else:
        updated_at = zip_latest_timestamp([args.district, args.administration, args.commercial])
        print(f"[info] --source-updated-at 생략 → ZIP 내부 최신 수정 시각 {updated_at.isoformat()} 사용", file=sys.stderr)

    records = {
        "district": read_shapefile_zip(args.district),
        "administration": read_shapefile_zip(args.administration),
        "commercial": read_shapefile_zip(args.commercial),
    }
    collection = build_collection(records, args.spatial_version, updated_at)
    payload = json.dumps(collection, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    if len(payload) > MAX_OUTPUT_BYTES:
        raise SystemExit("출력이 64MiB 를 넘는다 - 어댑터 상한. COORD_DECIMALS 를 낮추거나 입력을 확인하라")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(payload)
    features = collection["features"]
    multi = sum(1 for feature in features if feature["geometry"]["type"] == "MultiPolygon")
    print(f"[ok] {args.output} - features {len(features)} (MultiPolygon {multi}), spatialVersion={args.spatial_version}, "
          f"sourceUpdatedAt={collection['sourceUpdatedAt']}, {len(payload) / 1024 / 1024:.1f} MiB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
