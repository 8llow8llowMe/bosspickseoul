package com.followfollowme.nowdoboss.domainlayer.simulation.adapter.out.persistence;

import com.followfollowme.nowdoboss.domainlayer.simulation.adapter.out.persistence.entity.SimulationHistoryEntity;
import com.followfollowme.nowdoboss.domainlayer.simulation.adapter.out.persistence.repository.SimulationHistoryRepository;
import com.followfollowme.nowdoboss.domainlayer.simulation.application.port.out.SimulationHistoryRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.simulation.application.port.out.query.SimulationHistoryPageQueryResult;
import com.followfollowme.nowdoboss.domainlayer.simulation.domain.model.SimulationHistory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SimulationHistoryRepositoryAdapter implements SimulationHistoryRepositoryPort {

    private final SimulationHistoryRepository simulationHistoryRepository;

    @Override
    public SimulationHistory save(SimulationHistory history) {
        SimulationHistoryEntity saved = simulationHistoryRepository.save(toEntity(history));
        return toDomain(saved);
    }

    @Override
    public SimulationHistoryPageQueryResult findAllByMemberId(long memberId, int page, int size) {
        Page<SimulationHistoryEntity> entities =
            simulationHistoryRepository.findAllByMemberIdOrderByCreatedAtDesc(memberId, PageRequest.of(page, size));
        return SimulationHistoryPageQueryResult.builder()
            .histories(entities.getContent().stream().map(this::toDomain).toList())
            .page(entities.getNumber())
            .size(entities.getSize())
            .totalElements(entities.getTotalElements())
            .totalPages(entities.getTotalPages())
            .build();
    }

    private SimulationHistoryEntity toEntity(SimulationHistory history) {
        return SimulationHistoryEntity.builder()
            .id(history.id())
            .memberId(history.memberId())
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

    private SimulationHistory toDomain(SimulationHistoryEntity entity) {
        return SimulationHistory.builder()
            .id(entity.getId())
            .memberId(entity.getMemberId())
            .franchisee(entity.getFranchisee())
            .brandName(entity.getBrandName())
            .districtCode(entity.getDistrictCode())
            .districtName(entity.getDistrictName())
            .serviceCode(entity.getServiceCode())
            .serviceName(entity.getServiceName())
            .storeSize(entity.getStoreSize())
            .floorType(entity.getFloorType())
            .totalPrice(entity.getTotalPrice())
            .dataBaseYear(entity.getDataBaseYear())
            .createdAt(entity.getCreatedAt())
            .build();
    }
}
