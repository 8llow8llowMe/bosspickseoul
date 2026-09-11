package com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.repository.custom;

import static com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.entity.QStoreDistrictEntity.storeDistrictEntity;

import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.entity.QStoreDistrictEntity;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.projection.StoreDistrictClosedTopTenProjection;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.projection.StoreDistrictOpenedTopTenProjection;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.projection.StoreDistrictServiceTopEightProjection;
import com.querydsl.core.types.Projections;
import com.querydsl.core.types.dsl.CaseBuilder;
import com.querydsl.core.types.dsl.Expressions;
import com.querydsl.core.types.dsl.NumberExpression;
import com.querydsl.jpa.JPAExpressions;
import com.followfollowme.bosspickseoul.global.properties.DatasetSpatialVersion;
import com.querydsl.jpa.impl.JPAQueryFactory;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class StoreDistrictCustomRepositoryImpl implements StoreDistrictCustomRepository {

    private static final int TOP_TEN_LIMIT = 10;
    private static final int TOP_EIGHT_LIMIT = 8;
    private static final double PERCENT_MULTIPLIER = 100.0;

    private final JPAQueryFactory queryFactory;
    private final DatasetSpatialVersion datasetSpatialVersion;

    @Override
    public List<StoreDistrictOpenedTopTenProjection> findTopTenByOpenedStore(String currentPeriodCode, String previousPeriodCode) {
        QStoreDistrictEntity current = storeDistrictEntity;
        QStoreDistrictEntity previous = new QStoreDistrictEntity("previous");

        NumberExpression<Long> currentOpenedSum = current.openedStoreCount.sumLong();
        NumberExpression<Double> currentOpeningRateAvg = current.openingRate.avg();

        NumberExpression<Double> previousOpeningRateAvg = Expressions.asNumber(
            JPAExpressions
                .select(previous.openingRate.avg())
                .from(previous)
                .where(
                    previous.districtCode.eq(current.districtCode),
                    previous.periodCode.eq(previousPeriodCode),
                    previous.spatialVersion.eq(datasetSpatialVersion.value())
                )
        );

        // 이전 분기 행이 없으면 AVG 가 NULL 이고, 평균이 0 이면 0 으로 나누게 된다. 두 경우 모두
        // 변화율을 0 으로 본다. 가드가 없으면 DB 마다 결과가 갈린다 — MySQL 은 NULL 을 돌려주지만
        // H2 는 Division by zero 로 예외를 던져 슬라이스 테스트가 깨진다.
        // 행정동 쪽(SalesAdministrationRepositoryAdapter)이 쓰는 것과 같은 형태다.
        NumberExpression<Double> safePreviousOpeningRateAvg = previousOpeningRateAvg.coalesce(0.0);
        NumberExpression<Double> openingChangeRate = new CaseBuilder()
            .when(safePreviousOpeningRateAvg.eq(0.0)).then(0.0)
            .otherwise(
                currentOpeningRateAvg
                    .subtract(safePreviousOpeningRateAvg)
                    .divide(safePreviousOpeningRateAvg)
                    .multiply(PERCENT_MULTIPLIER)
            );

        return queryFactory
            .select(
                Projections.constructor(
                    StoreDistrictOpenedTopTenProjection.class,
                    current.districtCode,
                    current.districtName,
                    currentOpenedSum,
                    openingChangeRate
                )
            )
            .from(current)
            .where(
                current.periodCode.eq(currentPeriodCode),
                current.spatialVersion.eq(datasetSpatialVersion.value())
            )
            .groupBy(current.districtCode, current.districtName)
            .orderBy(currentOpenedSum.desc())
            .limit(TOP_TEN_LIMIT)
            .fetch();
    }

    @Override
    public List<StoreDistrictClosedTopTenProjection> findTopTenByClosedStore(String currentPeriodCode, String previousPeriodCode) {
        QStoreDistrictEntity current = storeDistrictEntity;
        QStoreDistrictEntity previous = new QStoreDistrictEntity("previous");

        NumberExpression<Long> currentClosedSum = current.closedStoreCount.sumLong();
        NumberExpression<Double> currentClosureRateAvg = current.closureRate.avg();

        NumberExpression<Double> previousClosureRateAvg = Expressions.asNumber(
            JPAExpressions
                .select(previous.closureRate.avg())
                .from(previous)
                .where(
                    previous.districtCode.eq(current.districtCode),
                    previous.periodCode.eq(previousPeriodCode),
                    previous.spatialVersion.eq(datasetSpatialVersion.value())
                )
        );

        // 가드 이유는 findTopTenByOpenedStore 주석 참고.
        NumberExpression<Double> safePreviousClosureRateAvg = previousClosureRateAvg.coalesce(0.0);
        NumberExpression<Double> closureChangeRate = new CaseBuilder()
            .when(safePreviousClosureRateAvg.eq(0.0)).then(0.0)
            .otherwise(
                currentClosureRateAvg
                    .subtract(safePreviousClosureRateAvg)
                    .divide(safePreviousClosureRateAvg)
                    .multiply(PERCENT_MULTIPLIER)
            );

        return queryFactory
            .select(
                Projections.constructor(
                    StoreDistrictClosedTopTenProjection.class,
                    current.districtCode,
                    current.districtName,
                    currentClosedSum,
                    closureChangeRate
                )
            )
            .from(current)
            .where(
                current.periodCode.eq(currentPeriodCode),
                current.spatialVersion.eq(datasetSpatialVersion.value())
            )
            .groupBy(current.districtCode, current.districtName)
            .orderBy(currentClosedSum.desc())
            .limit(TOP_TEN_LIMIT)
            .fetch();
    }

    @Override
    public List<StoreDistrictServiceTopEightProjection> findTopEightByTotalStore(String periodCode, String districtCode) {
        QStoreDistrictEntity store = storeDistrictEntity;

        return queryFactory
            .select(
                Projections.constructor(
                    StoreDistrictServiceTopEightProjection.class,
                    store.serviceCode,
                    store.serviceName,
                    store.totalStoreCount.sumLong()
                )
            )
            .from(store)
            .where(
                store.periodCode.eq(periodCode),
                store.districtCode.eq(districtCode),
                store.spatialVersion.eq(datasetSpatialVersion.value()),
                store.serviceType.isNotNull()
            )
            .groupBy(store.serviceCode, store.serviceName)
            .orderBy(store.totalStoreCount.sumLong().desc())
            .limit(TOP_EIGHT_LIMIT)
            .fetch();
    }
}
