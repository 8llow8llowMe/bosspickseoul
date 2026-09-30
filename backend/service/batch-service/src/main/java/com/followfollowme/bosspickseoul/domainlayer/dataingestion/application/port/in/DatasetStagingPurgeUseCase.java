package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.in;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.StagingPurgeResult;

public interface DatasetStagingPurgeUseCase {

    StagingPurgeResult purge();
}
