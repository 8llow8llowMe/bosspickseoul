package com.followfollowme.bosspickseoul.domainlayer.administration.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.administration.domain.model.IncomeAdministration;
import com.followfollowme.bosspickseoul.domainlayer.administration.domain.model.SalesAdministration;
import com.followfollowme.bosspickseoul.domainlayer.administration.domain.model.StoreAdministration;
import java.util.List;
import java.util.Optional;

public interface AdministrationAnalysisRepositoryPort {

    List<SalesAdministration> findSales(String periodCode, String administrationCode);

    List<StoreAdministration> findStores(String periodCode, String administrationCode);

    Optional<IncomeAdministration> findIncome(String periodCode, String administrationCode);
}
