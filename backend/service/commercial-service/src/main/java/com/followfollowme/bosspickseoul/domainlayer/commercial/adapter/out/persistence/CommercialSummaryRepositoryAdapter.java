package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence;

import com.followfollowme.bosspickseoul.domainlayer.administration.adapter.out.persistence.entity.IncomeAdministrationEntity;
import com.followfollowme.bosspickseoul.domainlayer.administration.adapter.out.persistence.entity.SalesAdministrationEntity;
import com.followfollowme.bosspickseoul.domainlayer.administration.adapter.out.persistence.repository.IncomeAdministrationRepository;
import com.followfollowme.bosspickseoul.domainlayer.administration.adapter.out.persistence.repository.SalesAdministrationRepository;
import com.followfollowme.bosspickseoul.domainlayer.administration.domain.model.IncomeAdministration;
import com.followfollowme.bosspickseoul.domainlayer.administration.domain.model.SalesAdministration;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.repository.IncomeCommercialRepository;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.repository.SalesCommercialRepository;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.mapper.IncomeCommercialMapper;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.mapper.SalesCommercialMapper;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.CommercialSummaryRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.IncomeCommercial;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.SalesCommercial;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.repository.IncomeDistrictRepository;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.repository.SalesDistrictRepository;
import com.followfollowme.bosspickseoul.domainlayer.district.application.mapper.IncomeDistrictMapper;
import com.followfollowme.bosspickseoul.domainlayer.district.application.mapper.SalesDistrictMapper;
import com.followfollowme.bosspickseoul.domainlayer.district.domain.model.IncomeDistrict;
import com.followfollowme.bosspickseoul.domainlayer.district.domain.model.SalesDistrict;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CommercialSummaryRepositoryAdapter implements CommercialSummaryRepositoryPort {

    private final SalesDistrictRepository salesDistrictRepository;
    private final SalesAdministrationRepository salesAdministrationRepository;
    private final SalesCommercialRepository salesCommercialRepository;
    private final IncomeDistrictRepository incomeDistrictRepository;
    private final IncomeAdministrationRepository incomeAdministrationRepository;
    private final IncomeCommercialRepository incomeCommercialRepository;

    private final SalesDistrictMapper salesDistrictMapper;
    private final SalesCommercialMapper salesCommercialMapper;
    private final IncomeDistrictMapper incomeDistrictMapper;
    private final IncomeCommercialMapper incomeCommercialMapper;

    @Override
    public Optional<SalesDistrict> findSalesDistrict(String periodCode, String districtCode, String serviceCode) {
        return salesDistrictRepository.findByPeriodCodeAndDistrictCodeAndServiceCode(periodCode, districtCode, serviceCode)
            .map(salesDistrictMapper::toDomainFromEntity);
    }

    @Override
    public Optional<SalesAdministration> findSalesAdministration(String periodCode, String administrationCode, String serviceCode) {
        return salesAdministrationRepository
            .findByPeriodCodeAndAdministrationCodeAndServiceCode(periodCode, administrationCode, serviceCode)
            .map(this::toSalesAdministrationDomain);
    }

    @Override
    public Optional<SalesCommercial> findSalesCommercial(String periodCode, String commercialCode, String serviceCode) {
        return salesCommercialRepository.findByPeriodCodeAndCommercialCodeAndServiceCode(periodCode, commercialCode, serviceCode)
            .map(salesCommercialMapper::toDomainFromEntity);
    }

    @Override
    public Optional<IncomeDistrict> findIncomeDistrict(String periodCode, String districtCode) {
        return incomeDistrictRepository.findByPeriodCodeAndDistrictCode(periodCode, districtCode)
            .map(incomeDistrictMapper::toDomainFromEntity);
    }

    @Override
    public Optional<IncomeAdministration> findIncomeAdministration(String periodCode, String administrationCode) {
        return incomeAdministrationRepository.findByPeriodCodeAndAdministrationCode(periodCode, administrationCode)
            .map(this::toIncomeAdministrationDomain);
    }

    @Override
    public Optional<IncomeCommercial> findIncomeCommercial(String periodCode, String commercialCode) {
        return incomeCommercialRepository.findByPeriodCodeAndCommercialCode(periodCode, commercialCode)
            .map(incomeCommercialMapper::toDomainFromEntity);
    }

    private SalesAdministration toSalesAdministrationDomain(SalesAdministrationEntity entity) {
        return SalesAdministration.builder()
            .id(entity.getId())
            .periodCode(entity.getPeriodCode())
            .administrationCode(entity.getAdministrationCode())
            .administrationName(entity.getAdministrationName())
            .serviceCode(entity.getServiceCode())
            .serviceName(entity.getServiceName())
            .serviceType(entity.getServiceType())
            .monthlySalesAmount(entity.getMonthlySalesAmount())
            .weekdaySalesAmount(entity.getWeekdaySalesAmount())
            .weekendSalesAmount(entity.getWeekendSalesAmount())
            .build();
    }

    private IncomeAdministration toIncomeAdministrationDomain(IncomeAdministrationEntity entity) {
        return IncomeAdministration.builder()
            .id(entity.getId())
            .periodCode(entity.getPeriodCode())
            .administrationCode(entity.getAdministrationCode())
            .administrationName(entity.getAdministrationName())
            .totalExpenseAmount(entity.getTotalExpenseAmount())
            .build();
    }
}
