package com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.exception;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.controller.CommunityPostWebController;
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
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/**
 * 좋아요/신고는 조회로 중복을 거르지만 동시 요청은 검사를 둘 다 통과할 수 있다.
 * 마지막 방어선인 DB 유니크 제약이 깨졌을 때 그대로 500 으로 새지 않고
 * 의미 있는 409 로 내려가는지 검증한다.
 */
@ExtendWith(MockitoExtension.class)
class CommunityUniqueViolationHandlerTest {

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
        MemberLoginActive principal = MemberLoginActive.builder()
            .memberId(MEMBER_ID)
            .role(SecurityRole.USER)
            .tokenId("test-token")
            .build();
        SecurityContextHolder.getContext().setAuthentication(
            new JwtAuthentication(principal, "", List.of(new SimpleGrantedAuthority(SecurityRole.USER.name())))
        );
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("좋아요 유니크 제약 위반은 COMMUNITY_013 409 로 변환된다")
    void postLikeUniqueViolation_returns409() throws Exception {
        when(communityPostWebUseCase.togglePostLike(anyLong(), anyLong()))
            .thenThrow(uniqueViolation("uk_community_post_like_post_id_member_id"));

        mockMvc.perform(post("/api/v1/community/posts/{postId}/likes", 1L))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.dataHeader.resultCode").value("COMMUNITY_013"));
    }

    @Test
    @DisplayName("신고 유니크 제약 위반은 기존 중복 신고 코드(COMMUNITY_009) 409 로 변환된다")
    void reportUniqueViolation_returns409() throws Exception {
        when(communityPostWebUseCase.togglePostLike(anyLong(), anyLong()))
            .thenThrow(uniqueViolation("uk_community_report_target_kind_target_id_reporter_member_id"));

        mockMvc.perform(post("/api/v1/community/posts/{postId}/likes", 1L))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.dataHeader.resultCode").value("COMMUNITY_009"));
    }

    @Test
    @DisplayName("관련 없는 제약 위반은 중복으로 오인시키지 않고 그대로 전파한다")
    void unrelatedViolation_isRethrown() {
        when(communityPostWebUseCase.togglePostLike(anyLong(), anyLong()))
            .thenThrow(uniqueViolation("fk_community_post_member"));

        assertThatThrownBy(() -> mockMvc.perform(post("/api/v1/community/posts/{postId}/likes", 1L)))
            .hasCauseInstanceOf(DataIntegrityViolationException.class);
    }

    private static DataIntegrityViolationException uniqueViolation(String constraintName) {
        return new DataIntegrityViolationException(
            "could not execute statement",
            new RuntimeException("Duplicate entry for key '" + constraintName + "'")
        );
    }
}
