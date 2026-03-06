package com.followfollowme.nowdoboss.domainlayer.areaboundarybatch.application.service;

import com.followfollowme.nowdoboss.domainlayer.areaboundarybatch.application.port.in.AreaBoundarySeedUseCase;
import com.followfollowme.nowdoboss.domainlayer.areaboundarybatch.application.service.processor.AreaBoundarySeedProcessor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AreaBoundarySeedFacade implements AreaBoundarySeedUseCase {

    private final AreaBoundarySeedProcessor areaBoundarySeedProcessor;

    @Override
    @Transactional
    public void seedAreaBoundary() {
        areaBoundarySeedProcessor.seedAreaBoundary();
    }
}
