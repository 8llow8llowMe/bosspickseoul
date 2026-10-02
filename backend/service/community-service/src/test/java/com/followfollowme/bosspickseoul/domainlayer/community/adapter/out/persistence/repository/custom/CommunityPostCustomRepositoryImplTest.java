package com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.persistence.repository.custom;

import static org.assertj.core.api.Assertions.assertThat;

import com.followfollowme.bosspickseoul.common.enums.OrderType;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.persistence.entity.CommunityPostEntity;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.persistence.entity.CommunityPostEntity.CommunityPostEntityBuilder;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.persistence.entity.CommunityPostLikeEntity;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.persistence.repository.CommunityPostLikeRepository;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.persistence.repository.CommunityPostRepository;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityPostCategory;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityPostStatus;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunitySortType;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityTargetType;
import com.followfollowme.bosspickseoul.global.config.CommunityDataJpaTest;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Slice;

/**
 * 게시글 커서 목록의 동적 조건·커서·정렬을 실제 스키마(H2)에 질의해 확인한다.
 *
 * <p>QueryDSL 커스텀 구현은 컴파일로 검증되지 않는다(coding-conventions §9-6). 조건을 빼먹거나 커서 부등호·정렬 방향을 뒤집어도 빌드는
 * 통과하고 결과만 조용히 틀린다. 그래서 「쪽을 끝까지 이어 읽으면 중복·누락 없이 정렬 순서 그대로 나온다」를 쪽 크기를 바꿔 가며 못 박는다.
 * 쪽 크기 1 은 모든 경계가 likeCount 동률 그룹 한가운데에 걸리게 만든다.
 *
 * <p>작성 시각은 고정 시각({@link #NOW})으로 넣어 현재 시각에 의존하지 않는다. 기간 하한(popularSince) 계산 자체는 Processor·enum 테스트 몫이다.
 */
@CommunityDataJpaTest
class CommunityPostCustomRepositoryImplTest {

    private static final LocalDateTime NOW = LocalDateTime.of(2026, 9, 6, 12, 0);
    private static final LocalDateTime WEEK_AGO = NOW.minusDays(7);
    private static final long WRITER_ID = 92001L;
    private static final long LIKER_ID = 93001L;
    private static final long OTHER_LIKER_ID = 93002L;
    private static final String BOARD_A = "C1";
    private static final String BOARD_B = "C2";
    private static final int MAX_PAGES = 50;

    @Autowired private CommunityPostRepository postRepository;
    @Autowired private CommunityPostLikeRepository likeRepository;

    @Test
    @DisplayName("최신순 DESC: lastPostId=0 이 첫 쪽이고, id 커서로 이어 읽으면 중복·누락 없이 id 내림차순으로 끝까지 나온다")
    void latestDescCursorReadsEveryPostOnceInIdOrder() {
        save(post(1004), post(1001), post(1007), post(1003), post(1006), post(1002), post(1005));
        List<Long> expected = List.of(1007L, 1006L, 1005L, 1004L, 1003L, 1002L, 1001L);

        Slice<CommunityPostEntity> first = latest(OrderType.DESC).read(0L, 0L, 3);
        assertThat(ids(first)).containsExactly(1007L, 1006L, 1005L);
        assertThat(first.hasNext()).isTrue();
        Slice<CommunityPostEntity> second = latest(OrderType.DESC).read(1005L, 0L, 3);
        assertThat(ids(second)).containsExactly(1004L, 1003L, 1002L);
        assertThat(second.hasNext()).isTrue();
        Slice<CommunityPostEntity> last = latest(OrderType.DESC).read(1002L, 0L, 3);
        assertThat(ids(last)).containsExactly(1001L);
        assertThat(last.hasNext()).isFalse();

        for (int size : new int[]{1, 2, 3, 7, 10}) {
            assertThat(readAllPages(latest(OrderType.DESC), size)).as("size=%d", size).containsExactlyElementsOf(expected);
        }
    }

