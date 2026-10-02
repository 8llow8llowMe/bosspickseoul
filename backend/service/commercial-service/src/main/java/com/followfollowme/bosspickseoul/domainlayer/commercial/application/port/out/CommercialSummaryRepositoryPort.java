package com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.administration.domain.model.IncomeAdministration;
import com.followfollowme.bosspickseoul.domainlayer.administration.domain.model.SalesAdministration;
import com.followfollowme.bosspickseoul.domainlayer.administration.domain.model.StoreAdministration;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.IncomeCommercial;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.SalesCommercial;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.StoreCommercial;
import com.followfollowme.bosspickseoul.domainlayer.district.domain.model.IncomeDistrict;
import com.followfollowme.bosspickseoul.domainlayer.district.domain.model.SalesDistrict;
import com.followfollowme.bosspickseoul.domainlayer.district.domain.model.StoreDistrict;
import java.util.Optional;

public interface CommercialSummaryRepositoryPort {

    Optional<SalesDistrict> findSalesDistrict(String periodCode, String districtCode, String serviceCode);

    Optional<SalesAdministration> findSalesAdministration(String periodCode, String administrationCode, String serviceCode);

    Optional<SalesCommercial> findSalesCommercial(String periodCode, String commercialCode, String serviceCode);

    Optional<IncomeDistrict> findIncomeDistrict(String periodCode, String districtCode);

    Optional<IncomeAdministration> findIncomeAdministration(String periodCode, String administrationCode);

    Optional<IncomeCommercial> findIncomeCommercial(String periodCode, String commercialCode);

    // 상권 벤치마크의 점포당 매출 지수(이슈 #485)가 매출 요약과 같은 세 단위·같은 업종의 점포 수를 읽는다.
    Optional<StoreDistrict> findStoreDistrict(String periodCode, String districtCode, String serviceCode);

    Optional<StoreAdministration> findStoreAdministration(String periodCode, String administrationCode, String serviceCode);

    Optional<StoreCommercial> findStoreCommercial(String periodCode, String commercialCode, String serviceCode);
}
