package com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence;

import static com.followfollowme.bosspickseoul.domainlayer.administration.adapter.out.persistence.entity.QSalesAdministrationEntity.salesAdministrationEntity;

import com.followfollowme.bosspickseoul.domainlayer.administration.adapter.out.persistence.entity.QSalesAdministrationEntity;
import com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.SalesAdministrationRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.query.SalesAdministrationTopFiveQueryResult;
import com.querydsl.core.types.dsl.CaseBuilder;
import com.querydsl.core.types.dsl.Expressions;
import com.querydsl.core.types.dsl.NumberExpression;
import com.querydsl.jpa.JPAExpressions;
import com.querydsl.jpa.impl.JPAQueryFactory;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SalesAdministrationRepositoryAdapter implements SalesAdministrationRepositoryPort {

    private static final int TOP_FIVE_LIMIT = 5;
    private static final double PERCENT_MULTIPLIER = 100.0;

    private final JPAQueryFactory queryFactory;

    @Override
    public List<SalesAdministrationTopFiveQueryResult> findTopFiveByDistrictCode(
        String districtCode,
        String currentPeriodCode,
        String previousPeriodCode
    ) {
        QSalesAdministrationEntity current = salesAdministrationEntity;
        QSalesAdministrationEntity previous = new QSalesAdministrationEntity("previous");

        NumberExpression<Long> currentSalesAmount = current.monthlySalesAmount.sumLong();
        NumberExpression<Long> previousSalesAmount = Expressions.asNumber(
            JPAExpressions
                .select(previous.monthlySalesAmount.sumLong())
                .from(previous)
                .where(
                    previous.administrationCode.eq(current.administrationCode),
                    previous.periodCode.eq(previousPeriodCode)
                )
        );

        NumberExpression<Double> safePreviousSalesAmount = previousSalesAmount.doubleValue().coalesce(0.0);
        NumberExpression<Double> salesChangeRate = new CaseBuilder()
            .when(safePreviousSalesAmount.eq(0.0)).then(0.0)
            .otherwise(
                currentSalesAmount.doubleValue()
                    .subtract(safePreviousSalesAmount)
                    .divide(safePreviousSalesAmount)
                    .multiply(PERCENT_MULTIPLIER)
            );

        return queryFactory
            .select(
                current.administrationCode,
                current.administrationName,
                currentSalesAmount,
                salesChangeRate
            )
            .from(current)
            .where(
                current.periodCode.eq(currentPeriodCode),
                current.administrationCode.startsWith(districtCode)
            )
            .groupBy(current.administrationCode, current.administrationName)
            .orderBy(currentSalesAmount.desc())
            .limit(TOP_FIVE_LIMIT)
            .fetch()
            .stream()
            .map(tuple -> SalesAdministrationTopFiveQueryResult.builder()
                .administrationCode(tuple.get(current.administrationCode))
                .administrationName(tuple.get(current.administrationName))
                .totalSalesAmount(tuple.get(currentSalesAmount))
                .salesChangeRate(tuple.get(salesChangeRate))
                .build())
            .toList();
    }
}