    @Test
    @DisplayName("최신순 ASC: id 커서가 반대 방향(id > lastPostId)으로 걸려 중복·누락 없이 id 오름차순으로 끝까지 나온다")
    void latestAscCursorReadsEveryPostOnceInIdOrder() {
        save(post(1004), post(1001), post(1007), post(1003), post(1006), post(1002), post(1005));

        Slice<CommunityPostEntity> first = latest(OrderType.ASC).read(0L, 0L, 3);
        assertThat(ids(first)).containsExactly(1001L, 1002L, 1003L);
        assertThat(first.hasNext()).isTrue();
        Slice<CommunityPostEntity> last = latest(OrderType.ASC).read(1006L, 0L, 3);
        assertThat(ids(last)).containsExactly(1007L);
        assertThat(last.hasNext()).isFalse();

        for (int size : new int[]{1, 2, 3, 7, 10}) {
            assertThat(readAllPages(latest(OrderType.ASC), size)).as("size=%d", size)
                .containsExactly(1001L, 1002L, 1003L, 1004L, 1005L, 1006L, 1007L);
        }
    }

    @Test
    @DisplayName("hasNext 는 size + 1 건 조회로 판정한다 — 남은 글이 정확히 size 건이면 false, 더 있으면 true")
    void hasNextIsDecidedBySizePlusOne() {
        save(post(1001), post(1002), post(1003), post(1004), post(1005), post(1006), post(1007));

        Slice<CommunityPostEntity> exact = latest(OrderType.DESC).read(0L, 0L, 7);
        assertThat(exact.getContent()).hasSize(7);
        assertThat(exact.hasNext()).isFalse();

        Slice<CommunityPostEntity> oneMore = latest(OrderType.DESC).read(0L, 0L, 6);
        assertThat(oneMore.getContent()).hasSize(6);
        assertThat(oneMore.hasNext()).isTrue();

        Slice<CommunityPostEntity> beyondLast = latest(OrderType.DESC).read(1001L, 0L, 3);
        assertThat(beyondLast.getContent()).isEmpty();
        assertThat(beyondLast.hasNext()).isFalse();
    }

    @Test
    @DisplayName("인기순: likeCount 동률이 섞여도 (lastLikeCount, lastPostId) 커서로 (likeCount desc, id desc) 순서 그대로 중복·누락 없이 이어진다")
    void popularCursorKeepsOrderAcrossLikeCountTies() {
        save(
            post(1001).likeCount(5), post(1002).likeCount(3), post(1003).likeCount(5), post(1004).likeCount(0),
            post(1005).likeCount(3), post(1006).likeCount(5), post(1007).likeCount(1), post(1008).likeCount(3)
        );
        List<Long> expected = List.of(1006L, 1003L, 1001L, 1008L, 1005L, 1002L, 1007L, 1004L);

        Slice<CommunityPostEntity> first = popular(null).read(0L, 0L, 2);
        assertThat(ids(first)).containsExactly(1006L, 1003L);
        assertThat(first.hasNext()).isTrue();
        // 커서가 likeCount=5 동률 그룹 한가운데(1003)에 걸려도 같은 그룹의 더 작은 id(1001)부터 이어진다.
        Slice<CommunityPostEntity> second = popular(null).read(1003L, 5L, 2);
        assertThat(ids(second)).containsExactly(1001L, 1008L);
        assertThat(second.hasNext()).isTrue();

        for (int size : new int[]{1, 2, 3, 4, 8, 10}) {
            assertThat(readAllPages(popular(null), size)).as("size=%d", size).containsExactlyElementsOf(expected);
        }
        // 인기순은 orderType 과 무관하게 (likeCount desc, id desc) 다 — 커서 부등호가 내림차순 고정이라 정렬만 뒤집히면 쪽이 깨진다.
        CommunityPostReader popularAsc = feed(CommunitySortType.POPULAR, OrderType.ASC, null, null, null, null);
        assertThat(readAllPages(popularAsc, 3)).containsExactlyElementsOf(expected);
        // lastPostId=0 은 첫 쪽 관례다 — lastLikeCount 가 와도 커서를 걸지 않는다.
        assertThat(ids(popular(null).read(0L, 3L, 10))).containsExactlyElementsOf(expected);
    }

