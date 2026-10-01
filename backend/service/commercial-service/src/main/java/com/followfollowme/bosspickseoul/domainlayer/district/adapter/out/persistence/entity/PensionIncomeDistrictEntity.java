package com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Comment;
import org.hibernate.annotations.Immutable;

/**
 * 국민연금 지역가입자 신고 기준소득월액의 자치구 평균. 상권 소득의 대체 원천이다. (이슈 #415)
 *
 * <p><b>batch-service 가 DDL 을 소유하는 읽기 전용 테이블</b>이다. 정본은 {@code scripts/migration/pension-income-district-table.sql}
 * 이고 이 엔티티는 그 컬럼을 그대로 미러링한다(coding-conventions §9-1 예외). 그래서 {@link Immutable} 이고 인덱스·유니크 키를
 * 선언하지 않으며, dev/local 의 {@code ddl-auto: update} 가 이 테이블을 만들거나 바꾸지 않게
 * {@code BatchOwnedTableSchemaFilterProvider} 가 스키마 도구에서 뺀다. 조회가 타는 키는 런북의
 * {@code uk_pension_income_district_district_code_reference_date (district_code, reference_date)} 다.
 *
 * <p>{@code spatial_version} 이 없다. 자치구 25 코드는 공간 스냅샷이 바뀌어도 그대로이고, 원천은 자치구보다 작은 단위를 주지 않는다.
 */
@Entity
@Immutable
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "pension_income_district")
public class PensionIncomeDistrictEntity {

    @Id
    @Comment("국민연금 자치구 평균소득 아이디")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Comment("기준일. 원천 기준년월의 말일(2024-12 → 2024-12-31)")
    @Column(nullable = false)
    private LocalDate referenceDate;

    @Comment("자치구 코드 (dataset_spatial_area.area_code, area_type=DISTRICT)")
    @Column(length = 5, nullable = false)
    private String districtCode;

    @Comment("자치구 이름. dataset_spatial_area 정규 이름")
    @Column(length = 10, nullable = false)
    private String districtName;

    @Comment("원천 시군구 원문 (서울특별시종로구)")
    @Column(length = 64, nullable = false)
    private String sourceRegionName;

    @Comment("국민연금 지역가입자 신고 기준소득월액 자치구 평균(원)")
    @Column(nullable = false)
    private Long averageMonthlyIncomeAmount;

    @Comment("원천 작성 시점 (--source-updated-at)")
    @Column(nullable = false)
    private LocalDateTime sourceUpdatedAt;

    @Comment("원본 파일 SHA-256. 보관본은 batch-raw 의 <run_id>-*/source.csv")
    @Column(length = 64, nullable = false)
    private String sourceChecksum;

    @Comment("적재한 batch run-id (BATCH_JOB_EXECUTION_PARAMS runId)")
    @Column(length = 64, nullable = false)
    private String runId;

    @Comment("적재 시각")
    @Column(nullable = false)
    private LocalDateTime loadedAt;
}
