package com.followfollowme.nowdoboss.domainlayer.commercial.application.service.processor;

import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.trend.CommercialTrendInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.trend.CommercialTrendItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.model.CommercialTrendMetricType;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.port.out.FootTrafficCommercialRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.port.out.SalesCommercialRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.port.out.StoreCommercialRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.FootTrafficCommercial;
import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.SalesCommercial;
import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.StoreCommercial;
import com.followfollowme.nowdoboss.domainlayer.district.application.common.PeriodCodeCalculator;
import com.followfollowme.nowdoboss.domainlayer.district.domain.enums.PeriodTrendType;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CommercialTrendQueryProcessor {

    private static final int MIN_PERIOD_COUNT = 1;
    private static final int MAX_PERIOD_COUNT = 8;
    private static final double STAGNANT_THRESHOLD = 0.01;

    private final SalesCommercialRepositoryPort salesCommercialRepositoryPort;
    private final FootTrafficCommercialRepositoryPort footTrafficCommercialRepositoryPort;
    private final StoreCommercialRepositoryPort storeCommercialRepositoryPort;
    private final PeriodCodeCalculator periodCodeCalculator;

    public CommercialTrendInfo getTrend(

        String commercialCode, String serviceCode, CommercialTrendMetricType metricType, String latestPeriodCode, int periodCount
    ) {
        int clampedCount = Math.max(MIN_PERIOD_COUNT, Math.min(MAX_PERIOD_COUNT, periodCount));
        List<String> periodCodes = periodCodeCalculator.getRecentPeriodCodes(latestPeriodCode, clampedCount);

        List<CommercialTrendItem> periods = switch (metricType) {
            case SALES -> buildSalesTrend(commercialCode, serviceCode, periodCodes);
            case FOOT_TRAFFIC -> buildFootTrafficTrend(commercialCode, periodCodes);
            case STORE -> buildStoreTrend(commercialCode, serviceCode, periodCodes);
        };

        return CommercialTrendInfo.builder()
            .commercialCode(commercialCode)
            .serviceCode(serviceCode)
            .metricType(metricType)
            .trendDirection(determineTrend(periods))
            .periods(periods)
            .build();
    }

    private List<CommercialTrendItem> buildSalesTrend(

        String commercialCode, String serviceCode, List<String> periodCodes
    ) {
        Map<String, Long> valueMap = salesCommercialRepositoryPort
            .findByCommercialCodeAndServiceCodeAndPeriodCodeIn(commercialCode, serviceCode, periodCodes)
            .stream()
            .collect(Collectors.toMap(SalesCommercial::periodCode, SalesCommercial::monthlySalesAmount));
        return toTrendItems(periodCodes, code -> toDouble(valueMap.get(code)));
    }

    private List<CommercialTrendItem> buildFootTrafficTrend(String commercialCode, List<String> periodCodes) {
        Map<String, Long> valueMap = footTrafficCommercialRepositoryPort
            .findByCommercialCodeAndPeriodCodeIn(commercialCode, periodCodes)
            .stream()
            .collect(Collectors.toMap(FootTrafficCommercial::periodCode, FootTrafficCommercial::totalFootTraffic));
        return toTrendItems(periodCodes, code -> toDouble(valueMap.get(code)));
    }

    private List<CommercialTrendItem> buildStoreTrend(

        String commercialCode, String serviceCode, List<String> periodCodes
    ) {
        Map<String, Long> valueMap = storeCommercialRepositoryPort
            .findByCommercialCodeAndServiceCodeAndPeriodCodeIn(commercialCode, serviceCode, periodCodes)
            .stream()
            .collect(Collectors.toMap(StoreCommercial::periodCode, StoreCommercial::totalStoreCount));
        return toTrendItems(periodCodes, code -> toDouble(valueMap.get(code)));
    }

    private List<CommercialTrendItem> toTrendItems(List<String> periodCodes, Function<String, Double> valueExtractor) {
        List<CommercialTrendItem> items = new ArrayList<>(periodCodes.size());
        Double previousValue = null;

        for (String periodCode : periodCodes) {
            Double value = valueExtractor.apply(periodCode);
            Double changeRate = null;
            if (previousValue != null && previousValue != 0 && value != null) {
                changeRate = (value - previousValue) / previousValue;
            }

            items.add(CommercialTrendItem.builder()
                .periodCode(periodCode)
                .value(value)
                .changeRate(changeRate)
                .build());

            if (value != null) {
                previousValue = value;
            }
        }

        return items;
    }

    private Double toDouble(Long value) {
        return value == null ? null : value.doubleValue();
    }

    private PeriodTrendType determineTrend(List<CommercialTrendItem> periods) {
        List<CommercialTrendItem> nonNullPeriods = periods.stream()
            .filter(period -> period.value() != null)
            .sorted(Comparator.comparing(CommercialTrendItem::periodCode))
            .toList();

        if (nonNullPeriods.size() < 2) {
            return PeriodTrendType.STAGNANT;
        }

        CommercialTrendItem last = nonNullPeriods.get(nonNullPeriods.size() - 1);
        CommercialTrendItem previous = nonNullPeriods.get(nonNullPeriods.size() - 2);
        if (previous.value() == 0) {
            return PeriodTrendType.STAGNANT;
        }

        double rate = (last.value() - previous.value()) / previous.value();
        if (rate > STAGNANT_THRESHOLD) {
            return PeriodTrendType.INCREASE;
        }
        if (rate < -STAGNANT_THRESHOLD) {
            return PeriodTrendType.DECREASE;
        }
        return PeriodTrendType.STAGNANT;
    }
}
