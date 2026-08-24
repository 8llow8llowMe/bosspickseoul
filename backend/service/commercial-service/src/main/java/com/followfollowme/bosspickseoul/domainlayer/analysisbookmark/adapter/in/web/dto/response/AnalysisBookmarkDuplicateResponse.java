package com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.adapter.in.web.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "분석 보관함 중복 저장(409) 응답 DTO — 실패 응답의 dataBody 로 내려간다")
public record AnalysisBookmarkDuplicateResponse(

    @Schema(description = "이미 저장된 항목의 아이디 (JS 정밀도 손상을 막기 위해 문자열)", example = "7345678901234567890")
    String existingBookmarkId
) {

    public static AnalysisBookmarkDuplicateResponse of(long existingBookmarkId) {
        return new AnalysisBookmarkDuplicateResponse(String.valueOf(existingBookmarkId));
    }
}
