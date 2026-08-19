# -*- coding: utf-8 -*-
"""V1(NowDoBoss) mysqldump에서 창업 시뮬레이션 시드 SQL을 생성한다.

입력: V1 덤프 (nowdoboss_rent.sql, nowdoboss_service_type.sql, nowdoboss_franchisee.sql)
출력:
  - backend/service/commercial-service/src/main/resources/db/simulation-seed.sql
      (simulation_rent 26행 + simulation_service_type 30행)
  - backend/scripts/data-migration/simulation-franchisee-seed.sql
      (simulation_franchisee 약 12,100행 — 용량 때문에 리소스가 아닌 스크립트 위치에 둔다)

사용법: python convert_v1_simulation_seed.py <V1_DUMP_DIR>
"""

import sys
from pathlib import Path

BATCH_SIZE = 500
# V1 덤프 수집 기준 연도. 재수집 시 새 연도로 바꿔 실행하면 기존 데이터와 공존 적재된다.
BASE_YEAR = "2024"


def extract_values_block(dump_path: Path, table: str) -> str:
    text = dump_path.read_text(encoding="utf-8", errors="replace")
    marker = f"INSERT INTO `{table}` VALUES "
    start = text.index(marker) + len(marker)
    end = text.index(";\n", start)
    return text[start:end]


def parse_tuples(values_block: str):
    """따옴표 안의 콤마/괄호를 존중하며 (a,b,...) 튜플들의 원시 필드 문자열 목록을 돌려준다."""
    tuples, fields, current = [], [], []
    in_string = False
    escaped = False
    depth = 0
    for ch in values_block:
        if in_string:
            current.append(ch)
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == "'":
                in_string = False
            continue
        if ch == "'":
            in_string = True
            current.append(ch)
        elif ch == "(":
            depth += 1
            if depth > 1:
                current.append(ch)
        elif ch == ")":
            depth -= 1
            if depth == 0:
                fields.append("".join(current).strip())
                tuples.append(fields)
                fields, current = [], []
            else:
                current.append(ch)
        elif ch == "," and depth == 1:
            fields.append("".join(current).strip())
            current = []
        elif depth >= 1:
            current.append(ch)
    return tuples


def strip_quotes(raw: str) -> str:
    return raw[1:-1] if raw.startswith("'") and raw.endswith("'") else raw


def main(dump_dir: Path) -> None:
    script_dir = Path(__file__).resolve().parent
    backend_dir = script_dir.parent.parent
    resource_seed = backend_dir / "service/commercial-service/src/main/resources/db/simulation-seed.sql"
    franchisee_seed = script_dir / "simulation-franchisee-seed.sql"

    # rent: (first_floor, other_floor, total, id, district_code, district_code_name)
    rent_rows = parse_tuples(extract_values_block(dump_dir / "nowdoboss_rent.sql", "rent"))
    rent_values = []
    for row in rent_rows:
        first_floor, other_floor, total, _id, district_code, district_name = row
        name = strip_quotes(district_name).strip()  # V1 데이터에 트레일링 공백이 있어 정리한다
        rent_values.append(f"('{BASE_YEAR}', '{strip_quotes(district_code)}', '{name}', {first_floor}, {other_floor}, {total})")

    # service_type: (key_money, key_money_level, key_money_ratio, large, medium, small, id, service_code, service_code_name)
    service_rows = parse_tuples(extract_values_block(dump_dir / "nowdoboss_service_type.sql", "service_type"))
    service_values = []
    service_by_v1_id = {}
    for row in service_rows:
        key_money, key_money_level, key_money_ratio, large, medium, small, v1_id, service_code, service_name = row
        service_by_v1_id[v1_id] = (strip_quotes(service_code), strip_quotes(service_name))
        service_values.append(
            f"('{BASE_YEAR}', '{strip_quotes(service_code)}', '{strip_quotes(service_name)}', {small}, {medium}, {large}, "
            f"{key_money}, {key_money_level}, {key_money_ratio})"
        )

    header = (
        "-- 창업 시뮬레이션 시드 데이터 (V1 NowDoBoss 덤프 이식, 기준: 2023-2024 수집분)\n"
        "-- 실행: commercial-service DB에 수동 또는 flyway/liquibase로 적재\n"
        "-- 생성 스크립트: backend/scripts/data-migration/convert_v1_simulation_seed.py\n\n"
    )
    seed_sql = [header]
    seed_sql.append(
        "INSERT INTO simulation_rent (base_year, district_code, district_name, first_floor_rent, other_floor_rent, total_rent)\nVALUES\n"
        + ",\n".join(rent_values) + ";\n\n"
    )
    seed_sql.append(
        "INSERT INTO simulation_service_type (base_year, service_code, service_name, small_size, medium_size, large_size, "
        "key_money_average, key_money_level, key_money_ratio)\nVALUES\n"
        + ",\n".join(service_values) + ";\n"
    )
    resource_seed.write_text("".join(seed_sql), encoding="utf-8", newline="\n")

    # franchisee: (area, deposit, education, etc, interior, subscription, total_levy, unit_area, id, service_type_id, brand_name)
    franchisee_rows = parse_tuples(extract_values_block(dump_dir / "nowdoboss_franchisee.sql", "franchisee"))
    franchisee_values = []
    skipped = 0
    for row in franchisee_rows:
        area, deposit, education, etc, interior, subscription, total_levy, unit_area, _id, service_type_id, brand_name = row
        mapped = service_by_v1_id.get(service_type_id)
        if mapped is None:
            skipped += 1
            continue
        service_code, service_name = mapped
        franchisee_values.append(
            f"('{BASE_YEAR}', '{service_code}', '{service_name}', {brand_name}, {subscription}, {education}, {deposit}, {etc}, "
            f"{total_levy}, {unit_area}, {interior}, {area})"
        )

    lines = [
        "-- 창업 시뮬레이션 프랜차이즈 시드 데이터 (V1 NowDoBoss 덤프 이식, 기준: 2023-2024 수집분)\n"
        "-- 실행: commercial-service DB에 수동 적재 (행 수가 많아 리소스가 아닌 스크립트 위치에 둔다)\n"
        f"-- 주의: 유니크 제약이 없어 재실행하면 행이 그대로 중복된다.\n"
        f"--       같은 기준 연도를 재적재할 때는 DELETE FROM simulation_franchisee WHERE base_year = '{BASE_YEAR}'; 를 먼저 실행할 것.\n"
        "-- 생성 스크립트: backend/scripts/data-migration/convert_v1_simulation_seed.py\n\n"
    ]
    for i in range(0, len(franchisee_values), BATCH_SIZE):
        batch = franchisee_values[i:i + BATCH_SIZE]
        lines.append(
            "INSERT INTO simulation_franchisee (base_year, service_code, service_name, brand_name, subscription, education, "
            "deposit, etc, total_levy, unit_area, interior, area)\nVALUES\n" + ",\n".join(batch) + ";\n\n"
        )
    franchisee_seed.write_text("".join(lines), encoding="utf-8", newline="\n")

    print(f"rent rows: {len(rent_values)}")
    print(f"service_type rows: {len(service_values)}")
    print(f"franchisee rows: {len(franchisee_values)} (skipped: {skipped})")
    print(f"wrote: {resource_seed}")
    print(f"wrote: {franchisee_seed}")


if __name__ == "__main__":
    main(Path(sys.argv[1]))
