package com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.administration.domain.model.IncomeAdministration;
import com.followfollowme.bosspickseoul.domainlayer.administration.domain.model.SalesAdministration;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.IncomeCommercial;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.SalesCommercial;
import com.followfollowme.bosspickseoul.domainlayer.district.domain.model.IncomeDistrict;
import com.followfollowme.bosspickseoul.domainlayer.district.domain.model.SalesDistrict;
import java.util.Optional;

public interface CommercialSummaryRepositoryPort {

    Optional<SalesDistrict> findSalesDistrict(String periodCode, String districtCode, String serviceCode);

    Optional<SalesAdministration> findSalesAdministration(String periodCode, String administrationCode, String serviceCode);

    Optional<SalesCommercial> findSalesCommercial(String periodCode, String commercialCode, String serviceCode);

    Optional<IncomeDistrict> findIncomeDistrict(String periodCode, String districtCode);

    Optional<IncomeAdministration> findIncomeAdministration(String periodCode, String administrationCode);

    Optional<IncomeCommercial> findIncomeCommercial(String periodCode, String commercialCode);
}