    @Test
    @DisplayName("인기순 기간 하한: popularSince 가 있으면 그보다 오래된 글을 빼고(경계 포함), null 이면 하한 없이 전체를 같은 커서로 읽는다")
    void popularSinceExcludesOlderPostsOnlyWhenPresent() {
        save(
            post(2001).likeCount(10).createdAt(NOW.minusDays(40)),
            post(2002).likeCount(5).createdAt(NOW.minusDays(20)),
            post(2003).likeCount(3).createdAt(NOW.minusDays(1)),
            post(2004).likeCount(3).createdAt(NOW.minusDays(2)),
            post(2005).likeCount(8).createdAt(NOW.minusDays(6)),
            post(2006).likeCount(1).createdAt(WEEK_AGO),                     // 하한과 같은 시각 → 포함(goe)
            post(2007).likeCount(9).createdAt(WEEK_AGO.minusSeconds(1)),     // 하한 1초 전 → 제외
            post(2008).likeCount(0).createdAt(NOW.minusDays(30))
        );
        List<Long> withinWeek = List.of(2005L, 2004L, 2003L, 2006L);
        List<Long> allPeriod = List.of(2001L, 2007L, 2005L, 2002L, 2004L, 2003L, 2006L, 2008L);

        for (int size : new int[]{1, 2, 3, 10}) {
            assertThat(readAllPages(popular(WEEK_AGO), size)).as("WEEK size=%d", size).containsExactlyElementsOf(withinWeek);
            assertThat(readAllPages(popular(null), size)).as("ALL size=%d", size).containsExactlyElementsOf(allPeriod);
        }
        // 하한이 걸린 채 커서로 넘겨도, 커서보다 likeCount 가 큰 기간 밖 글(2007·2002)이나 이미 본 글이 다시 끼지 않는다.
        Slice<CommunityPostEntity> secondWeekPage = popular(WEEK_AGO).read(2004L, 3L, 2);
        assertThat(ids(secondWeekPage)).containsExactly(2003L, 2006L);
        assertThat(secondWeekPage.hasNext()).isFalse();
        // 최신순에는 하한을 적용하지 않는다(받아도 무시).
        CommunityPostReader latestWithSince = feed(CommunitySortType.LATEST, OrderType.DESC, null, null, null, WEEK_AGO);
        assertThat(ids(latestWithSince.read(0L, 0L, 20))).containsExactly(2008L, 2007L, 2006L, 2005L, 2004L, 2003L, 2002L, 2001L);
    }

