package com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.controller;

import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.exception.CommunityExceptionHandler;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.presenter.ModerationPresenter;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.in.ModerationWebUseCase;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityCommentRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityPostRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityReportRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.application.service.ModerationWebFacade;
import com.followfollowme.bosspickseoul.domainlayer.community.application.service.processor.ModerationCommandProcessor;
import com.followfollowme.bosspickseoul.domainlayer.community.application.service.processor.ModerationQueryProcessor;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityReportReasonCode;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityReportTargetKind;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.ReportStatus;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityReport;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/**
 * 모더레이션 목록의 사유 코드 필터(#473)를 검증한다.
 *
 * <p>값은 문자열 그대로 유스케이스에 넘기고(파싱은 Processor), 실제 체인에서 생략·blank 는 전체 PENDING, 값은 그 사유만 조회한다.
 * 잘못된 값은 400 COMMUNITY_018 이 Response 봉투로 나가고 리포지터리를 부르지 않아야 한다.
 */
@ExtendWith(MockitoExtension.class)
class ModerationWebControllerReasonCodeTest {

    private static final String REPORTS_PATH = "/api/v1/moderation/reports";
    private static final LocalDateTime NOW = LocalDateTime.of(2026, 10, 2, 12, 0);

    @Mock private ModerationWebUseCase moderationWebUseCase;

    @Mock private CommunityReportRepositoryPort communityReportRepositoryPort;
    @Mock private CommunityPostRepositoryPort communityPostRepositoryPort;
    @Mock private CommunityCommentRepositoryPort communityCommentRepositoryPort;
    @Mock private ModerationCommandProcessor moderationCommandProcessor;

    @Test
    @DisplayName("reasonCode 를 생략하면 null, 주면 문자열 그대로 넘긴다")
    void binding() throws Exception {
        MockMvc mockMvc = mockMvc(moderationWebUseCase);

        mockMvc.perform(get(REPORTS_PATH)).andExpect(status().isOk());
        mockMvc.perform(get(REPORTS_PATH).param("reasonCode", "spam")).andExpect(status().isOk());

        verify(moderationWebUseCase).getPendingReports(isNull());
        verify(moderationWebUseCase).getPendingReports("spam");
    }

    @Test
    @DisplayName("실제 체인 — 생략하면 PENDING 전체, 값이 있으면 그 사유만 조회하고 항목에 reasonCode metadata·detail 을 싣는다")
    void realChain_filtersAndMaps() throws Exception {
        MockMvc mockMvc = mockMvc(realFacade());
        when(communityReportRepositoryPort.findPendingReports()).thenReturn(List.of());
        when(communityReportRepositoryPort.findPendingReportsByReasonCode(CommunityReportReasonCode.PRIVACY))
            .thenReturn(List.of(report(1L, CommunityReportReasonCode.PRIVACY, "전화번호 노출")));
        when(communityPostRepositoryPort.findAllByIds(Set.of(900L))).thenReturn(List.of());
        when(communityCommentRepositoryPort.findAllByIds(Set.of())).thenReturn(List.of());

        mockMvc.perform(get(REPORTS_PATH).param("reasonCode", " "))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.dataBody.reports").isEmpty());
        mockMvc.perform(get(REPORTS_PATH).param("reasonCode", "privacy"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.dataBody.reports[0].reportId").value("1"))
            .andExpect(jsonPath("$.dataBody.reports[0].reasonCode.code").value("PRIVACY"))
            .andExpect(jsonPath("$.dataBody.reports[0].reasonCode.name").value("개인정보 노출"))
            .andExpect(jsonPath("$.dataBody.reports[0].detail").value("전화번호 노출"));

        verify(communityReportRepositoryPort).findPendingReports();
        verify(communityReportRepositoryPort).findPendingReportsByReasonCode(CommunityReportReasonCode.PRIVACY);
    }

    @ParameterizedTest
    @ValueSource(strings = {"WRONG", "개인정보 노출"})
    @DisplayName("잘못된 reasonCode 는 실제 체인에서 400 COMMUNITY_018 이고 리포지터리를 부르지 않는다")
    void invalidReasonCode_isRejectedWith018(String reasonCode) throws Exception {
        mockMvc(realFacade()).perform(get(REPORTS_PATH).param("reasonCode", reasonCode))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.dataHeader.resultCode").value("COMMUNITY_018"));

        verifyNoInteractions(communityReportRepositoryPort, communityPostRepositoryPort, communityCommentRepositoryPort);
    }

    private ModerationWebFacade realFacade() {
        return new ModerationWebFacade(
            new ModerationQueryProcessor(communityReportRepositoryPort, communityPostRepositoryPort, communityCommentRepositoryPort),
            moderationCommandProcessor, new ModerationPresenter());
    }

    private static CommunityReport report(long id, CommunityReportReasonCode reasonCode, String detail) {
        return new CommunityReport(
            id, CommunityReportTargetKind.POST, 900L, 30L, detail, reasonCode, detail, NOW, ReportStatus.PENDING, null, null);
    }

    private static MockMvc mockMvc(ModerationWebUseCase useCase) {
        return MockMvcBuilders.standaloneSetup(new ModerationWebController(useCase))
            .setControllerAdvice(new CommunityExceptionHandler())
            .build();
    }
}
