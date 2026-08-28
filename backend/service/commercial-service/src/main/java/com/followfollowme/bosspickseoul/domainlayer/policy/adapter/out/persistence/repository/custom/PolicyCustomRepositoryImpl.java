package com.followfollowme.bosspickseoul.domainlayer.policy.adapter.out.persistence.repository.custom;

import static com.followfollowme.bosspickseoul.domainlayer.policy.adapter.out.persistence.entity.QPolicyEntity.policyEntity;

import com.followfollowme.bosspickseoul.domainlayer.policy.adapter.out.persistence.entity.PolicyEntity;
import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.types.dsl.CaseBuilder;
import com.querydsl.core.types.dsl.NumberExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import java.time.LocalDate;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class PolicyCustomRepositoryImpl implements PolicyCustomRepository {

    private final JPAQueryFactory queryFactory;

    @Override
    public List<PolicyEntity> findRecommendations(
        String districtCode, String serviceCategoryCode, LocalDate baseDate, int limit
    ) {
        BooleanBuilder where = new BooleanBuilder();

        // 신청 기간. 시작일/마감일이 없는 정책은 상시 모집이라 기간 조건을 통과시킨다.
        where.and(policyEntity.applyStartAt.isNull().or(policyEntity.applyStartAt.loe(baseDate)));
        where.and(policyEntity.applyEndAt.isNull().or(policyEntity.applyEndAt.goe(baseDate)));

        // 범위 포함 매칭. 자치구를 지정하면 그 자치구 전용 정책과 지역 제한이 없는(NULL) 정책이 함께 나온다.
        // 조건을 지정하지 않으면 아무것도 붙이지 않는다 - JPQL 의 (:param IS NULL OR ...) 자리다.
        if (districtCode != null) {
            where.and(policyEntity.districtCode.isNull().or(policyEntity.districtCode.eq(districtCode)));
        }
        if (serviceCategoryCode != null) {
            where.and(policyEntity.serviceCategoryCode.isNull()
                .or(policyEntity.serviceCategoryCode.eq(serviceCategoryCode)));
        }

        return queryFactory
            .selectFrom(policyEntity)
            .where(where)
            .orderBy(
                districtSpecificFirst().asc(),
                deadlineBeforeAlwaysOpen().asc(),
                policyEntity.applyEndAt.asc(),
                policyEntity.id.desc()
            )
            .limit(limit)
            .fetch();
    }

    /** 자치구 전용 정책을 앞에 둔다. 구체적인 정책이 사용자에게 더 유용하다. */
    private NumberExpression<Integer> districtSpecificFirst() {
        return new CaseBuilder()
            .when(policyEntity.districtCode.isNotNull()).then(0)
            .otherwise(1);
    }

    /** 기한이 있는 정책을 앞에 둔다. 상시 모집은 급하지 않다. */
    private NumberExpression<Integer> deadlineBeforeAlwaysOpen() {
        return new CaseBuilder()
            .when(policyEntity.applyEndAt.isNull()).then(1)
            .otherwise(0);
    }
}
