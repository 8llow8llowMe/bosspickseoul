package com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.request.CommunityReportCreateRequest;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.exception.CommunityExceptionHandler;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.in.CommunityReportWebUseCase;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityCommentLikeRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityCommentRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityPostLikeRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityPostRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityReportRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityTargetMetaRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.application.service.CommunityReportWebFacade;
import com.followfollowme.bosspickseoul.domainlayer.community.application.service.processor.CommunityCommandProcessor;
import com.followfollowme.bosspickseoul.persistence.util.SnowflakeIdGenerator;
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
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/**
 * 신고 등록 본문(#473)의 요청 모양 검증과 사유 코드 거절을 검증한다.
 *
 * <p>요청 모양 규칙(사유 필수 110, ETC 상세 필수 123, 상세 길이 124)은 Bean Validation 이라 컨트롤러 단계에서 Response 봉투로 나가야 한다.
 * 잘못된 사유 코드(018)는 Controller → Facade → Processor 실제 체인에서 나가고 리포지터리를 부르지 않아야 한다.
 */
@ExtendWith(MockitoExtension.class)
class CommunityReportWebControllerReasonCodeTest {

    private static final String REPORTS_PATH = "/api/v1/community/reports";
    private static final long MEMBER_ID = 7L;

    @Mock private CommunityReportWebUseCase communityReportWebUseCase;

    @Mock private SnowflakeIdGenerator snowflakeIdGenerator;
    @Mock private CommunityPostRepositoryPort communityPostRepositoryPort;
    @Mock private CommunityCommentRepositoryPort communityCommentRepositoryPort;
    @Mock private CommunityPostLikeRepositoryPort communityPostLikeRepositoryPort;
    @Mock private CommunityCommentLikeRepositoryPort communityCommentLikeRepositoryPort;
    @Mock private CommunityReportRepositoryPort communityReportRepositoryPort;
    @Mock private CommunityTargetMetaRepositoryPort communityTargetMetaRepositoryPort;