    @Test
    @DisplayName("말머리: null 이면 말머리 없는 글까지 전체, 값이면 그 말머리만 — 대상 필터·최신/인기 커서·기간 하한과 함께 동작한다")
    void feedFiltersByCategoryTogetherWithTargetFilterAndCursors() {
        CommunityPostCategory question = CommunityPostCategory.QUESTION;
        save(
            post(3001).likeCount(2),
            post(3002).category(question).likeCount(1).createdAt(NOW.minusDays(10)),
            post(3003).targetCode(BOARD_B).category(question).likeCount(7),
            post(3004).category(CommunityPostCategory.NEWS).likeCount(9),
            post(3005).category(question).likeCount(4),
            post(3006).targetType(CommunityTargetType.DISTRICT).category(question).likeCount(6),  // 코드는 같고 대상 종류만 다르다
            post(3007).category(question).likeCount(4),
            post(3008).category(question).likeCount(100).status(CommunityPostStatus.DELETED)
        );
        CommunityTargetType commercial = CommunityTargetType.COMMERCIAL;

        assertThat(firstPageIds(latestFeed(null, null, null))).containsExactly(3007L, 3006L, 3005L, 3004L, 3003L, 3002L, 3001L);
        assertThat(firstPageIds(latestFeed(null, null, question))).containsExactly(3007L, 3006L, 3005L, 3003L, 3002L);
        assertThat(firstPageIds(latestFeed(commercial, BOARD_A, null))).containsExactly(3007L, 3005L, 3004L, 3002L, 3001L);
        assertThat(firstPageIds(latestFeed(commercial, BOARD_A, question))).containsExactly(3007L, 3005L, 3002L);
        assertThat(firstPageIds(latestFeed(CommunityTargetType.DISTRICT, BOARD_A, question))).containsExactly(3006L);
        assertThat(firstPageIds(latestFeed(commercial, null, question))).containsExactly(3007L, 3005L, 3003L, 3002L);

        Slice<CommunityPostEntity> latestSecond = latestFeed(commercial, BOARD_A, question).read(3005L, 0L, 2);
        assertThat(ids(latestSecond)).containsExactly(3002L);
        assertThat(latestSecond.hasNext()).isFalse();

        CommunityPostReader popularBoard = feed(CommunitySortType.POPULAR, OrderType.DESC, commercial, BOARD_A, question, null);
        CommunityPostReader popularBoardWeek = feed(CommunitySortType.POPULAR, OrderType.DESC, commercial, BOARD_A, question, WEEK_AGO);
        for (int size : new int[]{1, 2, 10}) {
            assertThat(readAllPages(latestFeed(commercial, BOARD_A, question), size)).as("LATEST size=%d", size)
                .containsExactly(3007L, 3005L, 3002L);
            assertThat(readAllPages(popularBoard, size)).as("POPULAR size=%d", size).containsExactly(3007L, 3005L, 3002L);
            assertThat(readAllPages(popularBoardWeek, size)).as("POPULAR+WEEK size=%d", size).containsExactly(3007L, 3005L);
        }
    }

    @Test
    @DisplayName("DELETED 글은 피드·검색·좋아요 목록 어디에서도 나오지 않는다")
    void deletedPostsAreExcludedFromFeedSearchAndLikedList() {
        save(
            post(4001).title("강남역 맛집").likeCount(1),
            post(4002).title("강남역 폐업").likeCount(9).status(CommunityPostStatus.DELETED),
            post(4003).title("홍대 카페").likeCount(2)
        );
        like(1L, 4001L, LIKER_ID);
        like(2L, 4002L, LIKER_ID);

        assertThat(firstPageIds(latest(OrderType.DESC))).containsExactly(4003L, 4001L);
        assertThat(firstPageIds(popular(null))).containsExactly(4003L, 4001L);
        assertThat(firstPageIds(search("강남역", CommunitySortType.LATEST, null))).containsExactly(4001L);
        assertThat(firstPageIds(search("강남역", CommunitySortType.POPULAR, null))).containsExactly(4001L);
        assertThat(firstPageIds(liked(LIKER_ID, CommunitySortType.LATEST, null))).containsExactly(4001L);
        assertThat(firstPageIds(liked(LIKER_ID, CommunitySortType.POPULAR, null))).containsExactly(4001L);
    }

    @Test
    @DisplayName("검색: 제목·본문 어느 쪽이든 대소문자 무시로 맞으면 나오고, 인기순 + popularSince null 이면 하한 없이 커서로 이어진다")
    void searchMatchesTitleOrContentIgnoringCaseWithPopularCursor() {
        save(
            post(5001).title("Gangnam cafe").content("커피").likeCount(3).createdAt(NOW.minusDays(40)),
            post(5002).title("다른 글").content("gangnam 근처").likeCount(7).createdAt(NOW.minusDays(1)),
            post(5003).title("GANGNAM 후기").content("후기").likeCount(3).createdAt(NOW.minusDays(2)),
            post(5004).title("홍대").content("홍대").likeCount(50)
        );

        for (int size : new int[]{1, 2, 10}) {
            assertThat(readAllPages(search("gangnam", CommunitySortType.POPULAR, null), size)).as("size=%d", size)
                .containsExactly(5002L, 5003L, 5001L);
        }
        assertThat(readAllPages(search("gangnam", CommunitySortType.POPULAR, WEEK_AGO), 1)).containsExactly(5002L, 5003L);
        assertThat(readAllPages(search("gangnam", CommunitySortType.LATEST, null), 1)).containsExactly(5003L, 5002L, 5001L);
        // 키워드가 비면 검색 조건을 붙이지 않는다.
        assertThat(firstPageIds(search(null, CommunitySortType.LATEST, null))).containsExactly(5004L, 5003L, 5002L, 5001L);
        assertThat(firstPageIds(search(" ", CommunitySortType.LATEST, null))).containsExactly(5004L, 5003L, 5002L, 5001L);
    }

