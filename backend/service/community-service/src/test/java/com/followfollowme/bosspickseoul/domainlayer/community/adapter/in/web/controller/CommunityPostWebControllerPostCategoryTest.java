package com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.exception.CommunityExceptionHandler;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.presenter.CommunityPostPresenter;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.in.CommunityPostWebUseCase;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityCommentRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityPostRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityTargetMetaRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.application.service.CommunityPostWebFacade;
import com.followfollowme.bosspickseoul.domainlayer.community.application.service.processor.CommunityCommandProcessor;
import com.followfollowme.bosspickseoul.domainlayer.community.application.service.processor.CommunityPostImageProcessor;
import com.followfollowme.bosspickseoul.domainlayer.community.application.service.processor.CommunityQueryProcessor;
import com.followfollowme.bosspickseoul.domainlayer.community.application.service.processor.CommunityViewerLikeProcessor;
import com.followfollowme.bosspickseoul.domainlayer.community.application.service.processor.CommunityWriterSummaryProcessor;
import com.followfollowme.bosspickseoul.storage.client.ObjectStorageClient;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/**
 * 목록 말머리 필터(#470)의 바인딩과 거절을 검증한다.
 *
 * <p>생략하면 필터 없음(null), 값은 문자열 그대로 유스케이스에 넘긴다(대상 필터 targetType 과 같은 결 — 파싱은 Processor).
 * 잘못된 값은 Controller → Facade → Processor 실제 체인으로 400 COMMUNITY_017 이 Response 봉투로 나가고 리포지터리를 부르지 않아야 한다.
 */
@ExtendWith(MockitoExtension.class)
class CommunityPostWebControllerPostCategoryTest {

    private static final String POSTS_PATH = "/api/v1/community/posts";

    @Mock private CommunityPostWebUseCase communityPostWebUseCase;

    @Mock private CommunityPostRepositoryPort communityPostRepositoryPort;
    @Mock private CommunityCommentRepositoryPort communityCommentRepositoryPort;
    @Mock private CommunityTargetMetaRepositoryPort communityTargetMetaRepositoryPort;
    @Mock private CommunityCommandProcessor communityCommandProcessor;
    @Mock private CommunityPostImageProcessor communityPostImageProcessor;
    @Mock private CommunityWriterSummaryProcessor communityWriterSummaryProcessor;
    @Mock private CommunityViewerLikeProcessor communityViewerLikeProcessor;
    @Mock private ObjectStorageClient objectStorageClient;

    @Test
    @DisplayName("category 를 생략하면 필터 없이 null 로 넘긴다")
    void omittedCategory_isNull() throws Exception {
        mockMvc(communityPostWebUseCase).perform(get(POSTS_PATH)).andExpect(status().isOk());

        verify(communityPostWebUseCase).getPosts(any(), any(), any(), any(), any(), any(), isNull(), anyLong(), anyLong(), anyInt());
    }

    @Test
    @DisplayName("category 를 주면 대상 필터·정렬·기간과 함께 그대로 넘긴다")
    void explicitCategory_isPassedWithOtherFilters() throws Exception {
        mockMvc(communityPostWebUseCase).perform(get(POSTS_PATH)
                .param("category", "QUESTION").param("targetType", "COMMERCIAL").param("targetCode", "3110008")
                .param("sortType", "POPULAR").param("period", "ALL").param("lastPostId", "99").param("lastLikeCount", "5"))
            .andExpect(status().isOk());

        verify(communityPostWebUseCase).getPosts(
            any(), any(), any(), any(), eq("COMMERCIAL"), eq("3110008"), eq("QUESTION"), eq(99L), eq(5L), anyInt());
    }

    @ParameterizedTest
    @ValueSource(strings = {"WRONG", "질문"})
    @DisplayName("잘못된 category 는 실제 체인에서 400 COMMUNITY_017 이고 리포지터리를 부르지 않는다")
    void invalidCategory_isRejectedWithCommunity017(String category) throws Exception {
        CommunityPostWebFacade facade = new CommunityPostWebFacade(
            new CommunityQueryProcessor(communityPostRepositoryPort, communityCommentRepositoryPort, communityTargetMetaRepositoryPort),
            communityCommandProcessor, new CommunityPostPresenter(objectStorageClient),
            communityPostImageProcessor, communityWriterSummaryProcessor, communityViewerLikeProcessor, objectStorageClient);

        mockMvc(facade).perform(get(POSTS_PATH).param("category", category))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.dataHeader.resultCode").value("COMMUNITY_017"));

        verifyNoInteractions(communityPostRepositoryPort, communityTargetMetaRepositoryPort);
    }

    private static MockMvc mockMvc(CommunityPostWebUseCase useCase) {
        return MockMvcBuilders.standaloneSetup(new CommunityPostWebController(useCase))
            .setControllerAdvice(new CommunityExceptionHandler())
            .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver())
            .build();
    }
}
