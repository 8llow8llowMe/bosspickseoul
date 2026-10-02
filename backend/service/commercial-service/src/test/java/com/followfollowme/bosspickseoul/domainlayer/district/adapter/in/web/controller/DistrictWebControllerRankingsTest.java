package com.followfollowme.bosspickseoul.domainlayer.district.adapter.in.web.controller;

import static org.hamcrest.Matchers.nullValue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.followfollowme.bosspickseoul.domainlayer.district.adapter.in.web.dto.item.DistrictSalesRankingItem;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.in.web.dto.response.DistrictRankingSummaryResponse;
import com.followfollowme.bosspickseoul.domainlayer.district.application.port.in.DistrictWebUseCase;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/**
 * {@code GET /api/v1/districts/rankings}(이슈 #433)가 {@code /{districtCode}} 에 잡히지 않고 전체 순위 유스케이스로 가는지,
 * 분기 파라미터를 생략하면 상수로 채우지 않고 null 로 넘기는지(해석은 Facade, 이슈 #464), 결측 변화율이 JSON {@code null} 로 나가는지 본다.
 */
@ExtendWith(MockitoExtension.class)
class DistrictWebControllerRankingsTest {

    @Mock
    private DistrictWebUseCase districtWebUseCase;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new DistrictWebController(districtWebUseCase)).build();
    }

    @Test
    @DisplayName("분기를 생략하면 null 로 넘기고, 순위와 null 변화율을 응답 봉투에 싣는다")
    void omittedPeriodsArePassedAsNullAndNullRateIsSerialized() throws Exception {
        when(districtWebUseCase.getDistrictRankings(isNull(), isNull())).thenReturn(response());

        mockMvc.perform(get("/api/v1/districts/rankings"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.dataBody.currentPeriodCode").value("20261"))
            .andExpect(jsonPath("$.dataBody.previousPeriodCode").value("20254"))
            .andExpect(jsonPath("$.dataBody.salesRankings[0].rank").value(1))
            .andExpect(jsonPath("$.dataBody.salesRankings[0].districtCode").value("11680"))
            .andExpect(jsonPath("$.dataBody.salesRankings[0].salesChangeRate").value(5.3))
            .andExpect(jsonPath("$.dataBody.salesRankings[1].rank").value(2))
            // 필드가 빠지지 않고 값이 null 로 나간다(경로가 없으면 nullValue 매처가 아니라 "No value at JSON path" 로 실패한다).
            .andExpect(jsonPath("$.dataBody.salesRankings[1].salesChangeRate").value(nullValue()));

        verify(districtWebUseCase, never()).getDistrictDetail(anyString(), isNull(), isNull());
    }

    @Test
    @DisplayName("명시한 분기는 그대로 넘긴다")
    void explicitPeriodsPassThrough() throws Exception {
        when(districtWebUseCase.getDistrictRankings("20261", "20253")).thenReturn(response());

        mockMvc.perform(get("/api/v1/districts/rankings")
                .param("currentPeriodCode", "20261")
                .param("previousPeriodCode", "20253"))
            .andExpect(status().isOk());

        verify(districtWebUseCase).getDistrictRankings("20261", "20253");
    }

    private static DistrictRankingSummaryResponse response() {
        return DistrictRankingSummaryResponse.builder()
            .currentPeriodCode("20261")
            .previousPeriodCode("20254")
            .footTrafficRankings(List.of())
            .salesRankings(List.of(
                DistrictSalesRankingItem.builder().rank(1).districtCode("11680").districtName("강남구")
                    .totalSalesAmount(15_847_230_000L).salesChangeRate(5.3).build(),
                DistrictSalesRankingItem.builder().rank(2).districtCode("11380").districtName("은평구")
                    .totalSalesAmount(1_200_000_000L).salesChangeRate(null).build()))
            .openedStoreRankings(List.of())
            .closedStoreRankings(List.of())
            .build();
    }
}
