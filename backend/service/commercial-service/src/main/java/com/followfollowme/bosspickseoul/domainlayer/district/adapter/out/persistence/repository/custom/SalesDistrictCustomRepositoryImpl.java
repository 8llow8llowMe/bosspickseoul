package com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.repository.custom;

import static com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.entity.QSalesDistrictEntity.salesDistrictEntity;

import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.entity.QSalesDistrictEntity;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.projection.SalesDistrictRankingProjection;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.projection.SalesDistrictServiceTopFiveProjection;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.projection.SalesDistrictTopTenProjection;
import com.querydsl.core.types.Projections;
import com.querydsl.core.types.dsl.CaseBuilder;
import com.querydsl.core.types.dsl.Expressions;
import com.querydsl.core.types.dsl.NumberExpression;
import com.querydsl.jpa.JPAExpressions;
import com.followfollowme.bosspickseoul.global.properties.DatasetSpatialVersion;
import com.querydsl.jpa.impl.JPAQuery;
import com.querydsl.jpa.impl.JPAQueryFactory;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class SalesDistrictCustomRepositoryImpl implements SalesDistrictCustomRepository {

    private static final int TOP_TEN_LIMIT = 10;
    private static final int TOP_FIVE_LIMIT = 5;
    private static final double PERCENT_MULTIPLIER = 100.0;

    private final JPAQueryFactory queryFactory;
    private final DatasetSpatialVersion datasetSpatialVersion;

    @Override
    public List<SalesDistrictTopTenProjection> findTopTenBySales(String currentPeriodCode, String previousPeriodCode) {
        // 매출 변화율: (현재 합계 - 이전 합계) / 이전 합계 * 100
        // 이전 분기 행이 없으면 SUM 이 NULL 이고, 합계가 0 이면 0 으로 나누게 된다. Top10 은 두 경우 모두 변화율을 0 으로 본다
        // (가드 이유는 DistrictChangeRateExpressions 참고). 동점은 자치구 코드 오름차순이다(FootTrafficDistrictCustomRepositoryImpl 참고).
        NumberExpression<Double> salesChangeRate = DistrictChangeRateExpressions.zeroWhenMissing(
            currentSalesSum().doubleValue(), previousSalesSum(previousPeriodCode).doubleValue());

        return selectSalesByDistrict(SalesDistrictTopTenProjection.class, currentPeriodCode, salesChangeRate)
            .orderBy(currentSalesSum().desc(), salesDistrictEntity.districtCode.asc())
            .limit(TOP_TEN_LIMIT)
            .fetch();
    }

    @Override
    public List<SalesDistrictRankingProjection> findRankingsBySales(String currentPeriodCode, String previousPeriodCode) {
        // 이전 합계는 상관 서브쿼리라 이전 분기 행이 없는 자치구도 빠지지 않는다(이슈 #433). 그 경우와 합계가 0 인 경우 변화율은 NULL 이다.
        NumberExpression<Double> salesChangeRate = DistrictChangeRateExpressions.nullWhenMissing(
            currentSalesSum().doubleValue(), previousSalesSum(previousPeriodCode).doubleValue());

        return selectSalesByDistrict(SalesDistrictRankingProjection.class, currentPeriodCode, salesChangeRate)
            .orderBy(currentSalesSum().desc(), salesDistrictEntity.districtCode.asc())
            .fetch();
    }

    @Override
    public List<SalesDistrictServiceTopFiveProjection> findTopFiveServiceBySales(
        String districtCode, String currentPeriodCode, String previousPeriodCode
    ) {
        QSalesDistrictEntity current = salesDistrictEntity;
        QSalesDistrictEntity previous = new QSalesDistrictEntity("previous");

        // 이전 분기 매출 서브쿼리
        NumberExpression<Long> previousSales = Expressions.asNumber(
            JPAExpressions
                .select(previous.monthlySalesAmount)
                .from(previous)
                .where(
                    previous.districtCode.eq(districtCode),
                    previous.periodCode.eq(previousPeriodCode),
                    previous.spatialVersion.eq(datasetSpatialVersion.value()),
                    previous.serviceType.isNotNull(),
                    previous.serviceCode.eq(current.serviceCode)
                )
        );

        // 매출 변화율: (현재 - 이전) / 이전 * 100. 가드 이유는 DistrictChangeRateExpressions 주석 참고.
        NumberExpression<Double> safePreviousSales = previousSales.doubleValue().coalesce(0.0);
        NumberExpression<Double> salesChangeRate = new CaseBuilder()
            .when(safePreviousSales.eq(0.0)).then(0.0)
            .otherwise(
                current.monthlySalesAmount.doubleValue()
                    .subtract(safePreviousSales)
                    .divide(safePreviousSales)
                    .multiply(PERCENT_MULTIPLIER)
            );

        return queryFactory
            .select(
                Projections.constructor(
                    SalesDistrictServiceTopFiveProjection.class,
                    current.serviceCode,
                    current.serviceName,
                    salesChangeRate
                )
            )
            .from(current)
            .where(
                current.districtCode.eq(districtCode),
                current.periodCode.eq(currentPeriodCode),
                current.spatialVersion.eq(datasetSpatialVersion.value()),
                current.serviceType.isNotNull()
            )
            .orderBy(current.monthlySalesAmount.desc())
            .limit(TOP_FIVE_LIMIT)
            .fetch();
    }

    /** Top10 과 전체 순위가 함께 쓰는 자치구별 매출 합계 조회. 정렬과 limit 는 호출하는 쪽이 정한다. */
    private <P> JPAQuery<P> selectSalesByDistrict(Class<P> projectionType, String currentPeriodCode, NumberExpression<Double> salesChangeRate) {
        QSalesDistrictEntity current = salesDistrictEntity;

        return queryFactory
            .select(
                Projections.constructor(
                    projectionType,
                    current.districtCode,
                    current.districtName,
                    currentSalesSum(),
                    salesChangeRate
                )
            )
            .from(current)
            .where(
                current.periodCode.eq(currentPeriodCode),
                current.spatialVersion.eq(datasetSpatialVersion.value())
            )
            .groupBy(current.districtCode, current.districtName);
    }

    /** 현재 분기 매출 합계 */
    private NumberExpression<Long> currentSalesSum() {
        return salesDistrictEntity.monthlySalesAmount.sumLong();
    }

    /** 같은 자치구의 이전 분기 매출 합계 상관 서브쿼리. 이전 분기 행이 없으면 NULL 이다. */
    private NumberExpression<Long> previousSalesSum(String previousPeriodCode) {
        QSalesDistrictEntity current = salesDistrictEntity;
        QSalesDistrictEntity previous = new QSalesDistrictEntity("previous");

        return Expressions.asNumber(
            JPAExpressions
                .select(previous.monthlySalesAmount.sumLong())
                .from(previous)
                .where(
                    previous.districtCode.eq(current.districtCode),
                    previous.periodCode.eq(previousPeriodCode),
                    previous.spatialVersion.eq(datasetSpatialVersion.value())
                )
        );
    }
}
