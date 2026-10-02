package com.followfollowme.bosspickseoul.domainlayer.community.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.community.application.command.CreatePostCommand;
import com.followfollowme.bosspickseoul.domainlayer.community.application.command.UpdatePostCommand;
import com.followfollowme.bosspickseoul.domainlayer.community.application.exception.CommunityErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.community.application.exception.CommunityException;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityCommentLikeRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityCommentRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityPostLikeRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityPostRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityReportRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityTargetMetaRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityPostCategory;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityPostStatus;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityTargetType;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityPost;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityTargetMeta;
import com.followfollowme.bosspickseoul.persistence.util.SnowflakeIdGenerator;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * 게시글 말머리(#470)의 작성·수정 경로를 검증한다.
 *
 * <p>작성은 null/blank 면 말머리 없음, 값이 있으면 enum 으로 파싱해 저장한다. 수정은 전체 교체라 null 이면 말머리를 지우며,
 * 엔티티 전체 저장이 아니라 조건부 UPDATE({@code updateContentIfActive})로 넘겨 동시 카운터 변경을 덮지 않는다.
 */
@ExtendWith(MockitoExtension.class)
class CommunityCommandProcessorPostCategoryTest {

    private static final long POST_ID = 10L;
    private static final long MEMBER_ID = 30L;
    private static final LocalDateTime NOW = LocalDateTime.of(2026, 10, 2, 12, 0);

    @Mock private SnowflakeIdGenerator snowflakeIdGenerator;
    @Mock private CommunityPostRepositoryPort communityPostRepositoryPort;
    @Mock private CommunityCommentRepositoryPort communityCommentRepositoryPort;
    @Mock private CommunityPostLikeRepositoryPort communityPostLikeRepositoryPort;
    @Mock private CommunityCommentLikeRepositoryPort communityCommentLikeRepositoryPort;
    @Mock private CommunityReportRepositoryPort communityReportRepositoryPort;
    @Mock private CommunityTargetMetaRepositoryPort communityTargetMetaRepositoryPort;

    @InjectMocks private CommunityCommandProcessor processor;

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   "})
    @DisplayName("작성 시 말머리가 null/blank 면 말머리 없음(null)으로 저장한다")
    void createPost_blankCategory_savesNull(String category) {
        stubCreate();

        processor.createPost(MEMBER_ID, createCommand(category));

        assertThat(captureSaved().category()).isNull();
    }

    @Test
    @DisplayName("작성 시 말머리 값은 대소문자를 가리지 않고 enum 으로 파싱해 저장한다")
    void createPost_category_isParsed() {
        stubCreate();

        processor.createPost(MEMBER_ID, createCommand("question"));

        assertThat(captureSaved().category()).isEqualTo(CommunityPostCategory.QUESTION);
    }

    @Test
    @DisplayName("작성 시 잘못된 말머리는 COMMUNITY_017 이며 대상 실조회·저장을 하지 않는다")
    void createPost_invalidCategory_rejectedBeforeTargetLookup() {
        assertThatThrownBy(() -> processor.createPost(MEMBER_ID, createCommand("WRONG")))
            .isInstanceOf(CommunityException.class)
            .extracting(exception -> ((CommunityException) exception).getErrorCode())
            .isEqualTo(CommunityErrorCode.INVALID_POST_CATEGORY);

        verifyNoInteractions(communityTargetMetaRepositoryPort, communityPostRepositoryPort);
    }

    @Test
    @DisplayName("수정 시 말머리 값을 조건부 UPDATE 로 넘긴다")
    void updatePost_category_isPassedToConditionalUpdate() {
        CommunityPost updated = post(CommunityPostCategory.TOGETHER);
        when(communityPostRepositoryPort.updateContentIfActive(
            eq(POST_ID), eq(MEMBER_ID), eq("title"), eq("content"), eq(CommunityPostCategory.TOGETHER), any()))
            .thenReturn(Optional.of(updated));

        CommunityPost result = processor.updatePost(MEMBER_ID, post(CommunityPostCategory.QUESTION), updateCommand("TOGETHER"));

        assertThat(result.category()).isEqualTo(CommunityPostCategory.TOGETHER);
        verify(communityPostRepositoryPort, never()).save(any());
    }

    @ParameterizedTest
    @NullAndEmptySource
    @DisplayName("수정은 전체 교체 — 말머리를 보내지 않으면 null 로 넘겨 기존 말머리를 지운다")
    void updatePost_missingCategory_clearsCategory(String category) {
        when(communityPostRepositoryPort.updateContentIfActive(
            eq(POST_ID), eq(MEMBER_ID), eq("title"), eq("content"), isNull(), any()))
            .thenReturn(Optional.of(post(null)));

        CommunityPost result = processor.updatePost(MEMBER_ID, post(CommunityPostCategory.QUESTION), updateCommand(category));

        assertThat(result.category()).isNull();
    }

    @Test
    @DisplayName("수정 시 잘못된 말머리는 COMMUNITY_017 이며 UPDATE 하지 않는다")
    void updatePost_invalidCategory_rejectedWithoutUpdate() {
        assertThatThrownBy(() -> processor.updatePost(MEMBER_ID, post(null), updateCommand("WRONG")))
            .isInstanceOf(CommunityException.class)
            .extracting(exception -> ((CommunityException) exception).getErrorCode())
            .isEqualTo(CommunityErrorCode.INVALID_POST_CATEGORY);

        verifyNoInteractions(communityPostRepositoryPort);
    }

    @Test
    @DisplayName("남의 글 수정은 말머리 값과 무관하게 권한 오류(COMMUNITY_007)가 먼저다")
    void updatePost_notOwner_isForbiddenBeforeCategoryValidation() {
        assertThatThrownBy(() -> processor.updatePost(MEMBER_ID + 1, post(null), updateCommand("WRONG")))
            .isInstanceOf(CommunityException.class)
            .extracting(exception -> ((CommunityException) exception).getErrorCode())
            .isEqualTo(CommunityErrorCode.FORBIDDEN_POST_ACCESS);
    }

    private void stubCreate() {
        when(communityTargetMetaRepositoryPort.findTargetMeta(CommunityTargetType.COMMERCIAL, "C1"))
            .thenReturn(Optional.of(new CommunityTargetMeta(CommunityTargetType.COMMERCIAL, "C1", "target")));
        when(snowflakeIdGenerator.generateId()).thenReturn(POST_ID);
        when(communityPostRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    private CommunityPost captureSaved() {
        ArgumentCaptor<CommunityPost> captor = ArgumentCaptor.forClass(CommunityPost.class);
        verify(communityPostRepositoryPort).save(captor.capture());
        return captor.getValue();
    }

    private static CreatePostCommand createCommand(String category) {
        return new CreatePostCommand("COMMERCIAL", "C1", "title", "content", category, List.of(), null, null, null, null);
    }

    private static UpdatePostCommand updateCommand(String category) {
        return new UpdatePostCommand(" title ", " content ", category, List.of());
    }

    private static CommunityPost post(CommunityPostCategory category) {
        return new CommunityPost(
            POST_ID, MEMBER_ID, CommunityTargetType.COMMERCIAL, "C1", "target", "title", "content", category,
            null, null, null, null,
            CommunityPostStatus.ACTIVE, 0L, 0L, 0L, NOW, NOW
        );
    }
}
