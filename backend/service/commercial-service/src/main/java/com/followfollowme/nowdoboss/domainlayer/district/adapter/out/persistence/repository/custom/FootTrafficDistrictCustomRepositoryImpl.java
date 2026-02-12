package com.followfollowme.nowdoboss.domainlayer.district.adapter.out.persistence.repository.custom;

import com.followfollowme.nowdoboss.domainlayer.district.adapter.out.persistence.entity.QFootTrafficDistrictEntity;
import com.followfollowme.nowdoboss.domainlayer.district.adapter.out.persistence.projection.FootTrafficDistrictTopTenProjection;
import com.querydsl.core.types.Projections;
import com.querydsl.jpa.impl.JPAQueryFactory;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class FootTrafficDistrictCustomRepositoryImpl implements FootTrafficDistrictCustomRepository {

    private static final int TOP_TEN_LIMIT = 10;

    private final JPAQueryFactory queryFactory;

    @Override
    public List<FootTrafficDistrictTopTenProjection> findTopTenByFootTraffic(String currentPeriodCode, String previousPeriodCode) {
        QFootTrafficDistrictEntity current = QFootTrafficDistrictEntity.footTrafficDistrictEntity;
        QFootTrafficDistrictEntity previous = new QFootTrafficDistrictEntity("previous");

        return queryFactory
            .select(
                Projections.constructor(
                    FootTrafficDistrictTopTenProjection.class,
                    current.districtCode,
                    current.districtName,
                    current.totalFootTraffic,
                    // 변화율 계산: (현재 - 이전) / 이전 * 100
                    current.totalFootTraffic.doubleValue()
                        .subtract(previous.totalFootTraffic.doubleValue())
                        .divide(previous.totalFootTraffic)
                        .multiply(100.0)
                )
            )
            .from(current)
            .join(previous)
            .on(current.districtCode.eq(previous.districtCode))
            .where(
                current.periodCode.eq(currentPeriodCode),
                previous.periodCode.eq(previousPeriodCode)
            )
            .orderBy(current.totalFootTraffic.desc())
            .limit(TOP_TEN_LIMIT)
            .fetch();
    }
}
