package com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.repository.custom;

import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.entity.QFootTrafficDistrictEntity;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.projection.DistrictAreaProjection;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.projection.FootTrafficDistrictTopTenProjection;
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
            .where(footTraffic.periodCode.eq(periodCode))
            .groupBy(footTraffic.districtCode, footTraffic.districtName)
            .orderBy(footTraffic.districtName.asc())
            .fetch();
    }
}
