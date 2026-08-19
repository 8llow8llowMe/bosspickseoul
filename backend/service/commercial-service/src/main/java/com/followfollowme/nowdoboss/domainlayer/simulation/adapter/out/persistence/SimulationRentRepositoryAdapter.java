package com.followfollowme.nowdoboss.domainlayer.simulation.adapter.out.persistence;

import com.followfollowme.nowdoboss.domainlayer.simulation.adapter.out.persistence.entity.SimulationRentEntity;
import com.followfollowme.nowdoboss.domainlayer.simulation.adapter.out.persistence.repository.SimulationRentRepository;
import com.followfollowme.nowdoboss.domainlayer.simulation.application.port.out.SimulationRentRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.simulation.domain.model.SimulationRent;
import com.followfollowme.nowdoboss.global.properties.SimulationProperties;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SimulationRentRepositoryAdapter implements SimulationRentRepositoryPort {

    private final SimulationRentRepository simulationRentRepository;
    private final SimulationProperties simulationProperties;

    @Override
    public Optional<SimulationRent> findByDistrictCode(String districtCode) {
        return simulationRentRepository
            .findByBaseYearAndDistrictCode(simulationProperties.dataBaseYear(), districtCode)
            .map(this::toDomain);
    }

    private SimulationRent toDomain(SimulationRentEntity entity) {
        return SimulationRent.builder()
            .id(entity.getId())
            .baseYear(entity.getBaseYear())
            .districtCode(entity.getDistrictCode())
            .districtName(entity.getDistrictName())
            .firstFloorRent(entity.getFirstFloorRent())
            .otherFloorRent(entity.getOtherFloorRent())
            .totalRent(entity.getTotalRent())
            .build();
    }
}
