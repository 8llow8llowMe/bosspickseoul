package com.followfollowme.nowdoboss.domainlayer.simulation.application.port.out;

import com.followfollowme.nowdoboss.domainlayer.simulation.domain.model.SimulationServiceType;
import java.util.Optional;

public interface SimulationServiceTypeRepositoryPort {

    Optional<SimulationServiceType> findByServiceCode(String serviceCode);
}
