package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.in.web.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescriptionMetadata;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.in.web.dto.response.AiReportJobStatusResponse;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.in.web.dto.response.AiReportSubmissionResponse;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.in.web.dto.response.CommercialAiReportResponse;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.in.web.exception.AiReportExceptionHandler;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.in.web.sse.AiReportJobSseStreamer;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.exception.AiReportErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.exception.AiReportException;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.info.AiReportSubmissionInfo.AiReportSubmissionStatus;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.model.CommercialComparisonAiQuery;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.in.AiReportWebUseCase;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.AiReportJobStatus;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.AiReportJobType;
import com.followfollowme.bosspickseoul.security.common.dto.MemberLoginActive;
import com.followfollowme.bosspickseoul.security.common.enums.SecurityRole;
import com.followfollowme.bosspickseoul.security.common.jwt.JwtAuthentication;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
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
    private AiReportJobSseStreamer aiReportJobSseStreamer;

    private MockMvc mockMvc;

    private static final long MEMBER_ID = 7L;

    @BeforeEach
    void setUp() {
        AiReportWebController controller = new AiReportWebController(aiReportWebUseCase, aiReportJobSseStreamer);
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
        AiReportSubmissionResponse responseBody = AiReportSubmissionResponse.builder()
            .submissionStatus(AiReportSubmissionStatus.CACHED.toMetadata())
            .jobType(AiReportJobType.COMMERCIAL.toMetadata())
            .commercialReport(mock(CommercialAiReportResponse.class))
            .build();
        when(aiReportWebUseCase.submitCommercialReport(eq(MEMBER_ID), eq("C1"), eq("S1"), eq("20233")))
            .thenReturn(responseBody);

        mockMvc.perform(post("/api/v1/ai-reports/commercials/{commercialCode}", "C1")
                .param("serviceCode", "S1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.dataBody.submissionStatus.code").value("CACHED"))
            .andExpect(jsonPath("$.dataBody.submissionStatus.name").value("캐시 결과 반환"))
            .andExpect(jsonPath("$.dataBody.jobType.code").value("COMMERCIAL"))
            .andExpect(jsonPath("$.dataBody.jobId").doesNotExist())
            .andExpect(jsonPath("$.dataBody.commercialReport").exists());
    }

    @Test
    void postCommercialReport_accepted_returns202WithJobId() throws Exception {
        AiReportSubmissionResponse responseBody = AiReportSubmissionResponse.builder()
            .submissionStatus(AiReportSubmissionStatus.ACCEPTED.toMetadata())
            .jobType(AiReportJobType.COMMERCIAL.toMetadata())
            .jobId("job-uuid-1")
            .build();
        when(aiReportWebUseCase.submitCommercialReport(eq(MEMBER_ID), eq("C1"), eq("S1"), eq("20233")))
            .thenReturn(responseBody);

        mockMvc.perform(post("/api/v1/ai-reports/commercials/{commercialCode}", "C1")
                .param("serviceCode", "S1"))
            .andExpect(status().isAccepted())
            .andExpect(jsonPath("$.dataBody.submissionStatus.code").value("ACCEPTED"))
            .andExpect(jsonPath("$.dataBody.jobId").value("job-uuid-1"));
    }

    /**
     * 상태 분기는 정확히 2갈래다 — CACHED 만 200 이고 나머지는 전부 202 로 내려간다.
     * 상태 코드가 String 이 된 뒤에도 "CACHED 가 아니면 202" 라는 폴백이 유지되는지 고정한다.
     */
    @Test
    void postCommercialReport_nonCachedStatusCode_returns202() throws Exception {
        AiReportSubmissionResponse responseBody = AiReportSubmissionResponse.builder()
            .submissionStatus(CodeNameDescriptionMetadata.of("SOMETHING_ELSE", "알 수 없음", "알 수 없는 제출 상태"))
            .jobType(AiReportJobType.COMMERCIAL.toMetadata())
            .jobId("job-uuid-9")
            .build();
        when(aiReportWebUseCase.submitCommercialReport(eq(MEMBER_ID), eq("C1"), eq("S1"), eq("20233")))
            .thenReturn(responseBody);

        mockMvc.perform(post("/api/v1/ai-reports/commercials/{commercialCode}", "C1")
                .param("serviceCode", "S1"))
            .andExpect(status().isAccepted())
            .andExpect(jsonPath("$.dataBody.submissionStatus.code").value("SOMETHING_ELSE"));
    }

    @Test
    void postDistrictReport_accepted_returns202WithJobId() throws Exception {
        AiReportSubmissionResponse responseBody = AiReportSubmissionResponse.builder()
            .submissionStatus(AiReportSubmissionStatus.ACCEPTED.toMetadata())
            .jobType(AiReportJobType.DISTRICT.toMetadata())
            .jobId("job-uuid-2")
            .build();
        when(aiReportWebUseCase.submitDistrictReport(eq(MEMBER_ID), eq("11680"), eq("20233")))
            .thenReturn(responseBody);

        mockMvc.perform(post("/api/v1/ai-reports/districts/{districtCode}", "11680"))
            .andExpect(status().isAccepted())
            .andExpect(jsonPath("$.dataBody.submissionStatus.code").value("ACCEPTED"))
            .andExpect(jsonPath("$.dataBody.jobType.code").value("DISTRICT"))
            .andExpect(jsonPath("$.dataBody.jobId").value("job-uuid-2"));
    }

    @Test
    void postAdministrationReport_accepted_returns202WithJobId() throws Exception {
        AiReportSubmissionResponse responseBody = AiReportSubmissionResponse.builder()
            .submissionStatus(AiReportSubmissionStatus.ACCEPTED.toMetadata())
            .jobType(AiReportJobType.ADMINISTRATION.toMetadata())
            .jobId("job-uuid-3")
            .build();
        when(aiReportWebUseCase.submitAdministrationReport(eq(MEMBER_ID), eq("11110515"), eq("20233")))
            .thenReturn(responseBody);

        mockMvc.perform(post("/api/v1/ai-reports/administrations/{administrationCode}", "11110515"))
            .andExpect(status().isAccepted())
            .andExpect(jsonPath("$.dataBody.submissionStatus.code").value("ACCEPTED"))
            .andExpect(jsonPath("$.dataBody.jobType.code").value("ADMINISTRATION"))
            .andExpect(jsonPath("$.dataBody.jobId").value("job-uuid-3"));
    }

    @Test
    void postCommercialComparisonReport_accepted_returns202WithJobId() throws Exception {
        AiReportSubmissionResponse responseBody = AiReportSubmissionResponse.builder()
            .submissionStatus(AiReportSubmissionStatus.ACCEPTED.toMetadata())
            .jobType(AiReportJobType.COMMERCIAL_COMPARISON.toMetadata())
            .jobId("job-uuid-4")
            .build();
        when(aiReportWebUseCase.submitCommercialComparisonReport(eq(MEMBER_ID), any()))
            .thenReturn(responseBody);

        mockMvc.perform(post("/api/v1/ai-reports/commercials/comparisons")
                .param("leftCommercialCode", "C1")
                .param("rightCommercialCode", "C2")
                .param("serviceCode", "S1"))
            .andExpect(status().isAccepted())
            .andExpect(jsonPath("$.dataBody.submissionStatus.code").value("ACCEPTED"))
            .andExpect(jsonPath("$.dataBody.jobType.code").value("COMMERCIAL_COMPARISON"))
            .andExpect(jsonPath("$.dataBody.jobId").value("job-uuid-4"));
    }

    @Test
    void getJobStatus_completed_returns200WithReport() throws Exception {
        AiReportJobStatusResponse responseBody = AiReportJobStatusResponse.builder()
            .jobId("job-uuid-1")
            .jobType(AiReportJobType.COMMERCIAL.toMetadata())
            .status(AiReportJobStatus.COMPLETED.toMetadata())
            .commercialReport(mock(CommercialAiReportResponse.class))
            .build();
        when(aiReportWebUseCase.getJobStatusResponse("job-uuid-1", MEMBER_ID)).thenReturn(responseBody);

        mockMvc.perform(get("/api/v1/ai-reports/jobs/{jobId}", "job-uuid-1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.dataBody.status.code").value("COMPLETED"))
            .andExpect(jsonPath("$.dataBody.status.name").value("완료"))
            .andExpect(jsonPath("$.dataBody.jobId").value("job-uuid-1"))
            .andExpect(jsonPath("$.dataBody.commercialReport").exists());
    }

    @Test
    void getJobStatus_otherUserJob_returns404FromGlobalHandler() throws Exception {
        when(aiReportWebUseCase.getJobStatusResponse(eq("job-uuid-other"), eq(MEMBER_ID)))
            .thenThrow(new AiReportException(AiReportErrorCode.JOB_NOT_FOUND));

        mockMvc.perform(get("/api/v1/ai-reports/jobs/{jobId}", "job-uuid-other"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.dataHeader.resultCode").value(AiReportErrorCode.JOB_NOT_FOUND.getCode()))
            .andExpect(jsonPath("$.dataBody").doesNotExist());
    }

    @Test
    void getJobStatus_running_returns200WithoutReportPayload() throws Exception {
        AiReportJobStatusResponse responseBody = AiReportJobStatusResponse.builder()
            .jobId("job-uuid-1")
            .jobType(AiReportJobType.COMMERCIAL.toMetadata())
            .status(AiReportJobStatus.RUNNING.toMetadata())
            .build();
        when(aiReportWebUseCase.getJobStatusResponse(anyString(), anyLong())).thenReturn(responseBody);

        mockMvc.perform(get("/api/v1/ai-reports/jobs/{jobId}", "job-uuid-1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.dataBody.status.code").value("RUNNING"))
            .andExpect(jsonPath("$.dataBody.commercialReport").doesNotExist())
            .andExpect(jsonPath("$.dataBody.errorCode").doesNotExist());
    }

    /**
     * periodCode 기본값 보정은 web DTO({@code CommercialComparisonAiRequest})의 compact 생성자에만 남아 있다.
     * 보정이 사라져도 상태 코드와 응답 본문은 그대로라, 넘어간 query 를 캡처하지 않으면 회귀가 전혀 드러나지 않는다.
     * 이 값은 requestParams -> requestHash -> 멱등 키 -> 캐시 키로 흘러가므로, 운영에서는 캐시 영구 miss 와
     * 요청마다 갈라지는 멱등 키라는 형태로만 뒤늦게 드러난다.
     */
    @Test
    void postCommercialComparisonReport_withoutPeriodCode_appliesDefaultPeriodCode() throws Exception {
        when(aiReportWebUseCase.submitCommercialComparisonReport(eq(MEMBER_ID), any())).thenReturn(acceptedComparisonResponse());

        mockMvc.perform(post("/api/v1/ai-reports/commercials/comparisons")
                .param("leftCommercialCode", "C1")
                .param("rightCommercialCode", "C2")
                .param("serviceCode", "S1"))
            .andExpect(status().isAccepted());

        // "20233" 은 공개 API 계약값이라 상수 참조가 아니라 리터럴로 고정한다(상수까지 같이 바뀌어도 통과하면 안 된다).
        assertThat(captureSubmittedComparisonQuery()).isEqualTo(new CommercialComparisonAiQuery("C1", "C2", "S1", "20233"));
    }

    /** 명시값이 오면 보정이 끼어들지 않아야 한다. 기본값 테스트와 짝을 이뤄 보정 조건을 양방향으로 고정한다. */
    @Test
    void postCommercialComparisonReport_withPeriodCode_preservesGivenPeriodCode() throws Exception {
        when(aiReportWebUseCase.submitCommercialComparisonReport(eq(MEMBER_ID), any())).thenReturn(acceptedComparisonResponse());

        mockMvc.perform(post("/api/v1/ai-reports/commercials/comparisons")
                .param("leftCommercialCode", "C1")
                .param("rightCommercialCode", "C2")
                .param("serviceCode", "S1")
                .param("periodCode", "20241"))
            .andExpect(status().isAccepted());

        assertThat(captureSubmittedComparisonQuery()).isEqualTo(new CommercialComparisonAiQuery("C1", "C2", "S1", "20241"));
    }

    private AiReportSubmissionResponse acceptedComparisonResponse() {
        return AiReportSubmissionResponse.builder()
            .submissionStatus(AiReportSubmissionStatus.ACCEPTED.toMetadata())
            .jobType(AiReportJobType.COMMERCIAL_COMPARISON.toMetadata())
            .jobId("job-uuid-4")
            .build();
    }

    private CommercialComparisonAiQuery captureSubmittedComparisonQuery() {
        ArgumentCaptor<CommercialComparisonAiQuery> queryCaptor = ArgumentCaptor.forClass(CommercialComparisonAiQuery.class);
        verify(aiReportWebUseCase).submitCommercialComparisonReport(eq(MEMBER_ID), queryCaptor.capture());
        return queryCaptor.getValue();
    }
}
