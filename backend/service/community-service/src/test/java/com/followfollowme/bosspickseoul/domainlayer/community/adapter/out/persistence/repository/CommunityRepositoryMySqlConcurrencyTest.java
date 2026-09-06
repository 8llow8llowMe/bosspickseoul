package com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.persistence.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.persistence.entity.CommunityPostEntity;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.persistence.entity.CommunityPostLikeEntity;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityPostStatus;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityTargetType;
import com.followfollowme.bosspickseoul.persistence.config.QuerydslConfigurer;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

/** Runs only against an explicitly supplied disposable p0_test MySQL schema. */
@DataJpaTest(properties = {
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.jpa.show-sql=false",
    "spring.cloud.config.enabled=false",
    "spring.cloud.bootstrap.enabled=false"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ContextConfiguration(classes = CommunityRepositoryMySqlConcurrencyTest.Config.class)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
@EnabledIfEnvironmentVariable(named = "COMMUNITY_TEST_DB_URL", matches = "jdbc:mysql:.*")
class CommunityRepositoryMySqlConcurrencyTest {

    private static final long POST_ID = 91001L;
    private static final long MEMBER_ID = 92001L;
    private static final LocalDateTime NOW = LocalDateTime.of(2026, 9, 6, 12, 0);

    @Configuration(proxyBeanMethods = false)
    @EntityScan(basePackageClasses = CommunityPostEntity.class)
    @EnableJpaRepositories(basePackageClasses = CommunityPostRepository.class)
    @Import(QuerydslConfigurer.class)
    static class Config {
    }

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        String url = System.getenv("COMMUNITY_TEST_DB_URL");
        if (!url.matches("jdbc:mysql://[^/]+/p0_test(?:\\?.*)?")) {
            throw new IllegalArgumentException("Integration tests require the disposable p0_test schema");
        }
        registry.add("spring.datasource.url", () -> url);
        registry.add("spring.datasource.username", () -> System.getenv().getOrDefault("COMMUNITY_TEST_DB_USERNAME", "root"));
        registry.add("spring.datasource.password", () -> System.getenv().getOrDefault("COMMUNITY_TEST_DB_PASSWORD", ""));
        registry.add("spring.datasource.driver-class-name", () -> "com.mysql.cj.jdbc.Driver");
        registry.add("spring.datasource.hikari.maximum-pool-size", () -> 12);
    }

    @Autowired private CommunityPostRepository posts;
    @Autowired private CommunityPostLikeRepository likes;
    @Autowired private PlatformTransactionManager transactionManager;

    @BeforeEach
    void seed() {
        transaction().executeWithoutResult(status -> {
            likes.deleteAllInBatch();
            posts.deleteAllInBatch();
            posts.saveAndFlush(CommunityPostEntity.builder()
                .id(POST_ID).memberId(MEMBER_ID).targetType(CommunityTargetType.COMMERCIAL)
                .targetCode("C1").targetName("target").title("original").content("content")
                .status(CommunityPostStatus.ACTIVE).likeCount(0).commentCount(0).viewCount(0)
                .createdAt(NOW).updatedAt(NOW).build());
        });
    }

    @Test
    void concurrentCountersDoNotLoseUpdatesAfterStaleReads() throws Exception {
        int workers = 4;
        CyclicBarrier staleReads = new CyclicBarrier(workers);
        List<Callable<Integer>> tasks = new ArrayList<>();
        for (int i = 0; i < workers; i++) {
            tasks.add(() -> transaction().execute(status -> {
                assertThat(posts.findById(POST_ID).orElseThrow().getViewCount()).isZero();
                await(staleReads);
                assertThat(posts.incrementViewCountIfActive(POST_ID, CommunityPostStatus.ACTIVE)).isEqualTo(1);
                assertThat(posts.incrementLikeCountIfActive(POST_ID, CommunityPostStatus.ACTIVE)).isEqualTo(1);
                return posts.incrementCommentCountIfActive(POST_ID, CommunityPostStatus.ACTIVE);
            }));
        }
        assertThat(concurrently(tasks)).containsOnly(1);
        CommunityPostEntity post = readPost();
        assertThat(post.getViewCount()).isEqualTo(workers);
        assertThat(post.getLikeCount()).isEqualTo(workers);
        assertThat(post.getCommentCount()).isEqualTo(workers);
    }

    @Test
    void staleContentEditPreservesCountersAndDeletionCannotBeReversed() throws Exception {
        CyclicBarrier staleReads = new CyclicBarrier(2);
        concurrently(List.of(
            () -> transaction().execute(status -> {
                posts.findById(POST_ID).orElseThrow();
                await(staleReads);
                return posts.updateContentIfActive(POST_ID, MEMBER_ID, "edited", "new content", NOW.plusHours(1), CommunityPostStatus.ACTIVE);
            }),
            () -> transaction().execute(status -> {
                posts.findById(POST_ID).orElseThrow();
                await(staleReads);
                posts.incrementViewCountIfActive(POST_ID, CommunityPostStatus.ACTIVE);
                return posts.incrementLikeCountIfActive(POST_ID, CommunityPostStatus.ACTIVE);
            })
        ));
        assertThat(readPost().getTitle()).isEqualTo("edited");
        assertThat(readPost().getViewCount()).isEqualTo(1);
        assertThat(readPost().getLikeCount()).isEqualTo(1);
        transaction().executeWithoutResult(status -> {
            assertThat(posts.deleteIfActive(POST_ID, CommunityPostStatus.ACTIVE, CommunityPostStatus.DELETED)).isEqualTo(1);
            assertThat(posts.deleteIfActive(POST_ID, CommunityPostStatus.ACTIVE, CommunityPostStatus.DELETED)).isZero();
            assertThat(posts.updateContentIfActive(POST_ID, MEMBER_ID, "restored", "restored", NOW, CommunityPostStatus.ACTIVE)).isZero();
            assertThat(posts.incrementViewCountIfActive(POST_ID, CommunityPostStatus.ACTIVE)).isZero();
            assertThat(posts.incrementLikeCountIfActive(POST_ID, CommunityPostStatus.ACTIVE)).isZero();
        });
        assertThat(readPost().getStatus()).isEqualTo(CommunityPostStatus.DELETED);
        assertThat(readPost().getTitle()).isEqualTo("edited");
        assertThat(readPost().getLikeCount()).isEqualTo(1);
    }

    @Test
    void concurrentUnlikeHasOneWinnerAndPreservesOtherMembersLike() throws Exception {
        transaction().executeWithoutResult(status -> {
            saveLike(93001L, MEMBER_ID);
            saveLike(93002L, MEMBER_ID + 1);
            posts.incrementLikeCountIfActive(POST_ID, CommunityPostStatus.ACTIVE);
            posts.incrementLikeCountIfActive(POST_ID, CommunityPostStatus.ACTIVE);
        });
        CyclicBarrier staleReads = new CyclicBarrier(2);
        Callable<Integer> unlike = () -> transaction().execute(status -> {
            assertThat(likes.existsByPostIdAndMemberId(POST_ID, MEMBER_ID)).isTrue();
            await(staleReads);
            int deleted = likes.deleteByPostIdAndMemberId(POST_ID, MEMBER_ID);
            if (deleted == 1) {
                posts.decrementLikeCountIfActive(POST_ID, CommunityPostStatus.ACTIVE);
            }
            return deleted;
        });
        assertThat(concurrently(List.of(unlike, unlike))).containsExactlyInAnyOrder(1, 0);
        assertThat(readPost().getLikeCount()).isEqualTo(1);
        assertThat(likes.existsByPostIdAndMemberId(POST_ID, MEMBER_ID + 1)).isTrue();
    }

    @Test
    void failedCounterTransitionRollsBackUnlikeRowDeletion() {
        transaction().executeWithoutResult(status -> {
            saveLike(93001L, MEMBER_ID);
            posts.incrementLikeCountIfActive(POST_ID, CommunityPostStatus.ACTIVE);
            posts.deleteIfActive(POST_ID, CommunityPostStatus.ACTIVE, CommunityPostStatus.DELETED);
        });
        assertThatThrownBy(() -> transaction().executeWithoutResult(status -> {
            assertThat(likes.deleteByPostIdAndMemberId(POST_ID, MEMBER_ID)).isEqualTo(1);
            assertThat(posts.decrementLikeCountIfActive(POST_ID, CommunityPostStatus.ACTIVE)).isZero();
            throw new IllegalStateException("target deleted");
        })).isInstanceOf(IllegalStateException.class).hasMessage("target deleted");
        assertThat(likes.existsByPostIdAndMemberId(POST_ID, MEMBER_ID)).isTrue();
        assertThat(readPost().getLikeCount()).isEqualTo(1);
    }

    @Test
    void countersNeverBecomeNegative() {
        transaction().executeWithoutResult(status -> {
            posts.decrementLikeCountIfActive(POST_ID, CommunityPostStatus.ACTIVE);
            posts.decrementCommentCountIfActive(POST_ID, CommunityPostStatus.ACTIVE);
        });
        assertThat(readPost().getLikeCount()).isZero();
        assertThat(readPost().getCommentCount()).isZero();
    }

    private void saveLike(long id, long memberId) {
        likes.saveAndFlush(CommunityPostLikeEntity.builder()
            .id(id).postId(POST_ID).memberId(memberId).createdAt(NOW).build());
    }

    private CommunityPostEntity readPost() {
        return transaction().execute(status -> posts.findById(POST_ID).orElseThrow());
    }

    private TransactionTemplate transaction() {
        TransactionTemplate template = new TransactionTemplate(transactionManager);
        template.setIsolationLevel(TransactionDefinition.ISOLATION_REPEATABLE_READ);
        template.setTimeout(20);
        return template;
    }

    private static void await(CyclicBarrier barrier) {
        try {
            barrier.await(20, TimeUnit.SECONDS);
        } catch (Exception exception) {
            throw new IllegalStateException("Concurrent transaction barrier failed", exception);
        }
    }

    private static <T> List<T> concurrently(List<Callable<T>> tasks) throws Exception {
        try (var executor = Executors.newFixedThreadPool(tasks.size())) {
            List<Future<T>> futures = new ArrayList<>();
            for (Callable<T> task : tasks) {
                futures.add(executor.submit(task));
            }
            List<T> results = new ArrayList<>();
            for (Future<T> future : futures) {
                results.add(future.get(45, TimeUnit.SECONDS));
            }
            return results;
        }
    }
}
