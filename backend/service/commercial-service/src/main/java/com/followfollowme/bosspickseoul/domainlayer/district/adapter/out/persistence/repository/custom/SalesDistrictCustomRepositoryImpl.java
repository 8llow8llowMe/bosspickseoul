package com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.repository.custom;

import static com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.entity.QSalesDistrictEntity.salesDistrictEntity;

import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.entity.QSalesDistrictEntity;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.projection.SalesDistrictServiceTopFiveProjection;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.projection.SalesDistrictTopTenProjection;
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
public class SalesDistrictCustomRepositoryImpl implements SalesDistrictCustomRepository {

    private static final int TOP_TEN_LIMIT = 10;
    private static final int TOP_FIVE_LIMIT = 5;
    private static final double PERCENT_MULTIPLIER = 100.0;

    private final JPAQueryFactory queryFactory;

    @Override
    public List<SalesDistrictTopTenProjection> findTopTenBySales(String currentPeriodCode, String previousPeriodCode) {
        QSalesDistrictEntity current = salesDistrictEntity;
        QSalesDistrictEntity previous = new QSalesDistrictEntity("previous");

        // 현재 분기 매출 합계
        NumberExpression<Long> currentSalesSum = current.monthlySalesAmount.sumLong();

        // 이전 분기 매출 합계 서브쿼리
        NumberExpression<Long> previousSalesSum = Expressions.asNumber(
            JPAExpressions
                .select(previous.monthlySalesAmount.sumLong())
                .from(previous)
                .where(
                    previous.districtCode.eq(current.districtCode),
                    previous.periodCode.eq(previousPeriodCode)
                )
        );

        // 매출 변화율: (현재 합계 - 이전 합계) / 이전 합계 * 100
        NumberExpression<Double> salesChangeRate = currentSalesSum.doubleValue()
            .subtract(previousSalesSum.doubleValue())
            .divide(previousSalesSum)
            .multiply(PERCENT_MULTIPLIER);

        return queryFactory
            .select(
                Projections.constructor(
                    SalesDistrictTopTenProjection.class,
                    current.districtCode,
                    current.districtName,
                    currentSalesSum,
                    salesChangeRate
                )
            )
            .from(current)
            .where(current.periodCode.eq(currentPeriodCode))
            .groupBy(current.districtCode, current.districtName)
            .orderBy(currentSalesSum.desc())
            .limit(TOP_TEN_LIMIT)
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
                    previous.serviceType.isNotNull(),
                    previous.serviceCode.eq(current.serviceCode)
                )
        );

        // 매출 변화율: (현재 - 이전) / 이전 * 100
        NumberExpression<Double> salesChangeRate = current.monthlySalesAmount.doubleValue()
            .subtract(previousSales.doubleValue())
            .divide(previousSales)
            .multiply(PERCENT_MULTIPLIER);

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
                current.serviceType.isNotNull()
            )
            .orderBy(current.monthlySalesAmount.desc())
            .limit(TOP_FIVE_LIMIT)
            .fetch();
    }
}
