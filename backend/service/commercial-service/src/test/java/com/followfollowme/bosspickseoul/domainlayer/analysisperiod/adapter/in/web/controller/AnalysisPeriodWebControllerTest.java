package com.followfollowme.bosspickseoul.domainlayer.analysisperiod.adapter.in.web.controller;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.followfollowme.bosspickseoul.domainlayer.analysisperiod.adapter.in.web.dto.item.AnalysisDatasetPeriodItem;
import com.followfollowme.bosspickseoul.domainlayer.analysisperiod.adapter.in.web.dto.response.AnalysisPeriodsResponse;
import com.followfollowme.bosspickseoul.domainlayer.analysisperiod.application.exception.AnalysisPeriodErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.analysisperiod.application.exception.AnalysisPeriodException;
import com.followfollowme.bosspickseoul.domainlayer.analysisperiod.application.port.in.AnalysisPeriodWebUseCase;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.exception.CommercialExceptionHandler;
import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/** 분석 기준 분기 카탈로그 경로와 응답 봉투, 기본 분기를 정할 수 없을 때의 503 봉투를 확인한다. */
@ExtendWith(MockitoExtension.class)
class AnalysisPeriodWebControllerTest {

    @Mock
    private AnalysisPeriodWebUseCase analysisPeriodWebUseCase;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new AnalysisPeriodWebController(analysisPeriodWebUseCase))
            .setControllerAdvice(new CommercialExceptionHandler())
            .build();
    }

    @Test
    @DisplayName("GET /api/v1/commercials/periods 는 카탈로그를 성공 봉투로 내려준다")
    void returnsTheCatalogInTheSuccessEnvelope() throws Exception {
        when(analysisPeriodWebUseCase.getAnalysisPeriods()).thenReturn(AnalysisPeriodsResponse.builder()
            .defaultPeriodCode("20261")
            .availablePeriodCodes(List.of("20261", "20254"))
            .firstPeriodCode("20254")
            .spatialVersion("test-snapshot")
            .resolvedAt(OffsetDateTime.parse("2026-10-01T05:12:03+09:00"))
            .datasets(List.of(AnalysisDatasetPeriodItem.builder()
                .dataset("SALES_COMMERCIAL").sourceId("VwsmTrdarSelngQq").latestPeriodCode("20262").firstPeriodCode("20211")
                .periodCount(22).coreForDefault(true).build()))
            .build());

        mockMvc.perform(get("/api/v1/commercials/periods"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.dataHeader.success").value(true))
            .andExpect(jsonPath("$.dataBody.defaultPeriodCode").value("20261"))
            .andExpect(jsonPath("$.dataBody.availablePeriodCodes[0]").value("20261"))
            .andExpect(jsonPath("$.dataBody.datasets[0].dataset").value("SALES_COMMERCIAL"))
            .andExpect(jsonPath("$.dataBody.datasets[0].coreForDefault").value(true));
    }

    @Test
    @DisplayName("기본 분기를 정할 수 없으면 ANALYSIS_PERIOD_001 503 실패 봉투다")
    void unavailableCatalogIsA503Envelope() throws Exception {
        when(analysisPeriodWebUseCase.getAnalysisPeriods())
            .thenThrow(new AnalysisPeriodException(AnalysisPeriodErrorCode.DEFAULT_PERIOD_UNAVAILABLE));

        mockMvc.perform(get("/api/v1/commercials/periods"))
            .andExpect(status().isServiceUnavailable())
            .andExpect(jsonPath("$.dataHeader.success").value(false))
            .andExpect(jsonPath("$.dataHeader.resultCode").value("ANALYSIS_PERIOD_001"));
    }
}