    @BeforeEach
    void setUp() {
        MemberLoginActive principal = MemberLoginActive.builder().memberId(MEMBER_ID).role(SecurityRole.USER).tokenId("test-token").build();
        SecurityContextHolder.getContext().setAuthentication(
            new JwtAuthentication(principal, "", List.of(new SimpleGrantedAuthority(SecurityRole.USER.name()))));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("reasonCode 와 detail 을 그대로 유스케이스에 넘긴다")
    void reasonCodeAndDetail_arePassed() throws Exception {
        perform(mockMvc(communityReportWebUseCase), """
            {"targetKind":"POST","targetId":1001,"reasonCode":"SPAM","detail":"홍보 글입니다"}
            """).andExpect(status().isOk());

        CommunityReportCreateRequest request = captureRequest();
        assertThat(request.reasonCode()).isEqualTo("SPAM");
        assertThat(request.detail()).isEqualTo("홍보 글입니다");
        assertThat(request.reason()).isNull();
    }

    @Test
    @DisplayName("레거시 reason 만 보내도 성공한다 (호환)")
    void legacyReasonOnly_succeeds() throws Exception {
        perform(mockMvc(communityReportWebUseCase), """
            {"targetKind":"COMMENT","targetId":1001,"reason":"[스팸·홍보] 광고"}
            """).andExpect(status().isOk());

        assertThat(captureRequest().reason()).isEqualTo("[스팸·홍보] 광고");
    }

    @Test
    @DisplayName("레거시 「[기타]」 만 보내도 ETC 상세 필수에 걸리지 않는다")
    void legacyEtcWithoutDetail_succeeds() throws Exception {
        perform(mockMvc(communityReportWebUseCase), """
            {"targetKind":"POST","targetId":1001,"reason":"[기타]"}
            """).andExpect(status().isOk());
    }

    @ParameterizedTest
    @ValueSource(strings = {
        "{\"targetKind\":\"POST\",\"targetId\":1001}",
        "{\"targetKind\":\"POST\",\"targetId\":1001,\"reasonCode\":\"  \",\"reason\":\"\"}",
        "{\"targetKind\":\"POST\",\"targetId\":1001,\"detail\":\"상세만 있다\"}"
    })
    @DisplayName("reasonCode 와 reason 이 둘 다 비면 COMMUNITY_110 이다")
    void noReason_isRejectedWith110(String body) throws Exception {
        perform(mockMvc(communityReportWebUseCase), body)
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.dataHeader.resultCode").value("COMMUNITY_110"))
            .andExpect(jsonPath("$.dataHeader.resultMessage.errors[0].field").value("reasonPresent"));

        verifyNoInteractions(communityReportWebUseCase);
    }

    @ParameterizedTest
    @ValueSource(strings = {
        "{\"targetKind\":\"POST\",\"targetId\":1001,\"reasonCode\":\"ETC\"}",
        "{\"targetKind\":\"POST\",\"targetId\":1001,\"reasonCode\":\"etc\",\"detail\":\"   \",\"reason\":\"레거시는 무시\"}"
    })
    @DisplayName("reasonCode 가 ETC(대소문자 무시)인데 detail 이 비면 COMMUNITY_123 이다")
    void etcWithoutDetail_isRejectedWith123(String body) throws Exception {
        perform(mockMvc(communityReportWebUseCase), body)
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.dataHeader.resultCode").value("COMMUNITY_123"))
            .andExpect(jsonPath("$.dataHeader.resultMessage.message").value("기타 사유는 상세 내용을 입력해야 합니다."));

        verifyNoInteractions(communityReportWebUseCase);
    }

    @Test
    @DisplayName("ETC 상세가 제어문자(U+0001)뿐이면 공백과 같이 COMMUNITY_123 이다 — 도메인 정규화(trim)와 같은 기준")
    void etcWithControlCharOnlyDetail_isRejectedWith123() throws Exception {
        // JSON 문자열 이스케이프 「역슬래시 u0001」 — 소스에 이스케이프가 그대로 남도록 나눠 잇는다.
        String controlCharOnly = "\\" + "u0001";
        String body = "{\"targetKind\":\"POST\",\"targetId\":1001,\"reasonCode\":\"ETC\",\"detail\":\"" + controlCharOnly + "\"}";

        perform(mockMvc(communityReportWebUseCase), body)
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.dataHeader.resultCode").value("COMMUNITY_123"));

        verifyNoInteractions(communityReportWebUseCase);
    }

    @Test
    @DisplayName("detail 이 500자를 넘으면 COMMUNITY_124 다 — 500자는 통과한다")
    void detailOver500_isRejectedWith124() throws Exception {
        MockMvc mockMvc = mockMvc(communityReportWebUseCase);

        perform(mockMvc, "{\"targetKind\":\"POST\",\"targetId\":1001,\"reasonCode\":\"ETC\",\"detail\":\"" + "가".repeat(501) + "\"}")
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.dataHeader.resultCode").value("COMMUNITY_124"))
            .andExpect(jsonPath("$.dataHeader.resultMessage.errors[0].field").value("detail"));
        verifyNoInteractions(communityReportWebUseCase);

        perform(mockMvc, "{\"targetKind\":\"POST\",\"targetId\":1001,\"reasonCode\":\"ETC\",\"detail\":\"" + "가".repeat(500) + "\"}")
            .andExpect(status().isOk());
    }

    @Test
    @DisplayName("레거시 reason 의 500자 제한(COMMUNITY_111)은 그대로다")
    void legacyReasonOver500_isRejectedWith111() throws Exception {
        perform(mockMvc(communityReportWebUseCase), "{\"targetKind\":\"POST\",\"targetId\":1001,\"reason\":\"" + "가".repeat(501) + "\"}")
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.dataHeader.resultCode").value("COMMUNITY_111"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"WRONG", "스팸·홍보"})
    @DisplayName("잘못된 reasonCode 는 실제 체인에서 400 COMMUNITY_018 이 Response 봉투로 나가고 리포지터리를 부르지 않는다")
    void invalidReasonCode_isRejectedWith018(String reasonCode) throws Exception {
        CommunityCommandProcessor processor = new CommunityCommandProcessor(
            snowflakeIdGenerator, communityPostRepositoryPort, communityCommentRepositoryPort, communityPostLikeRepositoryPort,
            communityCommentLikeRepositoryPort, communityReportRepositoryPort, communityTargetMetaRepositoryPort);

        perform(mockMvc(new CommunityReportWebFacade(processor)),
            "{\"targetKind\":\"POST\",\"targetId\":1001,\"reasonCode\":\"" + reasonCode + "\",\"reason\":\"[스팸·홍보] 광고\"}")
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.dataHeader.success").value(false))
            .andExpect(jsonPath("$.dataHeader.resultCode").value("COMMUNITY_018"))
            .andExpect(jsonPath("$.dataHeader.resultMessage").value("유효하지 않은 신고 사유 코드입니다."));

        verifyNoInteractions(communityPostRepositoryPort, communityCommentRepositoryPort, communityReportRepositoryPort, snowflakeIdGenerator);
    }

    private CommunityReportCreateRequest captureRequest() {
        ArgumentCaptor<CommunityReportCreateRequest> captor = ArgumentCaptor.forClass(CommunityReportCreateRequest.class);
        verify(communityReportWebUseCase).createReport(eq(MEMBER_ID), captor.capture());
        return captor.getValue();
    }

    private static ResultActions perform(MockMvc mockMvc, String body) throws Exception {
        return mockMvc.perform(post(REPORTS_PATH).contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private static MockMvc mockMvc(CommunityReportWebUseCase useCase) {
        return MockMvcBuilders.standaloneSetup(new CommunityReportWebController(useCase))
            .setControllerAdvice(new CommunityExceptionHandler())
            .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver())
            .build();
    }
}
