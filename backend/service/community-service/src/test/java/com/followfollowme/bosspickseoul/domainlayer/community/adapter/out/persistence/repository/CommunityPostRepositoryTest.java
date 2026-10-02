package com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.persistence.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.persistence.entity.CommunityPostEntity;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.persistence.entity.CommunityPostEntity.CommunityPostEntityBuilder;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityPostCategory;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityPostStatus;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityTargetType;
import com.followfollowme.bosspickseoul.global.config.CommunityDataJpaTest;
import java.time.LocalDateTime;
import java.util.Arrays;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;

/**
 * 게시글 본문 수정 조건부 UPDATE({@code updateContentIfActive}, #470 말머리 포함)를 실제 스키마(H2)에 질의해 확인한다.
 *
 * <p>수정 뒤에는 영속성 컨텍스트를 직접 비우고 다시 읽어 DB 에 실제로 쓰인 값을 본다. 동시 수정·카운터 경합(REPEATABLE READ)은 MySQL 전용
 * {@code CommunityRepositoryMySqlConcurrencyTest} 몫이다.
 */
@CommunityDataJpaTest
class CommunityPostRepositoryTest {

    private static final LocalDateTime CREATED_AT = LocalDateTime.of(2026, 9, 5, 9, 0);
    private static final LocalDateTime EDITED_AT = LocalDateTime.of(2026, 9, 6, 12, 0);
    private static final long POST_ID = 8001L;
    private static final long WRITER_ID = 92001L;
    private static final long OTHER_MEMBER_ID = 92002L;

    @Autowired private CommunityPostRepository postRepository;
    @Autowired private TestEntityManager entityManager;

    @Test
    @DisplayName("제목·본문·말머리·수정 시각만 바꾸고 좋아요·댓글·조회 수와 작성 시각·대상·상태는 그대로 둔다")
    void updatesEditableFieldsAndPreservesCounters() {
        save(post(POST_ID, WRITER_ID).category(CommunityPostCategory.QUESTION).likeCount(3).commentCount(2).viewCount(10));

        int updated = postRepository.updateContentIfActive(
            POST_ID, WRITER_ID, "수정 제목", "수정 본문", CommunityPostCategory.NEWS, EDITED_AT, CommunityPostStatus.ACTIVE);

        assertThat(updated).isEqualTo(1);
        CommunityPostEntity reloaded = reload(POST_ID);
        assertThat(reloaded).extracting(
                CommunityPostEntity::getTitle, CommunityPostEntity::getContent, CommunityPostEntity::getCategory, CommunityPostEntity::getUpdatedAt)
            .containsExactly("수정 제목", "수정 본문", CommunityPostCategory.NEWS, EDITED_AT);
        assertThat(reloaded).extracting(
                CommunityPostEntity::getLikeCount, CommunityPostEntity::getCommentCount, CommunityPostEntity::getViewCount,
                CommunityPostEntity::getCreatedAt, CommunityPostEntity::getStatus, CommunityPostEntity::getMemberId,
                CommunityPostEntity::getTargetType, CommunityPostEntity::getTargetCode)
            .containsExactly(3L, 2L, 10L, CREATED_AT, CommunityPostStatus.ACTIVE, WRITER_ID, CommunityTargetType.COMMERCIAL, "C1");
    }

    @Test
    @DisplayName("말머리는 전체 교체라 null 을 보내면 null 로 지운다 — 카운터는 그대로다")
    void nullCategoryClearsIt() {
        save(post(POST_ID, WRITER_ID).category(CommunityPostCategory.QUESTION).likeCount(3));

        int updated = postRepository.updateContentIfActive(POST_ID, WRITER_ID, "제목", "본문", null, EDITED_AT, CommunityPostStatus.ACTIVE);

        assertThat(updated).isEqualTo(1);
        CommunityPostEntity reloaded = reload(POST_ID);
        assertThat(reloaded.getCategory()).isNull();
        assertThat(reloaded.getLikeCount()).isEqualTo(3L);
    }

    @Test
    @DisplayName("DELETED 글은 0건 갱신이고 값이 그대로 남는다")
    void deletedPostIsNotUpdated() {
        save(post(POST_ID, WRITER_ID).category(CommunityPostCategory.QUESTION).status(CommunityPostStatus.DELETED));

        int updated = postRepository.updateContentIfActive(
            POST_ID, WRITER_ID, "되살리기", "되살리기", CommunityPostCategory.NEWS, EDITED_AT, CommunityPostStatus.ACTIVE);

        assertThat(updated).isZero();
        assertUnchanged(reload(POST_ID), CommunityPostStatus.DELETED);
    }

