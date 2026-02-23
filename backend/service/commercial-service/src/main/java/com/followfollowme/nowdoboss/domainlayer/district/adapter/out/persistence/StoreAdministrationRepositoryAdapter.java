package com.followfollowme.nowdoboss.domainlayer.district.adapter.out.persistence;

import static com.followfollowme.nowdoboss.domainlayer.administration.adapter.out.persistence.entity.QStoreAdministrationEntity.storeAdministrationEntity;

import com.followfollowme.nowdoboss.domainlayer.administration.adapter.out.persistence.entity.QStoreAdministrationEntity;
import com.followfollowme.nowdoboss.domainlayer.district.application.port.out.StoreAdministrationRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.district.application.port.out.query.StoreAdministrationClosedTopFiveQueryResult;
import com.followfollowme.nowdoboss.domainlayer.district.application.port.out.query.StoreAdministrationOpenedTopFiveQueryResult;
import com.querydsl.core.types.dsl.CaseBuilder;
import com.querydsl.core.types.dsl.NumberExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class StoreAdministrationRepositoryAdapter implements StoreAdministrationRepositoryPort {

    private static final int TOP_FIVE_LIMIT = 5;
    private static final double PERCENT_MULTIPLIER = 100.0;

    private final JPAQueryFactory queryFactory;

    @Override
    public List<StoreAdministrationOpenedTopFiveQueryResult> findTopFiveOpenedAdministrationsByDistrictCode(
        String districtCode,
        String periodCode
    ) {
        QStoreAdministrationEntity current = storeAdministrationEntity;

        NumberExpression<Long> openedStoreCount = current.openedStoreCount.sumLong();
        NumberExpression<Long> totalStoreCount = current.totalStoreCount.sumLong();
        NumberExpression<Double> openingRate = new CaseBuilder()
            .when(totalStoreCount.eq(0L)).then(0.0)
            .otherwise(
                openedStoreCount.doubleValue()
                    .divide(totalStoreCount.doubleValue())
                    .multiply(PERCENT_MULTIPLIER)
            );

        return queryFactory
            .select(
                current.administrationCode,
                current.administrationName,
                openedStoreCount,
                openingRate
            )
            .from(current)
            .where(
                current.periodCode.eq(periodCode),
                current.administrationCode.startsWith(districtCode)
            )
            .groupBy(current.administrationCode, current.administrationName)
            .orderBy(openingRate.desc(), openedStoreCount.desc())
            .limit(TOP_FIVE_LIMIT)
            .fetch()
            .stream()
            .map(tuple -> StoreAdministrationOpenedTopFiveQueryResult.builder()
                .administrationCode(tuple.get(current.administrationCode))
                .administrationName(tuple.get(current.administrationName))
                .openedStoreCount(tuple.get(openedStoreCount))
                .openingRate(tuple.get(openingRate))
                .build())
            .toList();
    }

    @Override
    public List<StoreAdministrationClosedTopFiveQueryResult> findTopFiveClosedAdministrationsByDistrictCode(
        String districtCode,
        String periodCode
    ) {
        QStoreAdministrationEntity current = storeAdministrationEntity;

        NumberExpression<Long> closedStoreCount = current.closedStoreCount.sumLong();
        NumberExpression<Long> totalStoreCount = current.totalStoreCount.sumLong();
        NumberExpression<Double> closureRate = new CaseBuilder()
            .when(totalStoreCount.eq(0L)).then(0.0)
            .otherwise(
                closedStoreCount.doubleValue()
                    .divide(totalStoreCount.doubleValue())
                    .multiply(PERCENT_MULTIPLIER)
            );

        return queryFactory
            .select(
                current.administrationCode,
                current.administrationName,
                closedStoreCount,
                closureRate
            )
            .from(current)
            .where(
                current.periodCode.eq(periodCode),
                current.administrationCode.startsWith(districtCode)
            )
            .groupBy(current.administrationCode, current.administrationName)
            .orderBy(closureRate.desc(), closedStoreCount.desc())
            .limit(TOP_FIVE_LIMIT)
            .fetch()
            .stream()
            .map(tuple -> StoreAdministrationClosedTopFiveQueryResult.builder()
                .administrationCode(tuple.get(current.administrationCode))
                .administrationName(tuple.get(current.administrationName))
                .closedStoreCount(tuple.get(closedStoreCount))
                .closureRate(tuple.get(closureRate))
                .build())
            .toList();
    }
}
