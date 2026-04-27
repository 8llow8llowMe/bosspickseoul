package com.followfollowme.nowdoboss.domainlayer.aireport.application.model;

import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.AiUsageMeta;

public record AiGenerationResult<T>(T draft, AiUsageMeta usage) {

}
