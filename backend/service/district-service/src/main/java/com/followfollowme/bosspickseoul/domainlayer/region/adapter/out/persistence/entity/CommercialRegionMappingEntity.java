package com.followfollowme.bosspickseoul.domainlayer.region.adapter.out.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Comment;

@Entity
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PROTECTED)
@Table(
    name = "commercial_region_mapping",
    indexes = {
        @Index(name = "idx_commercial_region_mapping_district_code", columnList = "districtCode"),
        @Index(name = "idx_commercial_region_mapping_administration_code", columnList = "administrationCode"),
        // 지역명 조회(GET /regions/code-lookup)와 상권 코드 단건 조회는 인덱스가 없어 풀스캔이었다.
        // commercial_code 는 도메인상 유일하지만 실데이터 중복 여부를 확인하지 못했고, ddl-auto: update 환경에서
        // 유니크 생성이 실패하면 기동이 막히므로 일반 인덱스로 둔다. 승격 SQL 은 마이그레이션 런북에 남긴다.
        // 자치구 조회만 커버링으로 둔다. 실제 쿼리가 select distinct district_code, district_name where district_name = ?
        // 라 2컬럼이면 인덱스만 읽고 끝나지만, 행정동/상권은 각각 4·6컬럼을 담아야 커버링이 되어 1,650행 테이블에 과하다.
        @Index(
            name = "idx_commercial_region_mapping_district_name_district_code",
            columnList = "districtName, districtCode"
        ),
        @Index(name = "idx_commercial_region_mapping_administration_name", columnList = "administrationName"),
        @Index(name = "idx_commercial_region_mapping_commercial_name", columnList = "commercialName"),
        @Index(name = "idx_commercial_region_mapping_commercial_code", columnList = "commercialCode")
    })
public class CommercialRegionMappingEntity {

    @Id
    @Comment("영역_상권 아이디")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Comment("상권 분류 코드")
    @Column(length = 1, nullable = false)
    private String commercialClassificationCode;

    @Comment("상권 분류명")
    @Column(name = "commercial_classification_name", length = 4, nullable = false)
    private String commercialClassificationName;

    @Comment("상권 코드")
    @Column(length = 8, nullable = false)
    private String commercialCode;

    @Comment("상권명")
    @Column(name = "commercial_name", length = 80, nullable = false)
    private String commercialName;

    @Comment("x 좌표 값")
    @Column(nullable = false)
    private Double x;

    @Comment("y 좌표 값")
    @Column(nullable = false)
    private Double y;

    @Comment("자치구 코드")
    @Column(length = 5, nullable = false)
    private String districtCode;

    @Comment("자치구명")
    @Column(name = "district_name", length = 10, nullable = false)
    private String districtName;

    @Comment("행정동 코드")
    @Column(length = 10, nullable = false)
    private String administrationCode;

    @Comment("행정동명")
    @Column(name = "administration_name", length = 20, nullable = false)
    private String administrationName;
}
