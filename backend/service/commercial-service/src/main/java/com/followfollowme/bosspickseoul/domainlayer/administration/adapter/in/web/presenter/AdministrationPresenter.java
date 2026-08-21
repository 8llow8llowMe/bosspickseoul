package com.followfollowme.bosspickseoul.domainlayer.administration.adapter.in.web.presenter;

import com.followfollowme.bosspickseoul.domainlayer.administration.adapter.in.web.dto.item.AdministrationSalesServiceTopItem;
import com.followfollowme.bosspickseoul.domainlayer.administration.adapter.in.web.dto.item.AdministrationStoreServiceTopItem;
import com.followfollowme.bosspickseoul.domainlayer.administration.adapter.in.web.dto.response.AdministrationDetailResponse;
import com.followfollowme.bosspickseoul.domainlayer.administration.adapter.in.web.dto.response.AdministrationIncomeDetailResponse;
import com.followfollowme.bosspickseoul.domainlayer.administration.adapter.in.web.dto.response.AdministrationSalesDetailResponse;
import com.followfollowme.bosspickseoul.domainlayer.administration.adapter.in.web.dto.response.AdministrationStoreDetailResponse;
import com.followfollowme.bosspickseoul.domainlayer.administration.application.info.AdministrationDetailInfo;
import com.followfollowme.bosspickseoul.domainlayer.administration.application.info.AdministrationIncomeDetailInfo;
import com.followfollowme.bosspickseoul.domainlayer.administration.application.info.AdministrationSalesDetailInfo;
import com.followfollowme.bosspickseoul.domainlayer.administration.application.info.AdministrationStoreDetailInfo;
import com.followfollowme.bosspickseoul.domainlayer.administration.application.info.item.AdministrationSalesServiceTopInfo;
import com.followfollowme.bosspickseoul.domainlayer.administration.application.info.item.AdministrationStoreServiceTopInfo;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class AdministrationPresenter {

    public AdministrationDetailResponse toAdministrationDetailResponse(AdministrationDetailInfo info) {
        return AdministrationDetailResponse.builder()
            .administrationCode(info.administrationCode())
            .administrationName(info.administrationName())
            .sales(toAdministrationSalesDetailResponse(info.sales()))
            .store(toAdministrationStoreDetailResponse(info.store()))
            .income(toAdministrationIncomeDetailResponse(info.income()))
            .build();
    }

    private AdministrationSalesDetailResponse toAdministrationSalesDetailResponse(AdministrationSalesDetailInfo info) {
        return AdministrationSalesDetailResponse.builder()
            .topSalesServices(toAdministrationSalesServiceTopItems(info.topSalesServices()))
            .build();
    }

    private AdministrationStoreDetailResponse toAdministrationStoreDetailResponse(AdministrationStoreDetailInfo info) {
        return AdministrationStoreDetailResponse.builder()
            .topStoreServices(toAdministrationStoreServiceTopItems(info.topStoreServices()))
            .build();
    }

    private AdministrationIncomeDetailResponse toAdministrationIncomeDetailResponse(AdministrationIncomeDetailInfo info) {
        return AdministrationIncomeDetailResponse.builder()
            .totalExpenseAmount(info.totalExpenseAmount())
            .build();
    }

    private List<AdministrationSalesServiceTopItem> toAdministrationSalesServiceTopItems(List<AdministrationSalesServiceTopInfo> infos) {
        return infos.stream()
            .map(this::toAdministrationSalesServiceTopItem)
            .toList();
    }

    private AdministrationSalesServiceTopItem toAdministrationSalesServiceTopItem(AdministrationSalesServiceTopInfo info) {
        return AdministrationSalesServiceTopItem.builder()
            .serviceCode(info.serviceCode())
            .serviceName(info.serviceName())
            .monthlySalesAmount(info.monthlySalesAmount())
            .salesChangeRate(info.salesChangeRate())
            .build();
    }

    private List<AdministrationStoreServiceTopItem> toAdministrationStoreServiceTopItems(List<AdministrationStoreServiceTopInfo> infos) {
        return infos.stream()
            .map(this::toAdministrationStoreServiceTopItem)
            .toList();
    }

    private AdministrationStoreServiceTopItem toAdministrationStoreServiceTopItem(AdministrationStoreServiceTopInfo info) {
        return AdministrationStoreServiceTopItem.builder()
            .serviceCode(info.serviceCode())
            .serviceName(info.serviceName())
            .totalStoreCount(info.totalStoreCount())
            .similarStoreCount(info.similarStoreCount())
            .openedStoreCount(info.openedStoreCount())
            .closedStoreCount(info.closedStoreCount())
            .franchiseStoreCount(info.franchiseStoreCount())
            .openingRate(info.openingRate())
            .closureRate(info.closureRate())
            .build();
    }
}
