package com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.exception.CommunityExceptionHandler;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.in.CommunityPostWebUseCase;
import com.followfollowme.bosspickseoul.security.common.dto.MemberLoginActive;
import com.followfollowme.bosspickseoul.security.common.enums.SecurityRole;
import com.followfollowme.bosspickseoul.security.common.jwt.JwtAuthentication;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/**
 * 공개 조회 3종(목록·검색·상세)의 선택 인증을 검증한다.
 *
 * <p>{@code @PreAuthorize} 없이 열려 있어야 하고, 토큰이 없으면 조회자를 null 로, 있으면 JWT claim 의 memberId 로
 * 유스케이스에 넘겨야 한다. 클라이언트가 보낸 헤더로 조회자를 정하지 않는다 (api-design-guide §6).
 */
@ExtendWith(MockitoExtension.class)
class CommunityPostWebControllerOptionalAuthTest {

    private static final long VIEWER_ID = 7L;
    private static final long POST_ID = 1L;

    @Mock
    private CommunityPostWebUseCase communityPostWebUseCase;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new CommunityPostWebController(communityPostWebUseCase))
            .setControllerAdvice(new CommunityExceptionHandler())
            .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver())
            .build();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("토큰 없이 목록·검색·상세를 부르면 조회자를 null 로 넘긴다")
    void anonymous_passesNullViewer() throws Exception {
        mockMvc.perform(get("/api/v1/community/posts")).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/community/posts/search").param("keyword", "카페")).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/community/posts/{postId}", POST_ID)).andExpect(status().isOk());

        verify(communityPostWebUseCase).getPosts(isNull(), any(), any(), any(), any(), anyLong(), anyLong(), anyInt());
        verify(communityPostWebUseCase).searchPosts(isNull(), eq("카페"), any(), any(), anyLong(), anyLong(), anyInt());
        verify(communityPostWebUseCase).getPost(isNull(), eq(POST_ID));
    }

    @Test
    @DisplayName("로그인 상태로 목록·검색·상세를 부르면 JWT 의 memberId 를 조회자로 넘긴다")
    void authenticated_passesPrincipalMemberId() throws Exception {
        authenticate();

        mockMvc.perform(get("/api/v1/community/posts")).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/community/posts/search").param("keyword", "카페")).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/community/posts/{postId}", POST_ID)).andExpect(status().isOk());

        verify(communityPostWebUseCase).getPosts(eq(VIEWER_ID), any(), any(), any(), any(), anyLong(), anyLong(), anyInt());
        verify(communityPostWebUseCase).searchPosts(eq(VIEWER_ID), eq("카페"), any(), any(), anyLong(), anyLong(), anyInt());
        verify(communityPostWebUseCase).getPost(eq(VIEWER_ID), eq(POST_ID));
    }

    private static void authenticate() {
        MemberLoginActive principal = MemberLoginActive.builder()
            .memberId(VIEWER_ID)
            .role(SecurityRole.USER)
            .tokenId("test-token")
            .build();
        SecurityContextHolder.getContext().setAuthentication(
            new JwtAuthentication(principal, "", List.of(new SimpleGrantedAuthority(SecurityRole.USER.name())))
        );
    }
}
