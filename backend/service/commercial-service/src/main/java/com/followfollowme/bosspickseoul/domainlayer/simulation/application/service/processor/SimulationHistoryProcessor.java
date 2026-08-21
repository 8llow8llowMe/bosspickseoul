package com.followfollowme.bosspickseoul.domainlayer.simulation.application.service.processor;

import com.followfollowme.bosspickseoul.domainlayer.simulation.application.command.SimulationHistorySaveCommand;
import com.followfollowme.bosspickseoul.domainlayer.simulation.application.exception.SimulationErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.simulation.application.exception.SimulationException;
import com.followfollowme.bosspickseoul.domainlayer.simulation.application.info.SimulationHistoryInfo;
import com.followfollowme.bosspickseoul.domainlayer.simulation.application.info.SimulationHistoryPageInfo;
import com.followfollowme.bosspickseoul.domainlayer.simulation.application.port.out.SimulationFranchiseeRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.simulation.application.port.out.SimulationHistoryRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.simulation.application.port.out.SimulationRentRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.simulation.application.port.out.SimulationServiceTypeRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.simulation.application.port.out.query.SimulationHistoryPageQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.simulation.domain.model.SimulationFranchisee;
import com.followfollowme.bosspickseoul.domainlayer.simulation.domain.model.SimulationHistory;
import com.followfollowme.bosspickseoul.domainlayer.simulation.domain.model.SimulationRent;
import com.followfollowme.bosspickseoul.domainlayer.simulation.domain.model.SimulationServiceType;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SimulationHistoryProcessor {

    private final SimulationHistoryRepositoryPort simulationHistoryRepositoryPort;
    private final SimulationServiceTypeRepositoryPort simulationServiceTypeRepositoryPort;
    private final SimulationRentRepositoryPort simulationRentRepositoryPort;
    private final SimulationFranchiseeRepositoryPort simulationFranchiseeRepositoryPort;

    /**
     * 표시용 명칭(자치구명/업종명/브랜드명)은 요청을 신뢰하지 않고 기준 테이블에서 다시 채운다.
     */
    public SimulationHistoryInfo save(long memberId, SimulationHistorySaveCommand command) {
        SimulationServiceType serviceType = simulationServiceTypeRepositoryPort.findByServiceCode(command.serviceCode())
            .orElseThrow(() -> new SimulationException(SimulationErrorCode.SERVICE_TYPE_NOT_FOUND));
        SimulationRent rent = simulationRentRepositoryPort.findByDistrictCode(command.districtCode())
            .orElseThrow(() -> new SimulationException(SimulationErrorCode.RENT_NOT_FOUND));
        String brandName = resolveBrandName(command);

        SimulationHistory saved = simulationHistoryRepositoryPort.save(SimulationHistory.builder()
            .memberId(memberId)
            .franchisee(command.franchisee())
            .brandName(brandName)
            .districtCode(rent.districtCode())
            .districtName(rent.districtName())
            .serviceCode(serviceType.serviceCode())
            .serviceName(serviceType.serviceName())
            .storeSize(command.storeSize())
            .floorType(command.floorType())
            .totalPrice(command.totalPrice())
            .dataBaseYear(serviceType.baseYear())
            .createdAt(LocalDateTime.now())
            .build());
        return toInfo(saved);
    }

    public SimulationHistoryPageInfo getHistories(long memberId, int page, int size) {
        SimulationHistoryPageQueryResult histories =
            simulationHistoryRepositoryPort.findAllByMemberId(memberId, page, size);
        return SimulationHistoryPageInfo.builder()
            .histories(histories.histories().stream().map(this::toInfo).toList())
            .page(histories.page())
            .size(histories.size())
            .totalElements(histories.totalElements())
            .totalPages(histories.totalPages())
            .build();
    }

    private String resolveBrandName(SimulationHistorySaveCommand command) {
        if (!command.franchisee()) {
            return null;
        }
        if (command.franchiseeId() == null) {
            throw new SimulationException(SimulationErrorCode.FRANCHISEE_REQUIRED);
        }
        return simulationFranchiseeRepositoryPort.findById(command.franchiseeId())
            .map(SimulationFranchisee::brandName)
            .orElseThrow(() -> new SimulationException(SimulationErrorCode.FRANCHISEE_NOT_FOUND));
    }

    private SimulationHistoryInfo toInfo(SimulationHistory history) {
        return SimulationHistoryInfo.builder()
            .historyId(history.id())
            .franchisee(history.franchisee())
            .brandName(history.brandName())
            .districtCode(history.districtCode())
            .districtName(history.districtName())
            .serviceCode(history.serviceCode())
            .serviceName(history.serviceName())
            .storeSize(history.storeSize())
            .floorType(history.floorType())
            .totalPrice(history.totalPrice())
            .dataBaseYear(history.dataBaseYear())
            .createdAt(history.createdAt())
            .build();
    }
}
