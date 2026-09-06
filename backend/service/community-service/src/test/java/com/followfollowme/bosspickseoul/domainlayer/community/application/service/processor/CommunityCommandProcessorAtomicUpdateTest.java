package com.followfollowme.bosspickseoul.domainlayer.community.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.community.application.exception.CommunityErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.community.application.exception.CommunityException;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityCommentLikeRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityCommentRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityPostLikeRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityPostRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityReportRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityTargetMetaRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityCommentStatus;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityPostStatus;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityTargetType;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityComment;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityPost;
import com.followfollowme.bosspickseoul.persistence.util.SnowflakeIdGenerator;
import com.followfollowme.bosspickseoul.domainlayer.community.application.info.CommunityLikeToggleResult;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.OptionalLong;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CommunityCommandProcessorAtomicUpdateTest {

    private static final long POST_ID = 10L;
    private static final long COMMENT_ID = 20L;
    private static final long MEMBER_ID = 30L;
    private static final LocalDateTime NOW = LocalDateTime.of(2026, 9, 6, 12, 0);

    @Mock private SnowflakeIdGenerator snowflakeIdGenerator;
    @Mock private CommunityPostRepositoryPort communityPostRepositoryPort;
    @Mock private CommunityCommentRepositoryPort communityCommentRepositoryPort;
    @Mock private CommunityPostLikeRepositoryPort communityPostLikeRepositoryPort;
    @Mock private CommunityCommentLikeRepositoryPort communityCommentLikeRepositoryPort;
    @Mock private CommunityReportRepositoryPort communityReportRepositoryPort;
    @Mock private CommunityTargetMetaRepositoryPort communityTargetMetaRepositoryPort;

    @InjectMocks private CommunityCommandProcessor processor;

    @Test
    void incrementViewCountReturnsTheDatabaseUpdateResult() {
        CommunityPost stalePost = post(3L, 4L, 5L);
        CommunityPost updatedPost = post(3L, 4L, 6L);
        when(communityPostRepositoryPort.incrementViewCountIfActive(POST_ID))
            .thenReturn(Optional.of(updatedPost));

        CommunityPost result = processor.incrementViewCount(stalePost);

        assertThat(result.viewCount()).isEqualTo(6L);
        verify(communityPostRepositoryPort, never()).save(stalePost);
    }

    @Test
    void togglePostLikeUsesAtomicCounterResult() {
        CommunityPost stalePost = post(7L, 4L, 5L);
        when(communityPostLikeRepositoryPort.exists(POST_ID, MEMBER_ID)).thenReturn(false);
        when(snowflakeIdGenerator.generateId()).thenReturn(100L);
        when(communityPostRepositoryPort.incrementLikeCountIfActive(POST_ID))
            .thenReturn(OptionalLong.of(9L));

        CommunityLikeToggleResult result = processor.togglePostLike(MEMBER_ID, stalePost);

        assertThat(result).isEqualTo(new CommunityLikeToggleResult(true, 9L));
        verify(communityPostRepositoryPort, never()).save(stalePost);
    }

    @Test
    void repeatedCommentDeletionDoesNotDecrementPostCountAgain() {
        CommunityComment comment = comment(CommunityCommentStatus.ACTIVE);
        when(communityCommentRepositoryPort.deleteIfActive(COMMENT_ID)).thenReturn(false);

        processor.deleteComment(MEMBER_ID, comment);

        verify(communityPostRepositoryPort, never()).decrementCommentCountIfActive(POST_ID);
    }

    @Test
    void concurrentPostUnlikeDoesNotDecrementAnotherMembersLike() {
        when(communityPostLikeRepositoryPort.exists(POST_ID, MEMBER_ID)).thenReturn(true);
        when(communityPostLikeRepositoryPort.delete(POST_ID, MEMBER_ID)).thenReturn(false);

        assertThatThrownBy(() -> processor.togglePostLike(MEMBER_ID, post(2L, 0L, 0L)))
            .isInstanceOf(CommunityException.class)
            .extracting(exception -> ((CommunityException) exception).getErrorCode())
            .isEqualTo(CommunityErrorCode.CONCURRENT_REACTION);

        verify(communityPostRepositoryPort, never()).decrementLikeCountIfActive(POST_ID);
    }

    @Test
    void concurrentCommentUnlikeDoesNotDecrementAnotherMembersLike() {
        when(communityCommentLikeRepositoryPort.exists(COMMENT_ID, MEMBER_ID)).thenReturn(true);
        when(communityCommentLikeRepositoryPort.delete(COMMENT_ID, MEMBER_ID)).thenReturn(false);

        assertThatThrownBy(() -> processor.toggleCommentLike(MEMBER_ID, comment(CommunityCommentStatus.ACTIVE)))
            .isInstanceOf(CommunityException.class)
            .extracting(exception -> ((CommunityException) exception).getErrorCode())
            .isEqualTo(CommunityErrorCode.CONCURRENT_REACTION);

        verify(communityCommentRepositoryPort, never()).decrementLikeCountIfActive(COMMENT_ID);
    }

    @Test
    void successfulPostUnlikeReturnsDatabaseCount() {
        when(communityPostLikeRepositoryPort.exists(POST_ID, MEMBER_ID)).thenReturn(true);
        when(communityPostLikeRepositoryPort.delete(POST_ID, MEMBER_ID)).thenReturn(true);
        when(communityPostRepositoryPort.decrementLikeCountIfActive(POST_ID)).thenReturn(OptionalLong.of(8L));

        assertThat(processor.togglePostLike(MEMBER_ID, post(2L, 0L, 0L)))
            .isEqualTo(new CommunityLikeToggleResult(false, 8L));
    }

    @Test
    void successfulCommentUnlikeReturnsDatabaseCount() {
        when(communityCommentLikeRepositoryPort.exists(COMMENT_ID, MEMBER_ID)).thenReturn(true);
        when(communityCommentLikeRepositoryPort.delete(COMMENT_ID, MEMBER_ID)).thenReturn(true);
        when(communityCommentRepositoryPort.decrementLikeCountIfActive(COMMENT_ID)).thenReturn(OptionalLong.of(4L));

        assertThat(processor.toggleCommentLike(MEMBER_ID, comment(CommunityCommentStatus.ACTIVE)))
            .isEqualTo(new CommunityLikeToggleResult(false, 4L));
    }

    @Test
    void viewOfConcurrentlyDeletedPostReturnsNotFound() {
        when(communityPostRepositoryPort.incrementViewCountIfActive(POST_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> processor.incrementViewCount(post(0L, 0L, 0L)))
            .isInstanceOf(CommunityException.class)
            .extracting(exception -> ((CommunityException) exception).getErrorCode())
            .isEqualTo(CommunityErrorCode.POST_NOT_FOUND);
    }

    @Test
    void likeOfConcurrentlyDeletedCommentReturnsNotFound() {
        when(communityCommentRepositoryPort.incrementLikeCountIfActive(COMMENT_ID)).thenReturn(OptionalLong.empty());

        assertThatThrownBy(() -> processor.toggleCommentLike(MEMBER_ID, comment(CommunityCommentStatus.ACTIVE)))
            .isInstanceOf(CommunityException.class)
            .extracting(exception -> ((CommunityException) exception).getErrorCode())
            .isEqualTo(CommunityErrorCode.COMMENT_NOT_FOUND);
    }
    private CommunityPost post(long likeCount, long commentCount, long viewCount) {
        return new CommunityPost(
            POST_ID, MEMBER_ID, CommunityTargetType.COMMERCIAL, "C1", "target", "title", "content",
            CommunityPostStatus.ACTIVE, likeCount, commentCount, viewCount, NOW, NOW
        );
    }

    private CommunityComment comment(CommunityCommentStatus status) {
        return new CommunityComment(COMMENT_ID, POST_ID, MEMBER_ID, null, "content", status, 0L, NOW, NOW);
    }
}
