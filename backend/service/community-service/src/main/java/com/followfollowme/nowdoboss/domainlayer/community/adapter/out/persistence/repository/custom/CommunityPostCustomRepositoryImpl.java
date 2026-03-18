package com.followfollowme.nowdoboss.domainlayer.community.adapter.out.persistence.repository.custom;

import static com.followfollowme.nowdoboss.domainlayer.community.adapter.out.persistence.entity.QCommunityPostEntity.communityPostEntity;
import static com.followfollowme.nowdoboss.domainlayer.community.adapter.out.persistence.entity.QCommunityPostLikeEntity.communityPostLikeEntity;

import com.followfollowme.nowdoboss.domainlayer.community.adapter.out.persistence.entity.CommunityPostEntity;
import com.followfollowme.nowdoboss.domainlayer.community.domain.enums.CommunityPostStatus;
import com.followfollowme.nowdoboss.domainlayer.community.domain.enums.CommunitySortType;
import com.followfollowme.nowdoboss.domainlayer.community.domain.enums.CommunityTargetType;
import com.followfollowme.nowdoboss.persistence.enums.OrderType;
import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.types.OrderSpecifier;
import com.querydsl.jpa.JPAExpressions;
import com.querydsl.jpa.impl.JPAQueryFactory;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.SliceImpl;

@RequiredArgsConstructor
public class CommunityPostCustomRepositoryImpl implements CommunityPostCustomRepository {

    private final JPAQueryFactory queryFactory;

    @Override
    public Slice<CommunityPostEntity> findBoardPostsNoOffset(
        CommunityTargetType targetType,
        String targetCode,
        CommunityPostStatus status,
        CommunitySortType sortType,
        OrderType orderType,
        long lastPostId,
        Long lastLikeCount,
        int size,
        LocalDateTime popularSince
    ) {
        // 1. 기본 조건 구성
        BooleanBuilder where = new BooleanBuilder();
        where.and(communityPostEntity.targetType.eq(targetType));
        where.and(communityPostEntity.targetCode.eq(targetCode));
        where.and(communityPostEntity.status.eq(status));

        // 2. 정렬 및 커서 조건 적용
        if (sortType == CommunitySortType.POPULAR) {
            where.and(communityPostEntity.createdAt.goe(popularSince));
            applyPopularCursor(where, lastPostId, lastLikeCount);
        } else {
            applyLatestCursor(where, lastPostId, orderType);
        }

        // 3. limit + 1 조회 후 Slice 변환
        return executeSliceQuery(where, buildOrderSpecifiers(sortType, orderType), size);
    }

    @Override
    public Slice<CommunityPostEntity> findFeedPostsNoOffset(
        CommunityPostStatus status,
        CommunitySortType sortType,
        OrderType orderType,
        CommunityTargetType targetType,
        String targetCode,
        long lastPostId,
        Long lastLikeCount,
        int size,
        LocalDateTime popularSince
    ) {
        // 1. 기본 조건 구성
        BooleanBuilder where = new BooleanBuilder();
        where.and(communityPostEntity.status.eq(status));

        // 2. 대상 타입/코드 필터 (선택적)
        if (targetType != null) {
            where.and(communityPostEntity.targetType.eq(targetType));
        }
        if (targetCode != null && !targetCode.isBlank()) {
            where.and(communityPostEntity.targetCode.eq(targetCode));
        }

        // 3. 정렬 및 커서 조건 적용
        if (sortType == CommunitySortType.POPULAR) {
            where.and(communityPostEntity.createdAt.goe(popularSince));
            applyPopularCursor(where, lastPostId, lastLikeCount);
        } else {
            applyLatestCursor(where, lastPostId, orderType);
        }

        // 4. limit + 1 조회 후 Slice 변환
        return executeSliceQuery(where, buildOrderSpecifiers(sortType, orderType), size);
    }

    @Override
    public Slice<CommunityPostEntity> findLikedPostsNoOffset(
        long memberId,
        CommunityPostStatus status,
        CommunitySortType sortType,
        OrderType orderType,
        long lastPostId,
        Long lastLikeCount,
        int size,
        LocalDateTime popularSince
    ) {
        // 1. 좋아요한 게시글만 필터 (서브쿼리)
        BooleanBuilder where = new BooleanBuilder();
        where.and(communityPostEntity.id.in(
            JPAExpressions.select(communityPostLikeEntity.postId)
                .from(communityPostLikeEntity)
                .where(communityPostLikeEntity.memberId.eq(memberId))
        ));
        where.and(communityPostEntity.status.eq(status));

        // 2. 정렬 및 커서 조건 적용
        if (sortType == CommunitySortType.POPULAR) {
            where.and(communityPostEntity.createdAt.goe(popularSince));
            applyPopularCursor(where, lastPostId, lastLikeCount);
        } else {
            applyLatestCursor(where, lastPostId, orderType);
        }

        // 3. limit + 1 조회 후 Slice 변환
        return executeSliceQuery(where, buildOrderSpecifiers(sortType, orderType), size);
    }

    private void applyLatestCursor(BooleanBuilder where, long lastPostId, OrderType orderType) {
        if (lastPostId > 0) {
            if (orderType == OrderType.ASC) {
                where.and(communityPostEntity.id.gt(lastPostId));
            } else {
                where.and(communityPostEntity.id.lt(lastPostId));
            }
        }
    }

    private void applyPopularCursor(BooleanBuilder where, long lastPostId, Long lastLikeCount) {
        if (lastPostId > 0 && lastLikeCount != null) {
            where.and(
                communityPostEntity.likeCount.lt(lastLikeCount)
                    .or(communityPostEntity.likeCount.eq(lastLikeCount)
                        .and(communityPostEntity.id.lt(lastPostId)))
            );
        }
    }

    private OrderSpecifier<?>[] buildOrderSpecifiers(CommunitySortType sortType, OrderType orderType) {
        if (sortType == CommunitySortType.POPULAR) {
            return new OrderSpecifier[]{
                communityPostEntity.likeCount.desc(),
                communityPostEntity.id.desc()
            };
        }
        if (orderType == OrderType.ASC) {
            return new OrderSpecifier[]{communityPostEntity.id.asc()};
        }
        return new OrderSpecifier[]{communityPostEntity.id.desc()};
    }

    private Slice<CommunityPostEntity> executeSliceQuery(
        BooleanBuilder where,
        OrderSpecifier<?>[] orderSpecifiers,
        int size
    ) {
        // 1. limit + 1 조회로 hasNext 판단
        List<CommunityPostEntity> rows = queryFactory
            .selectFrom(communityPostEntity)
            .where(where)
            .orderBy(orderSpecifiers)
            .limit(size + 1L)
            .fetch();

        // 2. hasNext 체크 및 초과 아이템 제거
        boolean hasNext = rows.size() > size;
        if (hasNext) {
            rows = rows.subList(0, size);
        }

        // 3. SliceImpl 반환
        return new SliceImpl<>(rows, Pageable.unpaged(), hasNext);
    }
}
