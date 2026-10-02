package com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.repository.custom;

import static com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.entity.QStoreDistrictEntity.storeDistrictEntity;

import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.entity.QStoreDistrictEntity;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.projection.StoreDistrictClosedRankingProjection;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.projection.StoreDistrictClosedTopTenProjection;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.projection.StoreDistrictOpenedRankingProjection;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.projection.StoreDistrictOpenedTopTenProjection;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.projection.StoreDistrictServiceTopEightProjection;
import com.querydsl.core.types.Projections;
import com.querydsl.core.types.dsl.Expressions;
import com.querydsl.core.types.dsl.NumberExpression;
import com.querydsl.core.types.dsl.NumberPath;
import com.querydsl.jpa.JPAExpressions;
import com.followfollowme.bosspickseoul.global.properties.DatasetSpatialVersion;
import com.querydsl.jpa.impl.JPAQuery;
import com.querydsl.jpa.impl.JPAQueryFactory;
import java.util.List;
import java.util.function.Function;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/**
 * 자치구 개업·폐업 점포 조회. 순위 기준 값은 점포 수 합계이고, 변화율은 개업률·폐업률 <b>평균</b>의 전분기 대비 증감률이다
 * (Top10 과 전체 순위가 같은 정의를 쓴다).
 */
@Repository
@RequiredArgsConstructor
public class StoreDistrictCustomRepositoryImpl implements StoreDistrictCustomRepository {

    private static final int TOP_TEN_LIMIT = 10;
    private static final int TOP_EIGHT_LIMIT = 8;

    private final JPAQueryFactory queryFactory;
    private final DatasetSpatialVersion datasetSpatialVersion;

    @Override
    public List<StoreDistrictOpenedTopTenProjection> findTopTenByOpenedStore(String currentPeriodCode, String previousPeriodCode) {
        NumberExpression<Long> currentOpenedSum = storeDistrictEntity.openedStoreCount.sumLong();

        // 이전 분기 행이 없으면 AVG 가 NULL 이고, 평균이 0 이면 0 으로 나누게 된다. Top10 은 두 경우 모두 변화율을 0 으로 본다
        // (가드 이유는 DistrictChangeRateExpressions 참고).
        NumberExpression<Double> openingChangeRate = DistrictChangeRateExpressions.zeroWhenMissing(
            storeDistrictEntity.openingRate.avg(), previousRateAvg(previousPeriodCode, store -> store.openingRate));

        return selectStoreByDistrict(StoreDistrictOpenedTopTenProjection.class, currentPeriodCode, currentOpenedSum, openingChangeRate)
            .orderBy(currentOpenedSum.desc())
            .limit(TOP_TEN_LIMIT)
            .fetch();
    }

    @Override
    public List<StoreDistrictClosedTopTenProjection> findTopTenByClosedStore(String currentPeriodCode, String previousPeriodCode) {
        NumberExpression<Long> currentClosedSum = storeDistrictEntity.closedStoreCount.sumLong();

        // 가드 이유는 findTopTenByOpenedStore 주석 참고.
        NumberExpression<Double> closureChangeRate = DistrictChangeRateExpressions.zeroWhenMissing(
            storeDistrictEntity.closureRate.avg(), previousRateAvg(previousPeriodCode, store -> store.closureRate));

        return selectStoreByDistrict(StoreDistrictClosedTopTenProjection.class, currentPeriodCode, currentClosedSum, closureChangeRate)
            .orderBy(currentClosedSum.desc())
            .limit(TOP_TEN_LIMIT)
            .fetch();
    }

    @Override
    public List<StoreDistrictOpenedRankingProjection> findRankingsByOpenedStore(String currentPeriodCode, String previousPeriodCode) {
        NumberExpression<Long> currentOpenedSum = storeDistrictEntity.openedStoreCount.sumLong();

        // 이전 평균은 상관 서브쿼리라 이전 분기 행이 없는 자치구도 빠지지 않는다(이슈 #433). 그 경우와 평균이 0 인 경우 변화율은 NULL 이다.
        NumberExpression<Double> openingChangeRate = DistrictChangeRateExpressions.nullWhenMissing(
            storeDistrictEntity.openingRate.avg(), previousRateAvg(previousPeriodCode, store -> store.openingRate));

        return selectStoreByDistrict(StoreDistrictOpenedRankingProjection.class, currentPeriodCode, currentOpenedSum, openingChangeRate)
            .orderBy(currentOpenedSum.desc(), storeDistrictEntity.districtCode.asc())
            .fetch();
    }

    @Override
    public List<StoreDistrictClosedRankingProjection> findRankingsByClosedStore(String currentPeriodCode, String previousPeriodCode) {
        NumberExpression<Long> currentClosedSum = storeDistrictEntity.closedStoreCount.sumLong();

        // NULL 처리 이유는 findRankingsByOpenedStore 주석 참고.
        NumberExpression<Double> closureChangeRate = DistrictChangeRateExpressions.nullWhenMissing(
            storeDistrictEntity.closureRate.avg(), previousRateAvg(previousPeriodCode, store -> store.closureRate));

        return selectStoreByDistrict(StoreDistrictClosedRankingProjection.class, currentPeriodCode, currentClosedSum, closureChangeRate)
            .orderBy(currentClosedSum.desc(), storeDistrictEntity.districtCode.asc())
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

    /** Top10 과 전체 순위가 함께 쓰는 자치구별 점포 수 합계 조회. 정렬과 limit 는 호출하는 쪽이 정한다. */
    private <P> JPAQuery<P> selectStoreByDistrict(
        Class<P> projectionType, String currentPeriodCode, NumberExpression<Long> storeCountSum, NumberExpression<Double> changeRate
    ) {
        QStoreDistrictEntity current = storeDistrictEntity;

        return queryFactory
            .select(
                Projections.constructor(
                    projectionType,
                    current.districtCode,
                    current.districtName,
                    storeCountSum,
                    changeRate
                )
            )
            .from(current)
            .where(
                current.periodCode.eq(currentPeriodCode),
                current.spatialVersion.eq(datasetSpatialVersion.value())
            )
            .groupBy(current.districtCode, current.districtName);
    }

    /** 같은 자치구의 이전 분기 개업률·폐업률 평균 상관 서브쿼리. 이전 분기 행이 없으면 NULL 이다. */
    private NumberExpression<Double> previousRateAvg(String previousPeriodCode, Function<QStoreDistrictEntity, NumberPath<Double>> rate) {
        QStoreDistrictEntity current = storeDistrictEntity;
        QStoreDistrictEntity previous = new QStoreDistrictEntity("previous");

        return Expressions.asNumber(
            JPAExpressions
                .select(rate.apply(previous).avg())
                .from(previous)
                .where(
                    previous.districtCode.eq(current.districtCode),
                    previous.periodCode.eq(previousPeriodCode),
                    previous.spatialVersion.eq(datasetSpatialVersion.value())
                )
        );
    }
}
