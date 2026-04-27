package com.followfollowme.nowdoboss.domainlayer.aireport.adapter.in.web.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.in.web.dto.response.AiReportJobStatusResponse;
import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.in.web.dto.response.AiReportSubmissionResponse;
import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.in.web.dto.response.CommercialAiReportResponse;
import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.in.web.exception.AiReportExceptionHandler;
import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.in.web.presenter.AiReportPresenter;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.exception.AiReportErrorCode;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.exception.AiReportException;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.AiReportJobInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.AiReportSubmissionInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.AiReportSubmissionInfo.AiReportSubmissionStatus;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.CommercialAiReportInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.in.AiReportWebUseCase;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.AiReportJobStatus;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.AiReportJobType;
import com.followfollowme.nowdoboss.security.common.dto.MemberLoginActive;
import com.followfollowme.nowdoboss.security.common.enums.SecurityRole;
import com.followfollowme.nowdoboss.security.common.jwt.JwtAuthentication;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@ExtendWith(MockitoExtension.class)
class AiReportWebControllerTest {

    @Mock
    private AiReportWebUseCase aiReportWebUseCase;

    @Mock
    private AiReportPresenter aiReportPresenter;

    private MockMvc mockMvc;

    private static final long MEMBER_ID = 7L;

    @BeforeEach
    void setUp() {
        AiReportWebController controller = new AiReportWebController(aiReportWebUseCase, aiReportPresenter);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
            .setControllerAdvice(new AiReportExceptionHandler())
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
    void postCommercialReport_cached_returns200WithEmbeddedReport() throws Exception {
        CommercialAiReportInfo info = mock(CommercialAiReportInfo.class);
        AiReportSubmissionInfo submission = AiReportSubmissionInfo.cached(AiReportJobType.COMMERCIAL, info);
        AiReportSubmissionResponse responseBody = AiReportSubmissionResponse.builder()
            .submissionStatus(AiReportSubmissionStatus.CACHED)
            .jobType(AiReportJobType.COMMERCIAL)
            .commercialReport(mock(CommercialAiReportResponse.class))
            .build();
        when(aiReportWebUseCase.submitCommercialReport(eq(MEMBER_ID), eq("C1"), eq("S1"), eq("20233")))
            .thenReturn(submission);
        when(aiReportPresenter.toSubmissionResponse(submission)).thenReturn(responseBody);

        mockMvc.perform(post("/api/v1/ai-reports/commercials/{commercialCode}", "C1")
                .param("serviceCode", "S1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.dataBody.submissionStatus").value("CACHED"))
            .andExpect(jsonPath("$.dataBody.jobType").value("COMMERCIAL"))
            .andExpect(jsonPath("$.dataBody.jobId").doesNotExist())
            .andExpect(jsonPath("$.dataBody.commercialReport").exists());
    }

    @Test
    void postCommercialReport_accepted_returns202WithJobId() throws Exception {
        AiReportSubmissionInfo submission = AiReportSubmissionInfo.accepted(AiReportJobType.COMMERCIAL, "job-uuid-1");
        AiReportSubmissionResponse responseBody = AiReportSubmissionResponse.builder()
            .submissionStatus(AiReportSubmissionStatus.ACCEPTED)
            .jobType(AiReportJobType.COMMERCIAL)
            .jobId("job-uuid-1")
            .build();
        when(aiReportWebUseCase.submitCommercialReport(eq(MEMBER_ID), eq("C1"), eq("S1"), eq("20233")))
            .thenReturn(submission);
        when(aiReportPresenter.toSubmissionResponse(submission)).thenReturn(responseBody);

        mockMvc.perform(post("/api/v1/ai-reports/commercials/{commercialCode}", "C1")
                .param("serviceCode", "S1"))
            .andExpect(status().isAccepted())
            .andExpect(jsonPath("$.dataBody.submissionStatus").value("ACCEPTED"))
            .andExpect(jsonPath("$.dataBody.jobId").value("job-uuid-1"));
    }

    @Test
    void getJobStatus_completed_returns200WithReport() throws Exception {
        AiReportJobInfo info = AiReportJobInfo.builder()
            .jobId("job-uuid-1")
            .jobType(AiReportJobType.COMMERCIAL)
            .status(AiReportJobStatus.COMPLETED)
            .commercialReport(mock(CommercialAiReportInfo.class))
            .build();
        AiReportJobStatusResponse responseBody = AiReportJobStatusResponse.builder()
            .jobId("job-uuid-1")
            .jobType(AiReportJobType.COMMERCIAL)
            .status(AiReportJobStatus.COMPLETED)
            .commercialReport(mock(CommercialAiReportResponse.class))
            .build();
        when(aiReportWebUseCase.getJobInfo("job-uuid-1", MEMBER_ID)).thenReturn(info);
        when(aiReportPresenter.toJobStatusResponse(info)).thenReturn(responseBody);

        mockMvc.perform(get("/api/v1/ai-reports/jobs/{jobId}", "job-uuid-1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.dataBody.status").value("COMPLETED"))
            .andExpect(jsonPath("$.dataBody.jobId").value("job-uuid-1"))
            .andExpect(jsonPath("$.dataBody.commercialReport").exists());
    }

    @Test
    void getJobStatus_otherUserJob_returns404FromGlobalHandler() throws Exception {
        when(aiReportWebUseCase.getJobInfo(eq("job-uuid-other"), eq(MEMBER_ID)))
            .thenThrow(new AiReportException(AiReportErrorCode.JOB_NOT_FOUND));

        mockMvc.perform(get("/api/v1/ai-reports/jobs/{jobId}", "job-uuid-other"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.dataHeader.resultCode").value(AiReportErrorCode.JOB_NOT_FOUND.getCode()));

        verify(aiReportPresenter, never()).toJobStatusResponse(any());
    }

    @Test
    void getJobStatus_running_returns200WithoutReportPayload() throws Exception {
        AiReportJobInfo info = AiReportJobInfo.builder()
            .jobId("job-uuid-1")
            .jobType(AiReportJobType.COMMERCIAL)
            .status(AiReportJobStatus.RUNNING)
            .build();
        AiReportJobStatusResponse responseBody = AiReportJobStatusResponse.builder()
            .jobId("job-uuid-1")
            .jobType(AiReportJobType.COMMERCIAL)
            .status(AiReportJobStatus.RUNNING)
            .build();
        when(aiReportWebUseCase.getJobInfo(anyString(), anyLong())).thenReturn(info);
        when(aiReportPresenter.toJobStatusResponse(info)).thenReturn(responseBody);

        mockMvc.perform(get("/api/v1/ai-reports/jobs/{jobId}", "job-uuid-1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.dataBody.status").value("RUNNING"))
            .andExpect(jsonPath("$.dataBody.commercialReport").doesNotExist())
            .andExpect(jsonPath("$.dataBody.errorCode").doesNotExist());
    }
}
