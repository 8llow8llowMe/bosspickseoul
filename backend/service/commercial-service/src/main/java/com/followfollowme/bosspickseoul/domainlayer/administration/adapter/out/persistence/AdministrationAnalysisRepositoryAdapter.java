package com.followfollowme.bosspickseoul.domainlayer.administration.adapter.out.persistence;

import com.followfollowme.bosspickseoul.domainlayer.administration.adapter.out.persistence.entity.IncomeAdministrationEntity;
import com.followfollowme.bosspickseoul.domainlayer.administration.adapter.out.persistence.entity.SalesAdministrationEntity;
import com.followfollowme.bosspickseoul.domainlayer.administration.adapter.out.persistence.repository.IncomeAdministrationRepository;
import com.followfollowme.bosspickseoul.domainlayer.administration.adapter.out.persistence.repository.SalesAdministrationRepository;
import com.followfollowme.bosspickseoul.domainlayer.administration.adapter.out.persistence.repository.StoreAdministrationRepository;
import com.followfollowme.bosspickseoul.domainlayer.administration.application.mapper.StoreAdministrationMapper;
import com.followfollowme.bosspickseoul.domainlayer.administration.application.port.out.AdministrationAnalysisRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.administration.domain.model.IncomeAdministration;
import com.followfollowme.bosspickseoul.domainlayer.administration.domain.model.SalesAdministration;
import com.followfollowme.bosspickseoul.domainlayer.administration.domain.model.StoreAdministration;
import com.followfollowme.bosspickseoul.global.properties.DatasetSpatialVersion;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AdministrationAnalysisRepositoryAdapter implements AdministrationAnalysisRepositoryPort {

    private final SalesAdministrationRepository salesAdministrationRepository;
    private final StoreAdministrationRepository storeAdministrationRepository;
    private final IncomeAdministrationRepository incomeAdministrationRepository;
    private final StoreAdministrationMapper storeAdministrationMapper;
    private final DatasetSpatialVersion datasetSpatialVersion;

    @Override
    public List<SalesAdministration> findSales(String periodCode, String administrationCode) {
        return salesAdministrationRepository
            .findAllByPeriodCodeAndAdministrationCodeAndSpatialVersion(
                periodCode, administrationCode, datasetSpatialVersion.value())
            .stream()
            .map(this::toSalesAdministration)
            .toList();
    }

    @Override
    public List<StoreAdministration> findStores(String periodCode, String administrationCode) {
        return storeAdministrationRepository
            .findAllByPeriodCodeAndAdministrationCodeAndSpatialVersion(
                periodCode, administrationCode, datasetSpatialVersion.value())
            .stream()
            .map(storeAdministrationMapper::toDomainFromEntity)
            .toList();
    }

    @Override
    public Optional<IncomeAdministration> findIncome(String periodCode, String administrationCode) {
        return incomeAdministrationRepository
            .findByPeriodCodeAndAdministrationCodeAndSpatialVersion(
                periodCode, administrationCode, datasetSpatialVersion.value())
            .map(this::toIncomeAdministration);
    }

    private SalesAdministration toSalesAdministration(SalesAdministrationEntity entity) {
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

    private IncomeAdministration toIncomeAdministration(IncomeAdministrationEntity entity) {
        return IncomeAdministration.builder()
            .id(entity.getId())
            .periodCode(entity.getPeriodCode())
            .administrationCode(entity.getAdministrationCode())
            .administrationName(entity.getAdministrationName())
            .totalExpenseAmount(entity.getTotalExpenseAmount())
            .build();
    }
}
