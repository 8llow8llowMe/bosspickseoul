package com.followfollowme.nowdoboss.domainlayer.simulation.adapter.out.persistence;

import com.followfollowme.nowdoboss.domainlayer.simulation.adapter.out.persistence.entity.SimulationFranchiseeEntity;
import com.followfollowme.nowdoboss.domainlayer.simulation.adapter.out.persistence.repository.SimulationFranchiseeRepository;
import com.followfollowme.nowdoboss.domainlayer.simulation.application.port.out.SimulationFranchiseeRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.simulation.domain.model.SimulationFranchisee;
import com.followfollowme.nowdoboss.global.properties.SimulationProperties;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SimulationFranchiseeRepositoryAdapter implements SimulationFranchiseeRepositoryPort {

    private final SimulationFranchiseeRepository simulationFranchiseeRepository;
    private final SimulationProperties simulationProperties;

    @Override
    public Optional<SimulationFranchisee> findById(long franchiseeId) {
        return simulationFranchiseeRepository.findById(franchiseeId).map(this::toDomain);
    }

    @Override
    public List<SimulationFranchisee> findAllByServiceCode(String serviceCode) {
        return simulationFranchiseeRepository
            .findAllByBaseYearAndServiceCode(simulationProperties.dataBaseYear(), serviceCode)
            .stream()
            .map(this::toDomain)
            .toList();
    }

    @Override
    public List<SimulationFranchisee> searchByServiceCode(String serviceCode, String keyword, long lastId) {
        String baseYear = simulationProperties.dataBaseYear();
        List<SimulationFranchiseeEntity> entities = (keyword == null || keyword.isBlank())
            ? simulationFranchiseeRepository.findTop10ByBaseYearAndServiceCodeAndIdGreaterThanOrderByIdAsc(
                baseYear, serviceCode, lastId)
            : simulationFranchiseeRepository.findTop10ByBaseYearAndServiceCodeAndBrandNameContainingAndIdGreaterThanOrderByIdAsc(
                baseYear, serviceCode, keyword, lastId);
        return entities.stream().map(this::toDomain).toList();
    }

    private SimulationFranchisee toDomain(SimulationFranchiseeEntity entity) {
        return SimulationFranchisee.builder()
            .id(entity.getId())
            .baseYear(entity.getBaseYear())
            .serviceCode(entity.getServiceCode())
            .serviceName(entity.getServiceName())
            .brandName(entity.getBrandName())
            .subscription(entity.getSubscription())
            .education(entity.getEducation())
            .deposit(entity.getDeposit())
            .etc(entity.getEtc())
            .totalLevy(entity.getTotalLevy())
            .unitArea(entity.getUnitArea())
            .interior(entity.getInterior())
            .area(entity.getArea())
            .build();
    }
}
