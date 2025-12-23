package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.controller;

import com.followfollowme.nowdoboss.common.dto.Response;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialServiceCategoryResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.port.in.CommercialWebUseCase;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/commercials")
@Tag(name = "상권", description = "상권 분석 관련 클라이언트 전용 API 입니다.")
public class CommercialWebController {

    private final CommercialWebUseCase commercialWebUseCase;

    @Operation(
        summary = "상권에 존재하는 업종 목록 조회",
        description = "선택한 상권에 실제 존재하는 서비스 업종 목록을 조회하는 기능입니다."
    )
    @GetMapping("/{commercialCode}/service-categories")
    public ResponseEntity<Response<List<CommercialServiceCategoryResponse>>> getServiceCategories(@PathVariable String commercialCode) {
        List<CommercialServiceCategoryResponse> responses = commercialWebUseCase.getServiceCategoriesByCommercialCode(commercialCode);
        return ResponseEntity.ok().body(Response.success(responses));
    }
}
