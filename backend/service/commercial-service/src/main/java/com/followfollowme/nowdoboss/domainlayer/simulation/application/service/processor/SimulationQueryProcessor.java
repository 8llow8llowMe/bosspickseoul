package com.followfollowme.nowdoboss.domainlayer.simulation.application.service.processor;

import com.followfollowme.nowdoboss.domainlayer.simulation.application.exception.SimulationErrorCode;
import com.followfollowme.nowdoboss.domainlayer.simulation.application.exception.SimulationException;
import com.followfollowme.nowdoboss.domainlayer.simulation.application.info.SimulationFranchiseeSearchInfo;
import com.followfollowme.nowdoboss.domainlayer.simulation.application.info.SimulationSizeInfo;
import com.followfollowme.nowdoboss.domainlayer.simulation.application.info.SimulationStoreSizeInfo;
import com.followfollowme.nowdoboss.domainlayer.simulation.application.port.out.SimulationFranchiseeRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.simulation.application.port.out.SimulationServiceTypeRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.simulation.domain.model.SimulationServiceType;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SimulationQueryProcessor {

    private static final long FIRST_CURSOR = 0L;

    private final SimulationServiceTypeRepositoryPort simulationServiceTypeRepositoryPort;
    private final SimulationFranchiseeRepositoryPort simulationFranchiseeRepositoryPort;

    public SimulationStoreSizeInfo getStoreSizes(String serviceCode) {
        SimulationServiceType serviceType = simulationServiceTypeRepositoryPort.findByServiceCode(serviceCode)
            .orElseThrow(() -> new SimulationException(SimulationErrorCode.SERVICE_TYPE_NOT_FOUND));
        return SimulationStoreSizeInfo.builder()
            .serviceCode(serviceType.serviceCode())
            .serviceName(serviceType.serviceName())
            .dataBaseYear(serviceType.baseYear())
            .small(SimulationSizeInfo.fromSquareMeter(serviceType.smallSize()))
            .medium(SimulationSizeInfo.fromSquareMeter(serviceType.mediumSize()))
            .large(SimulationSizeInfo.fromSquareMeter(serviceType.largeSize()))
            .build();
    }

    public List<SimulationFranchiseeSearchInfo> searchFranchisees(String serviceCode, String keyword, Long lastId) {
        long cursor = lastId == null ? FIRST_CURSOR : lastId;
        return simulationFranchiseeRepositoryPort.searchByServiceCode(serviceCode, keyword, cursor)
            .stream()
            .map(franchisee -> SimulationFranchiseeSearchInfo.builder()
                .franchiseeId(franchisee.id())
                .brandName(franchisee.brandName())
                .serviceCode(franchisee.serviceCode())
                .serviceName(franchisee.serviceName())
                .build())
            .toList();
    }
}
