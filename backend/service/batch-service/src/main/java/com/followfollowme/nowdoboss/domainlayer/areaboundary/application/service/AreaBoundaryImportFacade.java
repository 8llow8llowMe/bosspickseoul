package com.followfollowme.nowdoboss.domainlayer.areaboundary.application.service;

import com.followfollowme.nowdoboss.domainlayer.areaboundary.application.port.in.AreaBoundaryImportUseCase;
import com.followfollowme.nowdoboss.domainlayer.areaboundary.application.service.processor.AreaBoundaryImportProcessor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AreaBoundaryImportFacade implements AreaBoundaryImportUseCase {

    private final AreaBoundaryImportProcessor areaBoundaryImportProcessor;

    @Override
    @Transactional
    public void importAreaBoundary() {
        areaBoundaryImportProcessor.importAreaBoundary();
    }
}
