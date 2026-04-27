package com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out;

import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.AiUsageMeta;

public interface AiUsageCounterPort {

    void record(Long userId, AiUsageMeta usage);
}
