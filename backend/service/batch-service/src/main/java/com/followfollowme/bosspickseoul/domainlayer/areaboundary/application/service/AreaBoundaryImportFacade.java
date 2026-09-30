package com.followfollowme.bosspickseoul.domainlayer.areaboundary.application.service;

import com.followfollowme.bosspickseoul.domainlayer.areaboundary.application.port.in.AreaBoundaryImportUseCase;
import com.followfollowme.bosspickseoul.domainlayer.areaboundary.application.service.processor.AreaBoundaryImportProcessor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AreaBoundaryImportFacade implements AreaBoundaryImportUseCase {

    private final AreaBoundaryImportProcessor areaBoundaryImportProcessor;

    @Override
    // 영역 좌표는 기본 DataSource(district). 무자격 @Transactional 은 commercial 매니저로 간다.
    @Transactional("districtTransactionManager")
    public void importAreaBoundary() {
        areaBoundaryImportProcessor.importAreaBoundary();
    }
}
