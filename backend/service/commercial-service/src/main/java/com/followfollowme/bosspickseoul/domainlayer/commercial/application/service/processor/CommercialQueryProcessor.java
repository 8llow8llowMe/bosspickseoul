package com.followfollowme.bosspickseoul.domainlayer.commercial.application.service.processor;

import com.followfollowme.bosspickseoul.domainlayer.category.application.port.out.ServiceCategoryRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.category.domain.model.ServiceCategory;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.exception.CommercialErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.exception.CommercialException;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.facility.CommercialFacilityInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.foottraffic.CommercialFootTrafficInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.income.CommercialIncomeAndExpenseInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.population.CommercialResidentPopulationInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.sales.CommercialSalesInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.store.CommercialServiceCategoryInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.summary.CommercialPeerStoreInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.summary.CommercialStoreAnalysisInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.FacilityCommercialRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.FootTrafficCommercialRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.IncomeCommercialRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.PopulationCommercialRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.SalesCommercialRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.StoreCommercialRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.FacilityCommercial;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.FootTrafficCommercial;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.IncomeCommercial;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.PopulationCommercial;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.SalesCommercial;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.StoreCommercial;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CommercialQueryProcessor {

    private final SalesCommercialRepositoryPort salesCommercialRepositoryPort;
    private final ServiceCategoryRepositoryPort serviceCategoryRepositoryPort;
    private final FootTrafficCommercialRepositoryPort footTrafficCommercialRepositoryPort;
    private final FacilityCommercialRepositoryPort facilityCommercialRepositoryPort;
    private final PopulationCommercialRepositoryPort populationCommercialRepositoryPort;
    private final IncomeCommercialRepositoryPort incomeCommercialRepositoryPort;
    private final StoreCommercialRepositoryPort storeCommercialRepositoryPort;

    public List<CommercialServiceCategoryInfo> getServiceCategoriesByCommercialCode(String commercialCode) {
        List<String> serviceCodes = salesCommercialRepositoryPort.findDistinctServiceCodesByCommercialCode(commercialCode);

        if (serviceCodes.isEmpty()) {
            return List.of();
        }

        List<ServiceCategory> serviceCategories = serviceCategoryRepositoryPort.findByServiceCodeIn(serviceCodes);

        return serviceCategories.stream()
            .map(CommercialServiceCategoryInfo::from)
            .toList();
    }

    public CommercialFootTrafficInfo getFootTrafficByPeriodCodeAndCommercialCode(String periodCode, String commercialCode) {
        FootTrafficCommercial footTrafficCommercial = footTrafficCommercialRepositoryPort.findByPeriodCodeAndCommercialCode(periodCode,
                commercialCode)
            .orElseThrow(() -> new CommercialException(CommercialErrorCode.FOOT_TRAFFIC_NOT_FOUND));
        return CommercialFootTrafficInfo.from(footTrafficCommercial);
    }

    public CommercialSalesInfo getSalesByPeriodCodeAndCommercialCodeAndServiceCode(
        String periodCode, String commercialCode, String serviceCode
    ) {
        SalesCommercial salesCommercial = salesCommercialRepositoryPort
            .findByPeriodCodeAndCommercialCodeAndServiceCode(periodCode, commercialCode, serviceCode)
            .orElseThrow(() -> new CommercialException(CommercialErrorCode.SALES_NOT_FOUND));
        return CommercialSalesInfo.from(salesCommercial);
    }

    public CommercialFacilityInfo getFacilityByPeriodAndCommercialCode(String periodCode, String commercialCode) {
        FacilityCommercial facilityCommercial = facilityCommercialRepositoryPort
            .findByPeriodCodeAndCommercialCode(periodCode, commercialCode)
            .orElseThrow(() -> new CommercialException(CommercialErrorCode.FACILITY_NOT_FOUND));
        return CommercialFacilityInfo.from(facilityCommercial);
    }

    public CommercialResidentPopulationInfo getPopulationByPeriodAndCommercialCode(String periodCode, String commercialCode) {
        PopulationCommercial populationCommercial = populationCommercialRepositoryPort
            .findByPeriodCodeAndCommercialCode(periodCode, commercialCode)
            .orElseThrow(() -> new CommercialException(CommercialErrorCode.RESIDENT_POPULATION_NOT_FOUND));
        return CommercialResidentPopulationInfo.from(populationCommercial);
    }

    public CommercialIncomeAndExpenseInfo getIncomeByPeriodCodeAndCommercialCode(String periodCode, String commercialCode) {
        IncomeCommercial incomeCommercial = incomeCommercialRepositoryPort.findByPeriodCodeAndCommercialCode(periodCode, commercialCode)
            .orElseThrow(() -> new CommercialException(CommercialErrorCode.INCOME_NOT_FOUND));
        return CommercialIncomeAndExpenseInfo.from(incomeCommercial);
    }

    public CommercialStoreAnalysisInfo getStoreByPeriodCodeAndCommercialCodeAndServiceCode(
        String periodCode,
        String commercialCode,
        String serviceCode
    ) {
        StoreCommercial targetStore = storeCommercialRepositoryPort.findByPeriodCodeAndCommercialCodeAndServiceCode(
                periodCode, commercialCode, serviceCode)
            .orElseThrow(() -> new CommercialException(CommercialErrorCode.STORE_NOT_FOUND));

        List<CommercialPeerStoreInfo> peerStores = storeCommercialRepositoryPort.findByPeriodCodeAndCommercialCodeAndServiceType(
                periodCode, commercialCode, targetStore.serviceType())
            .stream()
            .filter(store -> !store.serviceCode().equals(serviceCode))
            .map(CommercialPeerStoreInfo::from)
            .toList();

        return CommercialStoreAnalysisInfo.of(targetStore, peerStores);
    }
}