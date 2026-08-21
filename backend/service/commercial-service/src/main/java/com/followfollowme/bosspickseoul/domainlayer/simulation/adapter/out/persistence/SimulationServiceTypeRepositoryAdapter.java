package com.followfollowme.bosspickseoul.domainlayer.simulation.adapter.out.persistence;

import com.followfollowme.bosspickseoul.domainlayer.simulation.adapter.out.persistence.entity.SimulationServiceTypeEntity;
import com.followfollowme.bosspickseoul.domainlayer.simulation.adapter.out.persistence.repository.SimulationServiceTypeRepository;
import com.followfollowme.bosspickseoul.domainlayer.simulation.application.port.out.SimulationServiceTypeRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.simulation.domain.model.SimulationServiceType;
import com.followfollowme.bosspickseoul.global.properties.SimulationProperties;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SimulationServiceTypeRepositoryAdapter implements SimulationServiceTypeRepositoryPort {

    private final SimulationServiceTypeRepository simulationServiceTypeRepository;
    private final SimulationProperties simulationProperties;

    @Override
    public Optional<SimulationServiceType> findByServiceCode(String serviceCode) {
        return simulationServiceTypeRepository
            .findByBaseYearAndServiceCode(simulationProperties.dataBaseYear(), serviceCode)
            .map(this::toDomain);
    }

    private SimulationServiceType toDomain(SimulationServiceTypeEntity entity) {
        return SimulationServiceType.builder()
            .id(entity.getId())
            .baseYear(entity.getBaseYear())
            .serviceCode(entity.getServiceCode())
            .serviceName(entity.getServiceName())
            .smallSize(entity.getSmallSize())
            .mediumSize(entity.getMediumSize())
            .largeSize(entity.getLargeSize())
            .keyMoneyAverage(entity.getKeyMoneyAverage())
            .keyMoneyLevel(entity.getKeyMoneyLevel())
            .keyMoneyRatio(entity.getKeyMoneyRatio())
            .build();
    }
}
