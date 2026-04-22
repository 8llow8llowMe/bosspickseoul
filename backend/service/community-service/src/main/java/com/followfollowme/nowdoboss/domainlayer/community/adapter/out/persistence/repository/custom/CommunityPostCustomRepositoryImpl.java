package com.followfollowme.nowdoboss.domainlayer.community.adapter.out.persistence.repository.custom;

import static com.followfollowme.nowdoboss.domainlayer.community.adapter.out.persistence.entity.QCommunityPostEntity.communityPostEntity;
import static com.followfollowme.nowdoboss.domainlayer.community.adapter.out.persistence.entity.QCommunityPostLikeEntity.communityPostLikeEntity;

import com.followfollowme.nowdoboss.domainlayer.community.adapter.out.persistence.entity.CommunityPostEntity;
import com.followfollowme.nowdoboss.domainlayer.community.domain.enums.CommunityPostStatus;
import com.followfollowme.nowdoboss.domainlayer.community.domain.enums.CommunitySortType;
import com.followfollowme.nowdoboss.domainlayer.community.domain.enums.CommunityTargetType;
import com.followfollowme.nowdoboss.common.enums.OrderType;
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
        CommunityTargetType targetType, String targetCode,
        CommunityPostStatus status, CommunitySortType sortType, OrderType orderType,
        long lastPostId, long lastLikeCount, int size,
        LocalDateTime popularSince
    ) {
        BooleanBuilder where = new BooleanBuilder();
        where.and(communityPostEntity.targetType.eq(targetType));
        where.and(communityPostEntity.targetCode.eq(targetCode));
        where.and(communityPostEntity.status.eq(status));

        applyCursorCondition(where, sortType, orderType, lastPostId, lastLikeCount, popularSince);
        return executeSliceQuery(where, buildOrderSpecifiers(sortType, orderType), size);
    }

    @Override
    public Slice<CommunityPostEntity> findFeedPostsNoOffset(
        CommunityPostStatus status, CommunitySortType sortType, OrderType orderType,
        CommunityTargetType targetType, String targetCode,
        long lastPostId, long lastLikeCount, int size,
        LocalDateTime popularSince
    ) {
        BooleanBuilder where = new BooleanBuilder();
        where.and(communityPostEntity.status.eq(status));

        if (targetType != null) {
            where.and(communityPostEntity.targetType.eq(targetType));
        }
        if (targetCode != null && !targetCode.isBlank()) {
            where.and(communityPostEntity.targetCode.eq(targetCode));
        }

        applyCursorCondition(where, sortType, orderType, lastPostId, lastLikeCount, popularSince);
        return executeSliceQuery(where, buildOrderSpecifiers(sortType, orderType), size);
    }

    @Override
    public Slice<CommunityPostEntity> findLikedPostsNoOffset(
        long memberId,
        CommunityPostStatus status, CommunitySortType sortType, OrderType orderType,
        long lastPostId, long lastLikeCount, int size,
        LocalDateTime popularSince
    ) {
        BooleanBuilder where = new BooleanBuilder();
        where.and(communityPostEntity.id.in(
            JPAExpressions.select(communityPostLikeEntity.postId)
                .from(communityPostLikeEntity)
                .where(communityPostLikeEntity.memberId.eq(memberId))
        ));
        where.and(communityPostEntity.status.eq(status));

        applyCursorCondition(where, sortType, orderType, lastPostId, lastLikeCount, popularSince);
        return executeSliceQuery(where, buildOrderSpecifiers(sortType, orderType), size);
    }

    private void applyCursorCondition(
        BooleanBuilder where, CommunitySortType sortType, OrderType orderType,
        long lastPostId, long lastLikeCount, LocalDateTime popularSince
    ) {
        if (sortType == CommunitySortType.POPULAR) {
            where.and(communityPostEntity.createdAt.goe(popularSince));
            applyPopularCursor(where, lastPostId, lastLikeCount);
        } else {
            applyLatestCursor(where, lastPostId, orderType);
        }
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

    private void applyPopularCursor(BooleanBuilder where, long lastPostId, long lastLikeCount) {
        if (lastPostId > 0) {
            where.and(
                communityPostEntity.likeCount.lt(lastLikeCount)
                    .or(communityPostEntity.likeCount.eq(lastLikeCount).and(communityPostEntity.id.lt(lastPostId)))
            );
        }
    }

    private OrderSpecifier<?>[] buildOrderSpecifiers(CommunitySortType sortType, OrderType orderType) {
        if (sortType == CommunitySortType.POPULAR) {
            return new OrderSpecifier[]{communityPostEntity.likeCount.desc(), communityPostEntity.id.desc()};
        }
        if (orderType == OrderType.ASC) {
            return new OrderSpecifier[]{communityPostEntity.id.asc()};
        }
        return new OrderSpecifier[]{communityPostEntity.id.desc()};
    }

    private Slice<CommunityPostEntity> executeSliceQuery(BooleanBuilder where, OrderSpecifier<?>[] orderSpecifiers, int size) {
        List<CommunityPostEntity> rows = queryFactory
            .selectFrom(communityPostEntity)
            .where(where)
            .orderBy(orderSpecifiers)
            .limit(size + 1L)
            .fetch();

        boolean hasNext = rows.size() > size;
        if (hasNext) {
            rows = rows.subList(0, size);
        }

        return new SliceImpl<>(rows, Pageable.unpaged(), hasNext);
    }
}
