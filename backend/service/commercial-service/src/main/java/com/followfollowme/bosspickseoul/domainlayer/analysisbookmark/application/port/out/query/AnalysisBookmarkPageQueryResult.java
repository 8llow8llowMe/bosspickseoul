package com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.port.out.query;

import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.domain.model.AnalysisBookmark;
import java.util.List;
import lombok.Builder;

@Builder
public record AnalysisBookmarkPageQueryResult(
    List<AnalysisBookmark> bookmarks,
    int page,
    int size,
    long totalElements,
    int totalPages
) {

}
