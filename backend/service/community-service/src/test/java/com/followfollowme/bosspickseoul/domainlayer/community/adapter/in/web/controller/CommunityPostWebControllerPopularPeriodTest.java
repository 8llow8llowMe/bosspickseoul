package com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.exception.CommunityExceptionHandler;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.in.CommunityPostWebUseCase;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityPopularPeriod;
import com.followfollowme.bosspickseoul.security.common.dto.MemberLoginActive;
import com.followfollowme.bosspickseoul.security.common.enums.SecurityRole;
import com.followfollowme.bosspickseoul.security.common.jwt.JwtAuthentication;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/**
 * 목록 3종(목록·검색·좋아요 목록)의 인기순 기간 파라미터 바인딩을 검증한다.
 *
 * <p>생략하면 기존 동작(최근 7일)을 지키도록 WEEK 로 바인딩돼야 하고, 잘못된 값은 sortType 과 같은 경로
 * (파라미터 형식 오류 COMMUNITY_117)로 400 이 돼야 한다 — 핸들러가 없으면 Spring 기본 400 이 Response 봉투 없이 나간다.
 */
@ExtendWith(MockitoExtension.class)
class CommunityPostWebControllerPopularPeriodTest {

    private static final String PARAMETER_TYPE_INVALID_CODE = "COMMUNITY_117";
    private static final long MEMBER_ID = 7L;

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
    @DisplayName("period 를 생략하면 목록·검색·좋아요 목록 모두 WEEK 로 바인딩한다")
    void omittedPeriod_defaultsToWeek() throws Exception {
        authenticate();

        mockMvc.perform(get("/api/v1/community/posts").param("sortType", "POPULAR")).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/community/posts/search").param("sortType", "POPULAR")).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/community/posts/liked").param("sortType", "POPULAR")).andExpect(status().isOk());

        CommunityPopularPeriod week = CommunityPopularPeriod.WEEK;
        verify(communityPostWebUseCase).getPosts(any(), any(), any(), eq(week), any(), any(), any(), anyLong(), anyLong(), anyInt());
        verify(communityPostWebUseCase).searchPosts(any(), any(), any(), any(), eq(week), anyLong(), anyLong(), anyInt());
        verify(communityPostWebUseCase).getLikedPosts(eq(MEMBER_ID), any(), any(), eq(week), anyLong(), anyLong(), anyInt());
    }

    @Test
    @DisplayName("period 를 주면 그 값으로 바인딩한다")
    void explicitPeriod_isBound() throws Exception {
        authenticate();

        mockMvc.perform(get("/api/v1/community/posts").param("sortType", "POPULAR").param("period", "ALL"))
            .andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/community/posts/search").param("sortType", "POPULAR").param("period", "MONTH"))
            .andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/community/posts/liked").param("sortType", "POPULAR").param("period", "ALL"))
            .andExpect(status().isOk());

        verify(communityPostWebUseCase)
            .getPosts(any(), any(), any(), eq(CommunityPopularPeriod.ALL), any(), any(), any(), anyLong(), anyLong(), anyInt());
        verify(communityPostWebUseCase)
            .searchPosts(any(), any(), any(), any(), eq(CommunityPopularPeriod.MONTH), anyLong(), anyLong(), anyInt());
        verify(communityPostWebUseCase)
            .getLikedPosts(eq(MEMBER_ID), any(), any(), eq(CommunityPopularPeriod.ALL), anyLong(), anyLong(), anyInt());
    }

    @ParameterizedTest
    @CsvSource({
        "/api/v1/community/posts, period, YEAR",
        "/api/v1/community/posts/search, period, YEAR",
        "/api/v1/community/posts/liked, period, YEAR",
        "/api/v1/community/posts, sortType, WRONG"
    })
    @DisplayName("잘못된 period 는 sortType 과 같은 파라미터 형식 오류 COMMUNITY_117 로 거절하고 유스케이스를 부르지 않는다")
    void invalidPeriod_isRejectedLikeSortType(String path, String parameter, String value) throws Exception {
        mockMvc.perform(get(path).param(parameter, value))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.dataHeader.resultCode").value(PARAMETER_TYPE_INVALID_CODE));

        verifyNoInteractions(communityPostWebUseCase);
    }

    private static void authenticate() {
        MemberLoginActive principal = MemberLoginActive.builder()
            .memberId(MEMBER_ID)
            .role(SecurityRole.USER)
            .tokenId("test-token")
            .build();
        SecurityContextHolder.getContext().setAuthentication(
            new JwtAuthentication(principal, "", List.of(new SimpleGrantedAuthority(SecurityRole.USER.name())))
        );
    }
}
