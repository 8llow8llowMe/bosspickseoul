package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model;

public record StagingPurgeResult(long unpublishedStagingRows, long unpublishedRejectedRows, long supersededStagingRows) {
}
