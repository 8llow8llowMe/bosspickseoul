package com.followfollowme.nowdoboss.domainlayer.administration.application.service.processor;

import com.followfollowme.nowdoboss.domainlayer.administration.application.info.AdministrationDetailInfo;
import com.followfollowme.nowdoboss.domainlayer.administration.application.info.AdministrationIncomeDetailInfo;
import com.followfollowme.nowdoboss.domainlayer.administration.application.info.AdministrationSalesDetailInfo;
import com.followfollowme.nowdoboss.domainlayer.administration.application.info.AdministrationStoreDetailInfo;
import com.followfollowme.nowdoboss.domainlayer.administration.application.info.item.AdministrationSalesServiceTopInfo;
import com.followfollowme.nowdoboss.domainlayer.administration.application.info.item.AdministrationStoreServiceTopInfo;
import com.followfollowme.nowdoboss.domainlayer.administration.application.port.out.AdministrationAnalysisRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.administration.domain.model.IncomeAdministration;
import com.followfollowme.nowdoboss.domainlayer.administration.domain.model.SalesAdministration;
import com.followfollowme.nowdoboss.domainlayer.administration.domain.model.StoreAdministration;
import com.followfollowme.nowdoboss.domainlayer.district.application.common.PeriodCodeCalculator;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AdministrationQueryProcessor {

    private static final int TOP_FIVE_LIMIT = 5;
    private static final double PERCENT_MULTIPLIER = 100.0;

    private final AdministrationAnalysisRepositoryPort administrationAnalysisRepositoryPort;
    private final PeriodCodeCalculator periodCodeCalculator;

    public AdministrationDetailInfo getAdministrationDetail(String administrationCode, String currentPeriodCode, String previousPeriodCode) {
        String resolvedPreviousPeriodCode = periodCodeCalculator.resolvePreviousPeriodCode(currentPeriodCode, previousPeriodCode);

        List<SalesAdministration> currentSales = administrationAnalysisRepositoryPort.findSales(currentPeriodCode, administrationCode);
        List<SalesAdministration> previousSales = administrationAnalysisRepositoryPort.findSales(resolvedPreviousPeriodCode, administrationCode);
        List<StoreAdministration> currentStores = administrationAnalysisRepositoryPort.findStores(currentPeriodCode, administrationCode);
        IncomeAdministration income = administrationAnalysisRepositoryPort.findIncome(currentPeriodCode, administrationCode)
            .orElseThrow(() -> new IllegalArgumentException("행정동 지출 정보를 찾을 수 없습니다."));

        String administrationName = resolveAdministrationName(currentSales, currentStores, income);

        return AdministrationDetailInfo.builder()
            .administrationCode(administrationCode)
            .administrationName(administrationName)
            .sales(AdministrationSalesDetailInfo.builder()
                .topSalesServices(toAdministrationSalesServiceTopInfos(currentSales, previousSales))
                .build())
            .store(AdministrationStoreDetailInfo.builder()
                .topStoreServices(toAdministrationStoreServiceTopInfos(currentStores))
                .build())
            .income(AdministrationIncomeDetailInfo.builder()
                .totalExpenseAmount(income.totalExpenseAmount())
                .build())
            .build();
    }

    private String resolveAdministrationName(List<SalesAdministration> currentSales, List<StoreAdministration> currentStores, IncomeAdministration income) {
        return currentSales.stream().findFirst().map(SalesAdministration::administrationName)
            .or(() -> currentStores.stream().findFirst().map(StoreAdministration::administrationName))
            .orElse(income.administrationName());
    }

    private List<AdministrationSalesServiceTopInfo> toAdministrationSalesServiceTopInfos(
        List<SalesAdministration> currentSales,
        List<SalesAdministration> previousSales
    ) {
        if (currentSales.isEmpty()) {
            throw new IllegalArgumentException("행정동 매출 정보를 찾을 수 없습니다.");
        }

        Map<String, SalesAdministration> previousByServiceCode = previousSales.stream()
            .collect(Collectors.toMap(SalesAdministration::serviceCode, Function.identity(), (left, right) -> left));

        return currentSales.stream()
            .sorted(Comparator.comparingLong(SalesAdministration::monthlySalesAmount).reversed())
            .limit(TOP_FIVE_LIMIT)
            .map(current -> AdministrationSalesServiceTopInfo.builder()
                .serviceCode(current.serviceCode())
                .serviceName(current.serviceName())
                .monthlySalesAmount(current.monthlySalesAmount())
                .salesChangeRate(calculateSalesChangeRate(current.monthlySalesAmount(), previousByServiceCode.get(current.serviceCode())))
                .build())
            .toList();
    }

    private double calculateSalesChangeRate(long currentSalesAmount, SalesAdministration previousSales) {
        long previousSalesAmount = Optional.ofNullable(previousSales)
            .map(SalesAdministration::monthlySalesAmount)
            .orElse(0L);

        if (previousSalesAmount == 0L) {
            return 0.0;
        }

        return ((currentSalesAmount - previousSalesAmount) / (double) previousSalesAmount) * PERCENT_MULTIPLIER;
    }

    private List<AdministrationStoreServiceTopInfo> toAdministrationStoreServiceTopInfos(List<StoreAdministration> currentStores) {
        if (currentStores.isEmpty()) {
            throw new IllegalArgumentException("행정동 점포 정보를 찾을 수 없습니다.");
        }

        return currentStores.stream()
            .sorted(Comparator.comparingLong(StoreAdministration::totalStoreCount).reversed())
            .limit(TOP_FIVE_LIMIT)
            .map(store -> AdministrationStoreServiceTopInfo.builder()
                .serviceCode(store.serviceCode())
                .serviceName(store.serviceName())
                .totalStoreCount(store.totalStoreCount())
                .similarStoreCount(store.similarStoreCount())
                .openedStoreCount(store.openedStoreCount())
                .closedStoreCount(store.closedStoreCount())
                .franchiseStoreCount(store.franchiseStoreCount())
                .openingRate(store.openingRate())
                .closureRate(store.closureRate())
                .build())
            .toList();
    }
}
