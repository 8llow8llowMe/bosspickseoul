package com.followfollowme.bosspickseoul.domainlayer.simulation.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.simulation.domain.model.SimulationRent;
import java.util.Optional;

public interface SimulationRentRepositoryPort {

    Optional<SimulationRent> findByDistrictCode(String districtCode);
}
