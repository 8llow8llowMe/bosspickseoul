package com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.adapter.in.web.presenter;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.adapter.in.web.dto.item.AnalysisBookmarkItem;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.adapter.in.web.dto.response.AnalysisBookmarkCreateResponse;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.adapter.in.web.dto.response.AnalysisBookmarksResponse;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.info.AnalysisBookmarkInfo;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.info.AnalysisBookmarkPageInfo;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AnalysisBookmarkPresenter {

    private final ObjectMapper objectMapper;

    public AnalysisBookmarkCreateResponse toCreateResponse(AnalysisBookmarkInfo info) {
        return AnalysisBookmarkCreateResponse.builder()
            .bookmark(toItem(info))
            .build();
    }

    public AnalysisBookmarksResponse toBookmarksResponse(AnalysisBookmarkPageInfo info) {
        return AnalysisBookmarksResponse.builder()
            .bookmarks(info.bookmarks().stream().map(this::toItem).toList())
            .page(info.page())
            .size(info.size())
            .totalElements(info.totalElements())
            .totalPages(info.totalPages())
            .build();
    }

    private AnalysisBookmarkItem toItem(AnalysisBookmarkInfo info) {
        return AnalysisBookmarkItem.builder()
            // Snowflake 값이 JS Number.MAX_SAFE_INTEGER 를 넘으므로 문자열로 내려준다.
            .bookmarkId(String.valueOf(info.bookmarkId()))
            .shareType(info.shareType().toMetadata())
            .payload(parsePayload(info.payload()))
            .bookmarkName(info.bookmarkName())
            .createdAt(info.createdAt())
            .build();
    }

    private JsonNode parsePayload(String payload) {
        try {
            return objectMapper.readTree(payload);
        } catch (JsonProcessingException exception) {
            // 저장 시점에 정규화된 JSON 문자열만 들어가므로 발생하면 데이터 손상이다.
            throw new IllegalStateException("보관함 payload 를 JSON 으로 해석할 수 없습니다.", exception);
        }
    }
}
