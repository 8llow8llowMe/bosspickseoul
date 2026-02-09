package com.followfollowme.nowdoboss.domainlayer.commercial.application.service.processor;

import com.followfollowme.nowdoboss.domainlayer.category.application.port.out.ServiceCategoryRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.category.domain.model.ServiceCategory;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.facility.CommercialFacilityInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.foottraffic.CommercialFootTrafficInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.income.CommercialIncomeAndExpenseInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.population.CommercialResidentPopulationInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.sales.CommercialSalesInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.store.CommercialServiceCategoryInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.port.out.FacilityCommercialRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.port.out.FootTrafficCommercialRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.port.out.IncomeCommercialRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.port.out.PopulationCommercialRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.port.out.SalesCommercialRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.FacilityCommercial;
import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.FootTrafficCommercial;
import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.IncomeCommercial;
import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.PopulationCommercial;
import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.SalesCommercial;
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

    public List<CommercialServiceCategoryInfo> getServiceCategoriesByCommercialCode(String commercialCode) {
        // 1. 상권에 존재하는 업종 코드 조회
        List<String> serviceCodes = salesCommercialRepositoryPort.findDistinctServiceCodesByCommercialCode(commercialCode);

        if (serviceCodes.isEmpty()) {
            return List.of();
        }

        // 2. 기준 정보 조회
        List<ServiceCategory> serviceCategories = serviceCategoryRepositoryPort.findByServiceCodeIn(serviceCodes);

        // 3. Info DTO 반환
        return serviceCategories.stream()
            .map(CommercialServiceCategoryInfo::from)
            .toList();
    }

    public CommercialFootTrafficInfo getFootTrafficByPeriodCodeAndCommercialCode(String periodCode, String commercialCode) {
        FootTrafficCommercial footTrafficCommercial = footTrafficCommercialRepositoryPort.findByPeriodCodeAndCommercialCode(periodCode,
                commercialCode)
            .orElseThrow(() -> new IllegalArgumentException("유동 인구 정보를 찾을 수 없습니다."));
        return CommercialFootTrafficInfo.from(footTrafficCommercial);
    }

    public CommercialSalesInfo getSalesByPeriodCodeAndCommercialCodeAndServiceCode(String periodCode, String commercialCode, String serviceCode) {
        SalesCommercial salesCommercial = salesCommercialRepositoryPort.findByPeriodCodeAndCommercialCodeAndServiceCode(periodCode, commercialCode, serviceCode)
            .orElseThrow(() -> new IllegalArgumentException("매출 정보를 찾을 수 없습니다."));
        return CommercialSalesInfo.from(salesCommercial);
    }

    public CommercialFacilityInfo getFacilityByPeriodAndCommercialCode(String periodCode, String commercialCode) {
        FacilityCommercial facilityCommercial = facilityCommercialRepositoryPort.findByPeriodCodeAndCommercialCode(periodCode, commercialCode)
            .orElseThrow(() -> new IllegalArgumentException("집객시설 정보를 찾을 수 없습니다."));
        return CommercialFacilityInfo.from(facilityCommercial);
    }

    public CommercialResidentPopulationInfo getPopulationByPeriodAndCommercialCode(String periodCode, String commercialCode) {
        PopulationCommercial populationCommercial = populationCommercialRepositoryPort.findByPeriodCodeAndCommercialCode(periodCode, commercialCode)
            .orElseThrow(() -> new IllegalArgumentException("상주인구 정보를 찾을 수 없습니다."));
        return CommercialResidentPopulationInfo.from(populationCommercial);
    }

    public CommercialIncomeAndExpenseInfo getIncomeByPeriodCodeAndCommercialCode(String periodCode, String commercialCode) {
        IncomeCommercial incomeCommercial = incomeCommercialRepositoryPort.findByPeriodCodeAndCommercialCode(periodCode, commercialCode)
            .orElseThrow(() -> new IllegalArgumentException("소득소비 정보를 찾을 수 없습니다."));
        return CommercialIncomeAndExpenseInfo.from(incomeCommercial);
    }
}