    @Test
    @DisplayName("검색어의 % 와 _ 는 LIKE 와일드카드가 아니라 글자 그대로 찾는다")
    void searchKeywordTreatsLikeWildcardsLiterally() {
        save(
            post(5101).title("50% 할인"),
            post(5102).title("500원 할인"),
            post(5103).title("a_b 모임"),
            post(5104).title("axb 모임")
        );

        assertThat(firstPageIds(search("50%", CommunitySortType.LATEST, null))).containsExactly(5101L);
        assertThat(firstPageIds(search("a_b", CommunitySortType.LATEST, null))).containsExactly(5103L);
    }

    @Test
    @DisplayName("좋아요 목록: 그 회원이 좋아요한 글만(서브쿼리) 인기순 커서로 중복·누락 없이 이어지고, 다른 회원의 좋아요는 섞이지 않는다")
    void likedListUsesMemberSubqueryWithPopularCursor() {
        save(
            post(6001).likeCount(2),
            post(6002).likeCount(9),
            post(6003).likeCount(5),
            post(6004).likeCount(2).createdAt(NOW.minusDays(20)),
            post(6005).likeCount(100)
        );
        like(1L, 6001L, LIKER_ID);
        like(2L, 6003L, LIKER_ID);
        like(3L, 6004L, LIKER_ID);
        like(4L, 6002L, OTHER_LIKER_ID);
        like(5L, 6003L, OTHER_LIKER_ID);

        for (int size : new int[]{1, 2, 10}) {
            assertThat(readAllPages(liked(LIKER_ID, CommunitySortType.POPULAR, null), size)).as("size=%d", size)
                .containsExactly(6003L, 6004L, 6001L);
        }
        assertThat(readAllPages(liked(LIKER_ID, CommunitySortType.POPULAR, WEEK_AGO), 1)).containsExactly(6003L, 6001L);
        assertThat(readAllPages(liked(OTHER_LIKER_ID, CommunitySortType.POPULAR, null), 1)).containsExactly(6002L, 6003L);
        assertThat(readAllPages(liked(LIKER_ID, CommunitySortType.LATEST, null), 1)).containsExactly(6004L, 6003L, 6001L);
        assertThat(firstPageIds(liked(99999L, CommunitySortType.POPULAR, null))).isEmpty();
    }

    /** 커서 목록 한 쪽 조회. 테스트가 쪽을 이어 읽을 때 (lastPostId, lastLikeCount, size) 만 바꿔 부른다. */
    @FunctionalInterface
    private interface CommunityPostReader {

        Slice<CommunityPostEntity> read(long lastPostId, long lastLikeCount, int size);
    }

