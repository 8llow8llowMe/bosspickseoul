package com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.repository.custom;

import static com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.entity.QSalesDistrictEntity.salesDistrictEntity;

import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.entity.QSalesDistrictEntity;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.projection.SalesDistrictServiceTopFiveProjection;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.projection.SalesDistrictTopTenProjection;
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
public class SalesDistrictCustomRepositoryImpl implements SalesDistrictCustomRepository {

    private static final int TOP_TEN_LIMIT = 10;
    private static final int TOP_FIVE_LIMIT = 5;
    private static final double PERCENT_MULTIPLIER = 100.0;

    private final JPAQueryFactory queryFactory;
    private final DatasetSpatialVersion datasetSpatialVersion;

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
                    previous.periodCode.eq(previousPeriodCode),
                    previous.spatialVersion.eq(datasetSpatialVersion.value())
                )
        );

        // 매출 변화율: (현재 합계 - 이전 합계) / 이전 합계 * 100
        // 이전 분기 행이 없으면 SUM 이 NULL 이고, 합계가 0 이면 0 으로 나누게 된다. 두 경우 모두
        // 변화율을 0 으로 본다. 가드가 없으면 DB 마다 결과가 갈린다 — MySQL 은 NULL 을 돌려주지만
        // H2 는 Division by zero 로 예외를 던져 슬라이스 테스트가 깨진다.
        // 행정동 쪽(SalesAdministrationRepositoryAdapter)이 쓰는 것과 같은 형태다.
        NumberExpression<Double> safePreviousSalesSum = previousSalesSum.doubleValue().coalesce(0.0);
        NumberExpression<Double> salesChangeRate = new CaseBuilder()
            .when(safePreviousSalesSum.eq(0.0)).then(0.0)
            .otherwise(
                currentSalesSum.doubleValue()
                    .subtract(safePreviousSalesSum)
                    .divide(safePreviousSalesSum)
                    .multiply(PERCENT_MULTIPLIER)
            );

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
            .where(
                current.periodCode.eq(currentPeriodCode),
                current.spatialVersion.eq(datasetSpatialVersion.value())
            )
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
                    previous.spatialVersion.eq(datasetSpatialVersion.value()),
                    previous.serviceType.isNotNull(),
                    previous.serviceCode.eq(current.serviceCode)
                )
        );

        // 매출 변화율: (현재 - 이전) / 이전 * 100. 가드 이유는 findTopTenBySales 주석 참고.
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
}
