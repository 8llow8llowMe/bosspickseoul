package com.followfollowme.nowdoboss.domainlayer.administration.adapter.out.persistence;

import com.followfollowme.nowdoboss.domainlayer.administration.adapter.out.persistence.entity.IncomeAdministrationEntity;
import com.followfollowme.nowdoboss.domainlayer.administration.adapter.out.persistence.entity.SalesAdministrationEntity;
import com.followfollowme.nowdoboss.domainlayer.administration.adapter.out.persistence.entity.StoreAdministrationEntity;
import com.followfollowme.nowdoboss.domainlayer.administration.adapter.out.persistence.repository.IncomeAdministrationRepository;
import com.followfollowme.nowdoboss.domainlayer.administration.adapter.out.persistence.repository.SalesAdministrationRepository;
import com.followfollowme.nowdoboss.domainlayer.administration.adapter.out.persistence.repository.StoreAdministrationRepository;
import com.followfollowme.nowdoboss.domainlayer.administration.application.port.out.AdministrationAnalysisRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.administration.domain.model.IncomeAdministration;
import com.followfollowme.nowdoboss.domainlayer.administration.domain.model.SalesAdministration;
import com.followfollowme.nowdoboss.domainlayer.administration.domain.model.StoreAdministration;
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

    @Override
    public List<SalesAdministration> findSales(String periodCode, String administrationCode) {
        return salesAdministrationRepository.findAllByPeriodCodeAndAdministrationCode(periodCode, administrationCode)
            .stream()
            .map(this::toSalesAdministration)
            .toList();
    }

    @Override
    public List<StoreAdministration> findStores(String periodCode, String administrationCode) {
        return storeAdministrationRepository.findAllByPeriodCodeAndAdministrationCode(periodCode, administrationCode)
            .stream()
            .map(this::toStoreAdministration)
            .toList();
    }

    @Override
    public Optional<IncomeAdministration> findIncome(String periodCode, String administrationCode) {
        return incomeAdministrationRepository.findByPeriodCodeAndAdministrationCode(periodCode, administrationCode)
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

    private StoreAdministration toStoreAdministration(StoreAdministrationEntity entity) {
        return StoreAdministration.builder()
            .id(entity.getId())
            .periodCode(entity.getPeriodCode())
            .administrationCode(entity.getAdministrationCode())
            .administrationName(entity.getAdministrationName())
            .serviceCode(entity.getServiceCode())
            .serviceName(entity.getServiceName())
            .serviceType(entity.getServiceType())
            .totalStoreCount(entity.getTotalStoreCount())
            .similarStoreCount(entity.getSimilarStoreCount())
            .openedStoreCount(entity.getOpenedStoreCount())
            .closedStoreCount(entity.getClosedStoreCount())
            .franchiseStoreCount(entity.getFranchiseStoreCount())
            .openingRate(entity.getOpeningRate())
            .closureRate(entity.getClosureRate())
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
