package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.exception.CommercialExceptionHandler;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.in.CommercialWebUseCase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/**
 * 상권 비교 조회 파라미터의 필수 검증을 확인한다.
 *
 * <p>Swagger 는 세 값을 REQUIRED 로 문서화하는데 Bean Validation 이 없어 실제로는 아무것도
 * 막지 않았다. 값이 비면 그대로 조회로 흘러가 400 이 아니라 조회 실패나 500 이 됐다.
 * 필드별 코드를 붙여 클라이언트가 어떤 값이 빠졌는지 코드로 분기할 수 있게 한다.
 */
@ExtendWith(MockitoExtension.class)
class CommercialComparisonQueryValidationTest {

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
    @DisplayName("좌측 상권 코드가 없으면 COMMERCIAL_103 400 으로 막는다")
    void missingLeftCommercialCode_returns400() throws Exception {
        mockMvc.perform(get("/api/v1/commercials/compare")
                .param("rightCommercialCode", "3110012")
                .param("serviceCode", "CS100001"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.dataHeader.resultCode").value("COMMERCIAL_103"));

        verify(commercialWebUseCase, never()).compareCommercials(any());
    }

    @Test
    @DisplayName("서비스 코드가 없으면 COMMERCIAL_105 400 으로 막는다")
    void missingServiceCode_returns400() throws Exception {
        mockMvc.perform(get("/api/v1/commercials/compare")
                .param("leftCommercialCode", "3110008")
                .param("rightCommercialCode", "3110012"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.dataHeader.resultCode").value("COMMERCIAL_105"));

        verify(commercialWebUseCase, never()).compareCommercials(any());
    }
}
