package com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.adapter.in.web.controller;

import com.followfollowme.bosspickseoul.common.dto.Response;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.adapter.in.web.dto.request.AnalysisBookmarkCreateRequest;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.adapter.in.web.dto.request.AnalysisBookmarkNameUpdateRequest;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.adapter.in.web.dto.response.AnalysisBookmarkCreateResponse;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.adapter.in.web.dto.response.AnalysisBookmarksResponse;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.exception.AnalysisBookmarkValidationMessage;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.port.in.AnalysisBookmarkWebUseCase;
import com.followfollowme.bosspickseoul.security.common.dto.MemberLoginActive;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/analysis-bookmarks")
@Tag(name = "분석 보관함", description = "분석 화면 상태(조건 포함)를 회원 보관함에 저장/조회/수정/삭제하는 API를 제공합니다.")
public class AnalysisBookmarkWebController {

    private final AnalysisBookmarkWebUseCase analysisBookmarkWebUseCase;

    @Operation(
        summary = "분석 화면 보관",
        description = """
            현재 보고 있는 분석 화면 상태(payload)를 보관함에 저장합니다.
            payload 는 공유 링크 생성과 동일한 화면 상태 JSON 이며, 다시 열 때 그대로 화면을 복원할 수 있습니다.
            공유 링크와 달리 만료되지 않고 본인만 볼 수 있습니다.
            같은 화면 상태를 다시 저장하면 409 로 응답하며, dataBody 의 existingBookmarkId 로 기존 항목을 알려줍니다.
            회원당 저장 상한(기본 100개)을 넘으면 400 ANALYSIS_BOOKMARK_006 으로 응답합니다."""
    )
    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("isAuthenticated()")
    @PostMapping
    public ResponseEntity<Response<AnalysisBookmarkCreateResponse>> createBookmark(
        @AuthenticationPrincipal MemberLoginActive principal,
        @Valid @RequestBody AnalysisBookmarkCreateRequest request
    ) {
        return ResponseEntity.ok().body(Response.success(
            analysisBookmarkWebUseCase.createBookmark(principal.memberId(), request)));
    }

    @Operation(summary = "분석 보관함 목록 조회",
        description = "본인이 보관한 분석 화면을 최신순으로 조회합니다. shareType 으로 화면 타입을 필터링할 수 있습니다.")
    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("isAuthenticated()")
    @GetMapping
    public ResponseEntity<Response<AnalysisBookmarksResponse>> getBookmarks(
        @AuthenticationPrincipal MemberLoginActive principal,
        @Parameter(description = "분석 화면 타입 필터 (선택, 예: COMMERCIAL_ANALYSIS)")
        @RequestParam(required = false) String shareType,
        @Parameter(description = "페이지 (0부터)")
        @RequestParam(defaultValue = "0")
        @Min(value = 0, message = AnalysisBookmarkValidationMessage.PAGE_MIN) int page,
        @Parameter(description = "페이지 크기 (1~50)")
        @RequestParam(defaultValue = "10")
        @Min(value = 1, message = AnalysisBookmarkValidationMessage.SIZE_RANGE)
        @Max(value = 50, message = AnalysisBookmarkValidationMessage.SIZE_RANGE) int size
    ) {
        return ResponseEntity.ok().body(Response.success(
            analysisBookmarkWebUseCase.getBookmarks(principal.memberId(), shareType, page, size)));
    }

    @Operation(summary = "분석 보관함 이름 수정",
        description = "본인이 보관한 항목의 이름을 수정합니다. bookmarkName 이 null 또는 공백이면 이름을 제거합니다. 타인 항목은 404 로 응답합니다.")
    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("isAuthenticated()")
    @PatchMapping("/{bookmarkId}")
    public ResponseEntity<Response<Void>> updateBookmarkName(
        @AuthenticationPrincipal MemberLoginActive principal,
        @Parameter(description = "보관함 항목 아이디", required = true) @PathVariable long bookmarkId,
        @Valid @RequestBody AnalysisBookmarkNameUpdateRequest request
    ) {
        analysisBookmarkWebUseCase.updateBookmarkName(principal.memberId(), bookmarkId, request.bookmarkName());
        return ResponseEntity.ok().body(Response.success());
    }

    @Operation(summary = "분석 보관함 삭제", description = "본인이 보관한 항목을 삭제합니다. 타인 항목은 404 로 응답합니다.")
    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("isAuthenticated()")
    @DeleteMapping("/{bookmarkId}")
    public ResponseEntity<Response<Void>> deleteBookmark(
        @AuthenticationPrincipal MemberLoginActive principal,
        @Parameter(description = "보관함 항목 아이디", required = true) @PathVariable long bookmarkId
    ) {
        analysisBookmarkWebUseCase.deleteBookmark(principal.memberId(), bookmarkId);
        return ResponseEntity.ok().body(Response.success());
    }
}
