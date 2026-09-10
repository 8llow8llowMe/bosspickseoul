package com.followfollowme.bosspickseoul.domainlayer.policyingestion.application.service;

import com.followfollowme.bosspickseoul.domainlayer.policyingestion.application.port.in.PolicyPurgeUseCase;
import com.followfollowme.bosspickseoul.domainlayer.policyingestion.application.service.processor.PolicyPurgeProcessor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PolicyPurgeFacade implements PolicyPurgeUseCase {

    private final PolicyPurgeProcessor policyPurgeProcessor;

    @Override
    @Transactional
    public void purgeExpired() {
        policyPurgeProcessor.purgeExpired();
    }
}
