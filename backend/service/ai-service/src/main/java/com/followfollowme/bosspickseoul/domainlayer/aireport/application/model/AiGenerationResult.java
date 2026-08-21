package com.followfollowme.bosspickseoul.domainlayer.aireport.application.model;

import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.AiUsageMeta;

public record AiGenerationResult<T>(T draft, AiUsageMeta usage) {

}