    /**
     * lastPostId=0 부터 hasNext 가 false 가 될 때까지 쪽을 이어 읽어 id 를 순서대로 모은다. 커서는 앞 쪽 마지막 글의 (id, likeCount) 다.
     * hasNext=true 인 쪽은 꽉 차 있어야 하고, 그 다음 쪽은 비어 있으면 안 된다 — size + 1 판정이 어긋나면 여기서 걸린다.
     */
    private static List<Long> readAllPages(CommunityPostReader reader, int size) {
        List<Long> ids = new ArrayList<>();
        long lastPostId = 0L;
        long lastLikeCount = 0L;
        for (int page = 0; page < MAX_PAGES; page++) {
            Slice<CommunityPostEntity> slice = reader.read(lastPostId, lastLikeCount, size);
            List<CommunityPostEntity> content = slice.getContent();
            assertThat(content).hasSizeLessThanOrEqualTo(size);
            if (page > 0) {
                assertThat(content).as("hasNext=true 였던 다음 쪽").isNotEmpty();
            }
            content.forEach(post -> ids.add(post.getId()));
            if (!slice.hasNext()) {
                return ids;
            }
            assertThat(content).as("hasNext=true 인 쪽").hasSize(size);
            CommunityPostEntity last = content.get(content.size() - 1);
            lastPostId = last.getId();
            lastLikeCount = last.getLikeCount();
        }
        throw new AssertionError("커서가 " + MAX_PAGES + " 쪽 안에 끝나지 않는다: " + ids);
    }

    private CommunityPostReader feed(
        CommunitySortType sortType, OrderType orderType, CommunityTargetType targetType, String targetCode,
        CommunityPostCategory category, LocalDateTime popularSince
    ) {
        return (lastPostId, lastLikeCount, size) -> postRepository.findFeedPostsNoOffset(
            CommunityPostStatus.ACTIVE, sortType, orderType, targetType, targetCode, category, lastPostId, lastLikeCount, size, popularSince);
    }

    private CommunityPostReader latest(OrderType orderType) {
        return feed(CommunitySortType.LATEST, orderType, null, null, null, null);
    }

    private CommunityPostReader latestFeed(CommunityTargetType targetType, String targetCode, CommunityPostCategory category) {
        return feed(CommunitySortType.LATEST, OrderType.DESC, targetType, targetCode, category, null);
    }

    private CommunityPostReader popular(LocalDateTime popularSince) {
        return feed(CommunitySortType.POPULAR, OrderType.DESC, null, null, null, popularSince);
    }

    private CommunityPostReader search(String keyword, CommunitySortType sortType, LocalDateTime popularSince) {
        return (lastPostId, lastLikeCount, size) -> postRepository.findSearchPostsNoOffset(
            keyword, CommunityPostStatus.ACTIVE, sortType, OrderType.DESC, lastPostId, lastLikeCount, size, popularSince);
    }

    private CommunityPostReader liked(long memberId, CommunitySortType sortType, LocalDateTime popularSince) {
        return (lastPostId, lastLikeCount, size) -> postRepository.findLikedPostsNoOffset(
            memberId, CommunityPostStatus.ACTIVE, sortType, OrderType.DESC, lastPostId, lastLikeCount, size, popularSince);
    }

    private static List<Long> firstPageIds(CommunityPostReader reader) {
        return ids(reader.read(0L, 0L, 100));
    }

    private static List<Long> ids(Slice<CommunityPostEntity> slice) {
        return slice.getContent().stream().map(CommunityPostEntity::getId).toList();
    }

    /** 기본값: 게시판 A(상권 C1)의 ACTIVE 글, 말머리 없음, 카운터 0, 작성 시각은 고정 시각 1시간 전. Snowflake 대신 고정 id 를 쓴다. */
    private static CommunityPostEntityBuilder post(long id) {
        LocalDateTime createdAt = NOW.minusHours(1);
        return CommunityPostEntity.builder()
            .id(id).memberId(WRITER_ID)
            .targetType(CommunityTargetType.COMMERCIAL).targetCode(BOARD_A).targetName("게시판 " + BOARD_A)
            .title("게시글 " + id).content("본문 " + id)
            .status(CommunityPostStatus.ACTIVE)
            .likeCount(0).commentCount(0).viewCount(0)
            .createdAt(createdAt).updatedAt(createdAt);
    }

    private void save(CommunityPostEntityBuilder... posts) {
        postRepository.saveAllAndFlush(Arrays.stream(posts).map(CommunityPostEntityBuilder::build).toList());
    }

    private void like(long id, long postId, long memberId) {
        likeRepository.saveAndFlush(CommunityPostLikeEntity.builder().id(id).postId(postId).memberId(memberId).createdAt(NOW).build());
    }
}
