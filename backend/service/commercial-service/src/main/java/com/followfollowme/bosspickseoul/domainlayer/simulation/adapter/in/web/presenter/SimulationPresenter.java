package com.followfollowme.bosspickseoul.domainlayer.simulation.adapter.in.web.presenter;

import com.followfollowme.bosspickseoul.domainlayer.simulation.adapter.in.web.dto.item.SimulationAgeSalesItem;
import com.followfollowme.bosspickseoul.domainlayer.simulation.adapter.in.web.dto.item.SimulationConditionItem;
import com.followfollowme.bosspickseoul.domainlayer.simulation.adapter.in.web.dto.item.SimulationCostDetailItem;
import com.followfollowme.bosspickseoul.domainlayer.simulation.adapter.in.web.dto.item.SimulationFranchiseeSearchItem;
import com.followfollowme.bosspickseoul.domainlayer.simulation.adapter.in.web.dto.item.SimulationGenderAgeItem;
import com.followfollowme.bosspickseoul.domainlayer.simulation.adapter.in.web.dto.item.SimulationHistoryItem;
import com.followfollowme.bosspickseoul.domainlayer.simulation.adapter.in.web.dto.item.SimulationKeyMoneyItem;
import com.followfollowme.bosspickseoul.domainlayer.simulation.adapter.in.web.dto.item.SimulationSeasonItem;
import com.followfollowme.bosspickseoul.domainlayer.simulation.adapter.in.web.dto.item.SimulationSimilarFranchiseeItem;
import com.followfollowme.bosspickseoul.domainlayer.simulation.adapter.in.web.dto.item.SimulationSizeItem;
import com.followfollowme.bosspickseoul.domainlayer.simulation.adapter.in.web.dto.response.SimulationFranchiseesResponse;
import com.followfollowme.bosspickseoul.domainlayer.simulation.adapter.in.web.dto.response.SimulationHistoriesResponse;
import com.followfollowme.bosspickseoul.domainlayer.simulation.adapter.in.web.dto.response.SimulationHistorySaveResponse;
import com.followfollowme.bosspickseoul.domainlayer.simulation.adapter.in.web.dto.response.SimulationReportResponse;
import com.followfollowme.bosspickseoul.domainlayer.simulation.adapter.in.web.dto.response.SimulationStoreSizesResponse;
import com.followfollowme.bosspickseoul.domainlayer.simulation.application.info.SimulationAgeSalesInfo;
import com.followfollowme.bosspickseoul.domainlayer.simulation.application.info.SimulationConditionInfo;
import com.followfollowme.bosspickseoul.domainlayer.simulation.application.info.SimulationFranchiseeSearchInfo;
import com.followfollowme.bosspickseoul.domainlayer.simulation.application.info.SimulationGenderAgeInfo;
import com.followfollowme.bosspickseoul.domainlayer.simulation.application.info.SimulationHistoryInfo;
import com.followfollowme.bosspickseoul.domainlayer.simulation.application.info.SimulationHistoryPageInfo;
import com.followfollowme.bosspickseoul.domainlayer.simulation.application.info.SimulationReportInfo;
import com.followfollowme.bosspickseoul.domainlayer.simulation.application.info.SimulationSeasonInfo;
import com.followfollowme.bosspickseoul.domainlayer.simulation.application.info.SimulationSimilarFranchiseeInfo;
import com.followfollowme.bosspickseoul.domainlayer.simulation.application.info.SimulationSizeInfo;
import com.followfollowme.bosspickseoul.domainlayer.simulation.application.info.SimulationStoreSizeInfo;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class SimulationPresenter {

    public SimulationStoreSizesResponse toStoreSizesResponse(SimulationStoreSizeInfo info) {
        return SimulationStoreSizesResponse.builder()
            .serviceCode(info.serviceCode())
            .serviceName(info.serviceName())
            .dataBaseYear(info.dataBaseYear())
            .small(toSizeItem(info.small()))
            .medium(toSizeItem(info.medium()))
            .large(toSizeItem(info.large()))
            .build();
    }

    public SimulationFranchiseesResponse toFranchiseesResponse(List<SimulationFranchiseeSearchInfo> infos) {
        List<SimulationFranchiseeSearchItem> items = infos.stream()
            .map(info -> SimulationFranchiseeSearchItem.builder()
                .franchiseeId(info.franchiseeId())
                .brandName(info.brandName())
                .serviceCode(info.serviceCode())
                .serviceName(info.serviceName())
                .build())
            .toList();
        return SimulationFranchiseesResponse.builder()
            .franchisees(items)
            .lastId(items.isEmpty() ? null : items.get(items.size() - 1).franchiseeId())
            .build();
    }

    public SimulationReportResponse toReportResponse(SimulationReportInfo info) {
        return SimulationReportResponse.builder()
            .condition(toConditionItem(info.condition()))
            .dataBaseYear(info.dataBaseYear())
            .totalPrice(info.totalPrice())
            .keyMoney(SimulationKeyMoneyItem.builder()
                .keyMoneyRatio(info.keyMoney().keyMoneyRatio())
                .keyMoneyAverage(info.keyMoney().keyMoneyAverage())
                .keyMoneyLevel(info.keyMoney().keyMoneyLevel())
                .build())
            .costDetail(SimulationCostDetailItem.builder()
                .rentPrice(info.costDetail().rentPrice())
                .deposit(info.costDetail().deposit())
                .interior(info.costDetail().interior())
                .levy(info.costDetail().levy())
                .build())
            .similarFranchisees(info.similarFranchisees().stream().map(this::toSimilarFranchiseeItem).toList())
            .genderAgeAnalysis(toGenderAgeItem(info.genderAgeAnalysis()))
            .seasonAnalysis(toSeasonItem(info.seasonAnalysis()))
            .build();
    }

    public SimulationHistoryItem toHistoryItem(SimulationHistoryInfo info) {
        return SimulationHistoryItem.builder()
            .historyId(info.historyId())
            .franchisee(info.franchisee())
            .brandName(info.brandName())
            .districtCode(info.districtCode())
            .districtName(info.districtName())
            .serviceCode(info.serviceCode())
            .serviceName(info.serviceName())
            .storeSize(info.storeSize())
            .floorType(info.floorType().toMetadata())
            .totalPrice(info.totalPrice())
            .dataBaseYear(info.dataBaseYear())
            .createdAt(info.createdAt())
            .build();
    }

    public SimulationHistorySaveResponse toHistorySaveResponse(SimulationHistoryInfo info) {
        return SimulationHistorySaveResponse.builder()
            .history(toHistoryItem(info))
            .build();
    }

    public SimulationHistoriesResponse toHistoriesResponse(SimulationHistoryPageInfo info) {
        return SimulationHistoriesResponse.builder()
            .histories(info.histories().stream().map(this::toHistoryItem).toList())
            .page(info.page())
            .size(info.size())
            .totalElements(info.totalElements())
            .totalPages(info.totalPages())
            .build();
    }

    private SimulationSizeItem toSizeItem(SimulationSizeInfo info) {
        return SimulationSizeItem.builder()
            .squareMeter(info.squareMeter())
            .pyeong(info.pyeong())
            .build();
    }

    private SimulationConditionItem toConditionItem(SimulationConditionInfo info) {
        return SimulationConditionItem.builder()
            .franchisee(info.franchisee())
            .franchiseeId(info.franchiseeId())
            .brandName(info.brandName())
            .districtCode(info.districtCode())
            .districtName(info.districtName())
            .serviceCode(info.serviceCode())
            .serviceName(info.serviceName())
            .storeSize(info.storeSize())
            .floorType(info.floorType().toMetadata())
            .periodCode(info.periodCode())
            .build();
    }

    private SimulationSimilarFranchiseeItem toSimilarFranchiseeItem(SimulationSimilarFranchiseeInfo info) {
        return SimulationSimilarFranchiseeItem.builder()
            .franchiseeId(info.franchiseeId())
            .brandName(info.brandName())
            .totalPrice(info.totalPrice())
            .subscription(info.subscription())
            .education(info.education())
            .deposit(info.deposit())
            .etc(info.etc())
            .interior(info.interior())
            .build();
    }

    private SimulationGenderAgeItem toGenderAgeItem(SimulationGenderAgeInfo info) {
        if (info == null) {
            return null;
        }
        return SimulationGenderAgeItem.builder()
            .malePercent(info.malePercent())
            .femalePercent(info.femalePercent())
            .topAgeGroups(info.topAgeGroups().stream()
                .map(age -> SimulationAgeSalesItem.builder()
                    .ageGroupName(age.ageGroupName())
                    .salesAmount(age.salesAmount())
                    .build())
                .toList())
            .build();
    }

    private SimulationSeasonItem toSeasonItem(SimulationSeasonInfo info) {
        if (info == null) {
            return null;
        }
        return SimulationSeasonItem.builder()
            .peakMonths(info.peakMonths())
            .offPeakMonths(info.offPeakMonths())
            .build();
    }
}
