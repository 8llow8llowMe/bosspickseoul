package com.followfollowme.bosspickseoul.domainlayer.administration.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.administration.domain.model.IncomeAdministration;
import java.util.Optional;

public interface AdministrationIncomeRepositoryPort {

    Optional<IncomeAdministration> findIncomeByAdministrationCode(String administrationCode, String periodCode);
}
