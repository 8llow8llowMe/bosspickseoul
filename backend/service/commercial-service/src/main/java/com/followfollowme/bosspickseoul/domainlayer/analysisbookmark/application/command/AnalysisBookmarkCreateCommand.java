package com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.command;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.Builder;

@Builder
public record AnalysisBookmarkCreateCommand(
    String shareType,
    JsonNode payload,
    String bookmarkName
) {

}
