CREATE TABLE IF NOT EXISTS area_boundary (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '영역 PK',
    area_type VARCHAR(20) NOT NULL COMMENT '영역 타입(DISTRICT, ADMINISTRATION, COMMERCIAL)',
    area_code VARCHAR(32) NOT NULL COMMENT '영역 코드',
    area_name VARCHAR(120) NOT NULL COMMENT '영역 이름',
    center_lng DOUBLE NOT NULL COMMENT '중심점 경도',
    center_lat DOUBLE NOT NULL COMMENT '중심점 위도',
    boundary_geo_json JSON NOT NULL COMMENT '영역 경계 좌표(JSON)',
    bbox_min_lng DOUBLE NOT NULL COMMENT '최소 경도',
    bbox_min_lat DOUBLE NOT NULL COMMENT '최소 위도',
    bbox_max_lng DOUBLE NOT NULL COMMENT '최대 경도',
    bbox_max_lat DOUBLE NOT NULL COMMENT '최대 위도',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
    PRIMARY KEY (id),
    UNIQUE KEY uk_area_boundary_area_type_area_code (area_type, area_code),
    KEY idx_area_boundary_bbox_min_lng_bbox_max_lng (bbox_min_lng, bbox_max_lng),
    KEY idx_area_boundary_bbox_min_lat_bbox_max_lat (bbox_min_lat, bbox_max_lat)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='지도 영역 경계 데이터';
