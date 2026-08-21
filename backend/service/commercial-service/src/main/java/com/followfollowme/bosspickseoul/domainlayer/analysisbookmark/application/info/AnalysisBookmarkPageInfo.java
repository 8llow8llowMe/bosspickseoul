package com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.info;

import java.util.List;
import lombok.Builder;

@Builder
public record AnalysisBookmarkPageInfo(
    List<AnalysisBookmarkInfo> bookmarks,
    int page,
    int size,
    long totalElements,
    int totalPages
) {

}
