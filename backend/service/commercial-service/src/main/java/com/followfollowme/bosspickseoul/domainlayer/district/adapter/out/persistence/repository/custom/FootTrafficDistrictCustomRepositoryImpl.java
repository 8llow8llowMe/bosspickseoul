package com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.repository.custom;

import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.entity.QFootTrafficDistrictEntity;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.projection.DistrictAreaProjection;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.projection.FootTrafficDistrictRankingProjection;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.projection.FootTrafficDistrictTopTenProjection;
import com.querydsl.core.types.Projections;
import com.querydsl.core.types.dsl.NumberExpression;
import com.followfollowme.bosspickseoul.global.properties.DatasetSpatialVersion;
import com.querydsl.jpa.impl.JPAQuery;
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

        // 이전 분기 유동인구가 0 이면 변화율을 0 으로 본다(가드 이유는 DistrictChangeRateExpressions 참고).
        // 이전 분기 행 자체가 없는 경우는 아래 join 이 INNER 라 행이 나오지 않는다. Top10 은 이 동작을 그대로 둔다.
        // 동점은 자치구 코드 오름차순이다. 10위 경계의 동점에서 어느 구가 들어갈지 고정해 전체 순위의 상위 10개와 어긋나지 않게 한다.
        NumberExpression<Double> footTrafficChangeRate = DistrictChangeRateExpressions.zeroWhenMissing(
            current.totalFootTraffic.doubleValue(), previous.totalFootTraffic.doubleValue());

        return selectFootTrafficByDistrict(FootTrafficDistrictTopTenProjection.class, current, footTrafficChangeRate)
            .join(previous)
            .on(current.districtCode.eq(previous.districtCode))
            .where(
                current.periodCode.eq(currentPeriodCode),
                current.spatialVersion.eq(datasetSpatialVersion.value()),
                previous.periodCode.eq(previousPeriodCode),
                previous.spatialVersion.eq(datasetSpatialVersion.value())
            )
            .orderBy(current.totalFootTraffic.desc(), current.districtCode.asc())
            .limit(TOP_TEN_LIMIT)
            .fetch();
    }

    @Override
    public List<FootTrafficDistrictRankingProjection> findRankingsByFootTraffic(String currentPeriodCode, String previousPeriodCode) {
        QFootTrafficDistrictEntity current = QFootTrafficDistrictEntity.footTrafficDistrictEntity;
        QFootTrafficDistrictEntity previous = new QFootTrafficDistrictEntity("previous");

        // 전체 순위는 이전 분기 행이 없는 자치구도 빠지면 안 된다(이슈 #433). 그래서 LEFT JOIN 이고, 이전 분기 조건은 where 가 아니라
        // on 에 둔다 — where 에 두면 짝이 없어 NULL 인 행이 걸러져 INNER JOIN 과 같아진다. 짝이 없거나 0 이면 변화율은 NULL 이다.
        NumberExpression<Double> footTrafficChangeRate = DistrictChangeRateExpressions.nullWhenMissing(
            current.totalFootTraffic.doubleValue(), previous.totalFootTraffic.doubleValue());

        return selectFootTrafficByDistrict(FootTrafficDistrictRankingProjection.class, current, footTrafficChangeRate)
            .leftJoin(previous)
            .on(
                previous.districtCode.eq(current.districtCode),
                previous.periodCode.eq(previousPeriodCode),
                previous.spatialVersion.eq(datasetSpatialVersion.value())
            )
            .where(
                current.periodCode.eq(currentPeriodCode),
                current.spatialVersion.eq(datasetSpatialVersion.value())
            )
            .orderBy(current.totalFootTraffic.desc(), current.districtCode.asc())
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

    /** Top10 과 전체 순위가 함께 쓰는 select·from. 조인 방식과 정렬·limit 는 호출하는 쪽이 정한다. */
    private <P> JPAQuery<P> selectFootTrafficByDistrict(
        Class<P> projectionType, QFootTrafficDistrictEntity current, NumberExpression<Double> footTrafficChangeRate
    ) {
        return queryFactory
            .select(
                Projections.constructor(
                    projectionType,
                    current.districtCode,
                    current.districtName,
                    current.totalFootTraffic,
                    footTrafficChangeRate
                )
            )
            .from(current);
    }
}
