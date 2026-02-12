package com.followfollowme.nowdoboss.domainlayer.district.adapter.out.persistence.repository.custom;

import static com.followfollowme.nowdoboss.domainlayer.district.adapter.out.persistence.entity.QStoreDistrictEntity.storeDistrictEntity;

import com.followfollowme.nowdoboss.domainlayer.district.adapter.out.persistence.entity.QStoreDistrictEntity;
import com.followfollowme.nowdoboss.domainlayer.district.adapter.out.persistence.projection.StoreDistrictClosedTopTenProjection;
import com.followfollowme.nowdoboss.domainlayer.district.adapter.out.persistence.projection.StoreDistrictOpenedTopTenProjection;
import com.querydsl.core.types.Projections;
import com.querydsl.core.types.dsl.Expressions;
import com.querydsl.core.types.dsl.NumberExpression;
import com.querydsl.jpa.JPAExpressions;
import com.querydsl.jpa.impl.JPAQueryFactory;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class StoreDistrictCustomRepositoryImpl implements StoreDistrictCustomRepository {

    private static final int TOP_TEN_LIMIT = 10;
    private static final double PERCENT_MULTIPLIER = 100.0;

    private final JPAQueryFactory queryFactory;

    @Override
    public List<StoreDistrictOpenedTopTenProjection> findTopTenByOpenedStore(String currentPeriodCode, String previousPeriodCode) {
        QStoreDistrictEntity current = storeDistrictEntity;
        QStoreDistrictEntity previous = new QStoreDistrictEntity("previous");

        // 현재 분기 개업 점포 수 합계
        NumberExpression<Long> currentOpenedSum = current.openedStoreCount.sumLong();

        // 현재 분기 개업률 평균
        NumberExpression<Double> currentOpeningRateAvg = current.openingRate.avg();

        // 이전 분기 개업률 평균 서브쿼리 (Expressions.asNumber로 NumberExpression 변환)
        NumberExpression<Double> previousOpeningRateAvg = Expressions.asNumber(
            JPAExpressions
                .select(previous.openingRate.avg())
                .from(previous)
                .where(
                    previous.districtCode.eq(current.districtCode),
                    previous.periodCode.eq(previousPeriodCode)
                )
        );

        // 개업률 변화율: (현재 평균 - 이전 평균) / 이전 평균 * 100
        NumberExpression<Double> openingChangeRate = currentOpeningRateAvg
            .subtract(previousOpeningRateAvg)
            .divide(previousOpeningRateAvg)
            .multiply(PERCENT_MULTIPLIER);

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
            .where(current.periodCode.eq(currentPeriodCode))
            .groupBy(current.districtCode, current.districtName)
            .orderBy(currentOpenedSum.desc())
            .limit(TOP_TEN_LIMIT)
            .fetch();
    }

    @Override
    public List<StoreDistrictClosedTopTenProjection> findTopTenByClosedStore(String currentPeriodCode, String previousPeriodCode) {
        QStoreDistrictEntity current = storeDistrictEntity;
        QStoreDistrictEntity previous = new QStoreDistrictEntity("previous");

        // 현재 분기 폐업 점포 수 합계
        NumberExpression<Long> currentClosedSum = current.closedStoreCount.sumLong();

        // 현재 분기 폐업률 평균
        NumberExpression<Double> currentClosureRateAvg = current.closureRate.avg();

        // 이전 분기 폐업률 평균 서브쿼리
        NumberExpression<Double> previousClosureRateAvg = Expressions.asNumber(
            JPAExpressions
                .select(previous.closureRate.avg())
                .from(previous)
                .where(
                    previous.districtCode.eq(current.districtCode),
                    previous.periodCode.eq(previousPeriodCode)
                )
        );

        // 폐업률 변화율: (현재 평균 - 이전 평균) / 이전 평균 * 100
        NumberExpression<Double> closureChangeRate = currentClosureRateAvg
            .subtract(previousClosureRateAvg)
            .divide(previousClosureRateAvg)
            .multiply(PERCENT_MULTIPLIER);

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
            .where(current.periodCode.eq(currentPeriodCode))
            .groupBy(current.districtCode, current.districtName)
            .orderBy(currentClosedSum.desc())
            .limit(TOP_TEN_LIMIT)
            .fetch();
    }
}
