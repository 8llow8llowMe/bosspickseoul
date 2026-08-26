package com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.response.CommunityPostListResponse;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.exception.CommunityExceptionHandler;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.in.CommunityPostWebUseCase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.MethodValidationPostProcessor;

/**
 * 목록 조회 size 파라미터의 허용 범위를 검증한다.
 *
 * <p>상한이 없으면 size 가 그대로 QueryDSL {@code limit(size + 1)} 로 넘어가 한 번의 요청으로
 * 대량 조회가 된다. size 가 0 이면 hasNext 는 true 인데 목록은 비어 나와 무한스크롤이 끝나지 않고,
 * 음수면 {@code subList} 에서 예외가 나 500 이 된다. 다른 목록 API 와 동일하게 1~50 으로 묶는다.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class CommunityPostWebControllerSizeValidationTest {

    private static final String PAGE_SIZE_CODE = "COMMUNITY_119";

    @Mock
    private CommunityPostWebUseCase communityPostWebUseCase;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        Object controller = methodValidated(new CommunityPostWebController(communityPostWebUseCase));
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
            .setControllerAdvice(new CommunityExceptionHandler())
            .build();
    }

    /**
     * standaloneSetup 은 AOP 프록시를 만들지 않아 {@code @Validated} 의 파라미터 검증이 걸리지 않는다.
     * 운영에서는 Boot 가 등록하는 MethodValidationPostProcessor 가 프록시를 씌우므로,
     * 같은 후처리기를 직접 적용해 운영과 동일한 경로로 검증한다.
     */
    private static Object methodValidated(Object controller) {
        MethodValidationPostProcessor processor = new MethodValidationPostProcessor();
        processor.afterPropertiesSet();
        return processor.postProcessAfterInitialization(controller, "communityPostWebController");
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/v1/community/posts", "/api/v1/community/posts/search"})
    @DisplayName("size 가 상한을 넘으면 COMMUNITY_119 로 거절한다")
    void size_aboveMax_isRejected(String path) throws Exception {
        mockMvc.perform(get(path).param("size", "1000000"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.dataHeader.resultCode").value(PAGE_SIZE_CODE));

        verify(communityPostWebUseCase, never())
            .getPosts(any(), any(), any(), any(), anyLong(), anyLong(), anyInt());
    }

    @ParameterizedTest
    @ValueSource(strings = {"0", "-1"})
    @DisplayName("size 가 1 미만이면 COMMUNITY_119 로 거절한다")
    void size_belowMin_isRejected(String size) throws Exception {
        mockMvc.perform(get("/api/v1/community/posts").param("size", size))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.dataHeader.resultCode").value(PAGE_SIZE_CODE));
    }

    @ParameterizedTest
    @ValueSource(strings = {"1", "20", "50"})
    @DisplayName("허용 범위 안의 size 는 그대로 통과한다")
    void size_withinRange_passesThrough(String size) throws Exception {
        when(communityPostWebUseCase.getPosts(any(), any(), any(), any(), anyLong(), anyLong(), anyInt()))
            .thenReturn(CommunityPostListResponse.builder().build());

        mockMvc.perform(get("/api/v1/community/posts").param("size", size))
            .andExpect(status().isOk());
    }
}
