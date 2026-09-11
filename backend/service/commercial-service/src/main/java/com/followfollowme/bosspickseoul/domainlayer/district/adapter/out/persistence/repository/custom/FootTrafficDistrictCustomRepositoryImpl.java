package com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.repository.custom;

import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.entity.QFootTrafficDistrictEntity;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.projection.DistrictAreaProjection;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.projection.FootTrafficDistrictTopTenProjection;
import com.querydsl.core.types.Projections;
import com.querydsl.core.types.dsl.CaseBuilder;
import com.querydsl.core.types.dsl.NumberExpression;
import com.followfollowme.bosspickseoul.global.properties.DatasetSpatialVersion;
import com.querydsl.jpa.impl.JPAQueryFactory;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class FootTrafficDistrictCustomRepositoryImpl implements FootTrafficDistrictCustomRepository {

    private static final int TOP_TEN_LIMIT = 10;

    private final JPAQueryFactory queryFactory;
    private final DatasetSpatialVersion datasetSpatialVersion;

    @Override
    public List<FootTrafficDistrictTopTenProjection> findTopTenByFootTraffic(String currentPeriodCode, String previousPeriodCode) {
        QFootTrafficDistrictEntity current = QFootTrafficDistrictEntity.footTrafficDistrictEntity;
        QFootTrafficDistrictEntity previous = new QFootTrafficDistrictEntity("previous");

        // 이전 분기 유동인구가 0 이면 0 으로 나누게 된다. 그 경우 변화율을 0 으로 본다.
        // 가드가 없으면 DB 마다 결과가 갈린다 — MySQL 은 NULL 을 돌려주지만 H2 는
        // Division by zero 로 예외를 던져 슬라이스 테스트가 깨진다.
        // 이전 분기 행 자체가 없는 경우는 아래 join 이 INNER 라 행이 나오지 않는다.
        NumberExpression<Double> safePreviousFootTraffic = previous.totalFootTraffic.doubleValue().coalesce(0.0);
        NumberExpression<Double> footTrafficChangeRate = new CaseBuilder()
            .when(safePreviousFootTraffic.eq(0.0)).then(0.0)
            .otherwise(
                current.totalFootTraffic.doubleValue()
                    .subtract(safePreviousFootTraffic)
                    .divide(safePreviousFootTraffic)
                    .multiply(100.0)
            );

        return queryFactory
            .select(
                Projections.constructor(
                    FootTrafficDistrictTopTenProjection.class,
                    current.districtCode,
                    current.districtName,
                    current.totalFootTraffic,
                    footTrafficChangeRate
                )
            )
            .from(current)
            .join(previous)
            .on(current.districtCode.eq(previous.districtCode))
            .where(
                current.periodCode.eq(currentPeriodCode),
                current.spatialVersion.eq(datasetSpatialVersion.value()),
                previous.periodCode.eq(previousPeriodCode),
                previous.spatialVersion.eq(datasetSpatialVersion.value())
            )
            .orderBy(current.totalFootTraffic.desc())
            .limit(TOP_TEN_LIMIT)
            .fetch();
    }

    @Override
    public List<DistrictAreaProjection> findDistrictAreasByPeriodCode(String periodCode) {
        QFootTrafficDistrictEntity footTraffic = QFootTrafficDistrictEntity.footTrafficDistrictEntity;

        return queryFactory
            .select(
                Projections.constructor(
                    DistrictAreaProjection.class,
                    footTraffic.districtCode,
                    footTraffic.districtName
                )
            )
            .from(footTraffic)
            .where(
                footTraffic.periodCode.eq(periodCode),
                footTraffic.spatialVersion.eq(datasetSpatialVersion.value())
            )
            .groupBy(footTraffic.districtCode, footTraffic.districtName)
            .orderBy(footTraffic.districtName.asc())
            .fetch();
    }
}
