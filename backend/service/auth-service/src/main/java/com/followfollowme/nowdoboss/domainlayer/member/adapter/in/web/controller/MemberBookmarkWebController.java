package com.followfollowme.nowdoboss.domainlayer.member.adapter.in.web.controller;

import com.followfollowme.nowdoboss.common.dto.Response;
import com.followfollowme.nowdoboss.domainlayer.member.adapter.in.web.dto.request.MemberBookmarkCreateRequest;
import com.followfollowme.nowdoboss.domainlayer.member.adapter.in.web.dto.response.MemberBookmarkCreateResponse;
import com.followfollowme.nowdoboss.domainlayer.member.adapter.in.web.dto.response.MemberBookmarksResponse;
import com.followfollowme.nowdoboss.domainlayer.member.application.exception.BookmarkValidationMessage;
import com.followfollowme.nowdoboss.domainlayer.member.application.port.in.MemberBookmarkWebUseCase;
import com.followfollowme.nowdoboss.security.common.dto.MemberLoginActive;
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
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/members/me/bookmarks")
@Tag(name = "북마크", description = "상권/행정동/자치구 북마크 추가·삭제·목록 조회 API를 제공합니다.")
public class MemberBookmarkWebController {

    private final MemberBookmarkWebUseCase memberBookmarkWebUseCase;

    @Operation(
        summary = "북마크 추가",
        description = "상권·행정동·자치구를 북마크에 추가합니다.",
        security = {@SecurityRequirement(name = "bearerAuth")}
    )
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Response<MemberBookmarkCreateResponse>> addBookmark(
        @AuthenticationPrincipal MemberLoginActive loginActive,
        @Valid @RequestBody MemberBookmarkCreateRequest request
    ) {
        MemberBookmarkCreateResponse response = memberBookmarkWebUseCase.addBookmark(
            loginActive.memberId(),
            request.targetType(),
            request.targetCode(),
            request.targetName()
        );
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(
        summary = "북마크 삭제",
        description = "북마크 아이디로 본인 북마크를 삭제합니다.",
        security = {@SecurityRequirement(name = "bearerAuth")}
    )
    @DeleteMapping("/{bookmarkId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Response<Void>> removeBookmark(
        @AuthenticationPrincipal MemberLoginActive loginActive,
        @Parameter(description = "북마크 아이디", required = true) @PathVariable long bookmarkId
    ) {
        memberBookmarkWebUseCase.removeBookmark(loginActive.memberId(), bookmarkId);
        return ResponseEntity.ok().body(Response.success());
    }

    @Operation(
        summary = "북마크 목록 조회",
        description = "내 북마크 목록을 최신순으로 커서 페이지네이션으로 조회합니다.",
        security = {@SecurityRequirement(name = "bearerAuth")}
    )
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Response<MemberBookmarksResponse>> getBookmarks(
        @AuthenticationPrincipal MemberLoginActive loginActive,
        @Parameter(description = "마지막으로 조회한 북마크 아이디 (첫 페이지: 생략)") @RequestParam(required = false) Long lastBookmarkId,
        @Parameter(description = "조회 개수 (기본 10, 최대 50)") @RequestParam(defaultValue = "10") @Min(value = 1, message = BookmarkValidationMessage.PAGE_SIZE_INVALID)
        @Max(value = 50, message = BookmarkValidationMessage.PAGE_SIZE_INVALID) int size
    ) {
        MemberBookmarksResponse response = memberBookmarkWebUseCase.getBookmarks(
            loginActive.memberId(), lastBookmarkId, size);
        return ResponseEntity.ok().body(Response.success(response));
    }
}