    @Test
    @DisplayName("남의 글은 0건 갱신이고, 같은 글을 작성자가 고치면 1건이다 — 작성자 조건만으로 갈린다")
    void otherMembersPostIsNotUpdated() {
        save(post(POST_ID, WRITER_ID).category(CommunityPostCategory.QUESTION));

        int byOther = postRepository.updateContentIfActive(
            POST_ID, OTHER_MEMBER_ID, "가로채기", "가로채기", CommunityPostCategory.NEWS, EDITED_AT, CommunityPostStatus.ACTIVE);

        assertThat(byOther).isZero();
        assertUnchanged(reload(POST_ID), CommunityPostStatus.ACTIVE);
        assertThat(postRepository.updateContentIfActive(
            POST_ID, WRITER_ID, "수정", "수정", CommunityPostCategory.NEWS, EDITED_AT, CommunityPostStatus.ACTIVE)).isEqualTo(1);
    }

    @Test
    @DisplayName("대상 글 한 건만 바뀌고 같은 작성자의 다른 글은 그대로다")
    void updatesOnlyTheTargetPost() {
        save(post(POST_ID, WRITER_ID).category(CommunityPostCategory.QUESTION), post(POST_ID + 1, WRITER_ID).category(CommunityPostCategory.QUESTION));

        int updated = postRepository.updateContentIfActive(
            POST_ID, WRITER_ID, "수정", "수정", CommunityPostCategory.NEWS, EDITED_AT, CommunityPostStatus.ACTIVE);

        assertThat(updated).isEqualTo(1);
        assertUnchanged(reload(POST_ID + 1), CommunityPostStatus.ACTIVE);
    }

    /**
     * 어댑터는 수정 직후 같은 트랜잭션에서 {@code findById} 로 다시 읽어 응답을 만든다. {@code flushAutomatically} 가 대기 중인 쓰기를 먼저 내보내고
     * {@code clearAutomatically} 가 오래된 1차 캐시를 비워야 그 재조회가 새 값을 본다 — 그래서 이 테스트는 직접 clear 하지 않는다.
     */
    @Test
    @DisplayName("flush 전 저장분에도 적용되고, 직접 비우지 않아도 같은 영속성 컨텍스트의 재조회가 새 값을 본다")
    void modifyingQueryFlushesPendingWritesAndClearsStaleCache() {
        postRepository.save(post(POST_ID, WRITER_ID).category(CommunityPostCategory.QUESTION).build());

        int updated = postRepository.updateContentIfActive(
            POST_ID, WRITER_ID, "수정 제목", "수정 본문", null, EDITED_AT, CommunityPostStatus.ACTIVE);

        assertThat(updated).isEqualTo(1);
        CommunityPostEntity reread = postRepository.findById(POST_ID).orElseThrow();
        assertThat(reread.getTitle()).isEqualTo("수정 제목");
        assertThat(reread.getCategory()).isNull();
    }

    private void assertUnchanged(CommunityPostEntity post, CommunityPostStatus status) {
        assertThat(post).extracting(
                CommunityPostEntity::getTitle, CommunityPostEntity::getContent, CommunityPostEntity::getCategory,
                CommunityPostEntity::getUpdatedAt, CommunityPostEntity::getStatus)
            .containsExactly("게시글 " + post.getId(), "본문 " + post.getId(), CommunityPostCategory.QUESTION, CREATED_AT, status);
    }

    private CommunityPostEntity reload(long postId) {
        entityManager.clear();
        return postRepository.findById(postId).orElseThrow();
    }

    private static CommunityPostEntityBuilder post(long id, long memberId) {
        return CommunityPostEntity.builder()
            .id(id).memberId(memberId)
            .targetType(CommunityTargetType.COMMERCIAL).targetCode("C1").targetName("게시판 C1")
            .title("게시글 " + id).content("본문 " + id)
            .status(CommunityPostStatus.ACTIVE)
            .likeCount(0).commentCount(0).viewCount(0)
            .createdAt(CREATED_AT).updatedAt(CREATED_AT);
    }

    private void save(CommunityPostEntityBuilder... posts) {
        postRepository.saveAllAndFlush(Arrays.stream(posts).map(CommunityPostEntityBuilder::build).toList());
    }
}
