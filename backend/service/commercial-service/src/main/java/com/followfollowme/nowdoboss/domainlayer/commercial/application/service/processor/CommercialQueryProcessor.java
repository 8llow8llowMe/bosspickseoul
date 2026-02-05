package com.followfollowme.nowdoboss.domainlayer.commercial.application.service.processor;

import com.followfollowme.nowdoboss.domainlayer.category.application.port.out.ServiceCategoryRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.category.domain.model.ServiceCategory;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.facility.FacilityInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.foottraffic.FootTrafficInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.income.IncomeAndExpenseInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.population.ResidentPopulationInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.sales.SalesInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.store.ServiceCategoryInfo;
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

    public List<ServiceCategoryInfo> getServiceCategoriesByCommercialCode(String commercialCode) {
        // 1. 상권에 존재하는 업종 코드 조회
        List<String> serviceCodes = salesCommercialRepositoryPort.findDistinctServiceCodesByCommercialCode(commercialCode);

        if (serviceCodes.isEmpty()) {
            return List.of();
        }

        // 2. 기준 정보 조회
        List<ServiceCategory> serviceCategories = serviceCategoryRepositoryPort.findByServiceCodeIn(serviceCodes);

        // 3. Info DTO 반환
        return serviceCategories.stream()
            .map(ServiceCategoryInfo::from)
            .toList();
    }

    public FootTrafficInfo getFootTrafficByPeriodCodeAndCommercialCode(String periodCode, String commercialCode) {
        FootTrafficCommercial footTrafficCommercial = footTrafficCommercialRepositoryPort.findByPeriodCodeAndCommercialCode(periodCode,
                commercialCode)
            .orElseThrow(() -> new IllegalArgumentException("유동 인구 정보를 찾을 수 없습니다."));
        return FootTrafficInfo.from(footTrafficCommercial);
    }

    public SalesInfo getSalesByPeriodCodeAndCommercialCodeAndServiceCode(String periodCode, String commercialCode, String serviceCode) {
        SalesCommercial salesCommercial = salesCommercialRepositoryPort.findByPeriodCodeAndCommercialCodeAndServiceCode(periodCode, commercialCode, serviceCode)
            .orElseThrow(() -> new IllegalArgumentException("매출 정보를 찾을 수 없습니다."));
        return SalesInfo.from(salesCommercial);
    }

    public FacilityInfo getFacilityByPeriodAndCommercialCode(String periodCode, String commercialCode) {
        FacilityCommercial facilityCommercial = facilityCommercialRepositoryPort.findByPeriodCodeAndCommercialCode(periodCode, commercialCode)
            .orElseThrow(() -> new IllegalArgumentException("집객시설 정보를 찾을 수 없습니다."));
        return FacilityInfo.from(facilityCommercial);
    }

    public ResidentPopulationInfo getPopulationByPeriodAndCommercialCode(String periodCode, String commercialCode) {
        PopulationCommercial populationCommercial = populationCommercialRepositoryPort.findByPeriodCodeAndCommercialCode(periodCode, commercialCode)
            .orElseThrow(() -> new IllegalArgumentException("상주인구 정보를 찾을 수 없습니다."));
        return ResidentPopulationInfo.from(populationCommercial);
    }

    public IncomeAndExpenseInfo getIncomeByPeriodCodeAndCommercialCode(String periodCode, String commercialCode) {
        IncomeCommercial incomeCommercial = incomeCommercialRepositoryPort.findByPeriodCodeAndCommercialCode(periodCode, commercialCode)
            .orElseThrow(() -> new IllegalArgumentException("소득소비 정보를 찾을 수 없습니다."));
        return IncomeAndExpenseInfo.from(incomeCommercial);
    }
}
