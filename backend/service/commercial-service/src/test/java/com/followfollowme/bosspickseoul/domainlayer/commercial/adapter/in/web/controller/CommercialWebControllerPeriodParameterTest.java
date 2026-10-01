package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.followfollowme.bosspickseoul.domainlayer.analysisperiod.application.exception.AnalysisPeriodErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.analysisperiod.application.exception.AnalysisPeriodException;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.exception.CommercialExceptionHandler;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.model.CommercialComparisonQuery;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.in.CommercialWebUseCase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/**
 * {@code periodCode} 가 선택 파라미터라 생략하면 컨트롤러가 상수를 채우지 않고 그대로(null) 넘기는지 확인한다(이슈 #464).
 * 해석은 Facade 가 적재 기준 기본 분기로 한다. 기본 분기를 정할 수 없으면 공통 실패 봉투의 503 이다.
 */
@ExtendWith(MockitoExtension.class)
class CommercialWebControllerPeriodParameterTest {

    @Mock
    private CommercialWebUseCase commercialWebUseCase;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new CommercialWebController(commercialWebUseCase))
            .setControllerAdvice(new CommercialExceptionHandler())
            .build();
    }

    @Test
    @DisplayName("periodCode 를 생략하면 400 이 아니라 null 로 유스케이스에 넘긴다")
    void omittedPeriodCodeIsPassedAsNull() throws Exception {
        mockMvc.perform(get("/api/v1/commercials/3110008/foot-traffic"))
            .andExpect(status().isOk());

        verify(commercialWebUseCase).getFootTrafficByPeriodCodeAndCommercialCode(isNull(), any());
    }

    @Test
    @DisplayName("비교 조회도 periodCode 를 생략하면 상수로 채우지 않는다")
    void comparisonQueryKeepsTheOmittedPeriodCode() throws Exception {
        mockMvc.perform(get("/api/v1/commercials/compare")
                .param("leftCommercialCode", "3110008")
                .param("rightCommercialCode", "3110012")
                .param("serviceCode", "CS100001"))
            .andExpect(status().isOk());

        ArgumentCaptor<CommercialComparisonQuery> query = ArgumentCaptor.forClass(CommercialComparisonQuery.class);
        verify(commercialWebUseCase).compareCommercials(query.capture());
        assertThat(query.getValue().periodCode()).isNull();
    }

    @Test
    @DisplayName("기본 분기를 정할 수 없으면 ANALYSIS_PERIOD_001 503 실패 봉투다")
    void unavailableDefaultPeriodIsA503() throws Exception {
        when(commercialWebUseCase.getFootTrafficByPeriodCodeAndCommercialCode(isNull(), any()))
            .thenThrow(new AnalysisPeriodException(AnalysisPeriodErrorCode.DEFAULT_PERIOD_UNAVAILABLE));

        mockMvc.perform(get("/api/v1/commercials/3110008/foot-traffic"))
            .andExpect(status().isServiceUnavailable())
            .andExpect(jsonPath("$.dataHeader.resultCode").value("ANALYSIS_PERIOD_001"));
    }
}
