package com.followfollowme.bosspickseoul.domainlayer.policyingestion.application.service;

import com.followfollowme.bosspickseoul.domainlayer.policyingestion.application.model.PolicyCollectSnapshot;
import com.followfollowme.bosspickseoul.domainlayer.policyingestion.application.port.in.PolicyCollectUseCase;
import com.followfollowme.bosspickseoul.domainlayer.policyingestion.application.service.processor.PolicyCollectProcessor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PolicyCollectFacade implements PolicyCollectUseCase {

    private final PolicyCollectProcessor policyCollectProcessor;

    @Override
    public void collect() {
        // 기업마당 HTTP 를 트랜잭션 밖에 둔다. DB 커넥션을 잡은 채 원천을 기다리지 않기 위함이다.
        PolicyCollectSnapshot snapshot = policyCollectProcessor.prepare();
        policyCollectProcessor.commit(snapshot);
    }
}
