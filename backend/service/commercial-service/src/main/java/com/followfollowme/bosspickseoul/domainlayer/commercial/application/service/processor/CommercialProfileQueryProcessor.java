package com.followfollowme.bosspickseoul.domainlayer.commercial.application.service.processor;

import com.followfollowme.bosspickseoul.domainlayer.commercial.application.exception.CommercialErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.exception.CommercialException;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.facility.CommercialFacilityInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.foottraffic.CommercialFootTrafficByDayOfWeekInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.foottraffic.CommercialFootTrafficByTimeSlotInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.foottraffic.CommercialFootTrafficInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.income.CommercialIncomeAndExpenseInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.population.CommercialResidentPopulationInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.profile.CommercialProfileInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.profile.CommercialProfileKeyMetricsInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.sales.CommercialSalesByAgeInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.sales.CommercialSalesByDayOfWeekInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.sales.CommercialSalesByTimeSlotInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.sales.CommercialSalesInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.summary.CommercialStoreAnalysisInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.CommercialRegionQueryPort;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.query.CommercialAdministrationQueryResult;
import java.util.Objects;
import java.util.function.Supplier;
import java.util.stream.Stream;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * 상권 프로필 조회. 분기별 적재 상황에 따라 일부 지표(예: 매출)가 없을 수 있으므로
 * 지표 단위로 부분 강등(null)하고, 모든 지표가 없을 때만 404(COMMERCIAL_013)를 응답한다.
 * 지역 매핑(상권 코드 검증)은 프로필의 골격이라 강등하지 않고 그대로 전파한다.
 */
@Service
@RequiredArgsConstructor
public class CommercialProfileQueryProcessor {

    private static final String[] TIME_SLOT_LABELS =
        {"0시~6시", "6시~11시", "11시~14시", "14시~17시", "17시~21시", "21시~24시"};
    private static final String[] AGE_GROUP_LABELS =
        {"10대", "20대", "30대", "40대", "50대", "60대 이상"};

    private final CommercialQueryProcessor commercialQueryProcessor;
    private final CommercialRegionQueryPort commercialRegionQueryPort;

    public CommercialProfileInfo getProfile(String periodCode, String commercialCode, String serviceCode) {
        CommercialAdministrationQueryResult administration =
            commercialRegionQueryPort.getCommercialAdministration(commercialCode);

        CommercialSalesInfo sales = fetchQuietly(() -> commercialQueryProcessor
            .getSalesByPeriodCodeAndCommercialCodeAndServiceCode(periodCode, commercialCode, serviceCode));
        CommercialFootTrafficInfo footTraffic = fetchQuietly(() -> commercialQueryProcessor
            .getFootTrafficByPeriodCodeAndCommercialCode(periodCode, commercialCode));
        CommercialStoreAnalysisInfo store = fetchQuietly(() -> commercialQueryProcessor
            .getStoreByPeriodCodeAndCommercialCodeAndServiceCode(periodCode, commercialCode, serviceCode));
        CommercialResidentPopulationInfo population = fetchQuietly(() -> commercialQueryProcessor
            .getPopulationByPeriodAndCommercialCode(periodCode, commercialCode));
        CommercialIncomeAndExpenseInfo income = fetchQuietly(() -> commercialQueryProcessor
            .getIncomeByPeriodCodeAndCommercialCode(periodCode, commercialCode));
        CommercialFacilityInfo facility = fetchQuietly(() -> commercialQueryProcessor
            .getFacilityByPeriodAndCommercialCode(periodCode, commercialCode));

        if (Stream.of(sales, footTraffic, store, population, income, facility).allMatch(Objects::isNull)) {
            throw new CommercialException(CommercialErrorCode.PROFILE_DATA_NOT_FOUND);
        }

        CommercialProfileKeyMetricsInfo keyMetrics = CommercialProfileKeyMetricsInfo.builder()
            .totalSalesAmount(sales == null ? null : totalSalesAmount(sales.amountByDayOfWeekInfo()))
            .totalFootTraffic(footTraffic == null ? null : totalFootTraffic(footTraffic.byDayOfWeekInfo()))
            .totalStoreCount(store == null ? null : store.totalStoreCount())
            .similarStoreCount(store == null ? null : store.similarStoreCount())
            .openingRate(store == null ? null : store.openingRate())
            .closureRate(store == null ? null : store.closureRate())
            .totalResidentPopulation(population == null ? null : population.byAgeInfo().totalResidentPopulation())
            .monthlyAverageIncomeAmount(income == null ? null : income.averageIncomeInfo().monthlyAverageIncomeAmount())
            .totalFacilityCount(facility == null ? null : facility.totalFacilityCount())
            .peakSalesTimeSlot(sales == null ? null : peakSalesTimeSlot(sales.amountByTimeSlotInfo()))
            .peakFootTrafficTimeSlot(footTraffic == null ? null : peakFootTrafficTimeSlot(footTraffic.byTimeSlotInfo()))
            .dominantSalesAgeGroup(sales == null ? null : dominantSalesAgeGroup(sales.amountByAgeInfo()))
            .build();

        return CommercialProfileInfo.builder()
            .periodCode(periodCode)
            .serviceCode(serviceCode)
            .commercialCode(commercialCode)
            .commercialName(commercialName(sales, footTraffic))
            .districtCode(administration.districtCode())
            .districtName(administration.districtName())
            .administrationCode(administration.administrationCode())
            .administrationName(administration.administrationName())
            .keyMetrics(keyMetrics)
            .build();
    }

    /** 분기 종속 데이터 부재(404 계열 CommercialException)는 지표 강등으로 흡수한다. 그 외 예외는 전파. */
    private static <T> T fetchQuietly(Supplier<T> fetcher) {
        try {
            return fetcher.get();
        } catch (CommercialException exception) {
            return null;
        }
    }

    /** 상권명은 지역 매핑 응답에 없어 지표 Info 에서 가져온다 — 성공한 Info 순서대로 폴백. */
    private static String commercialName(CommercialSalesInfo sales, CommercialFootTrafficInfo footTraffic) {
        if (sales != null) {
            return sales.commercialName();
        }
        return footTraffic == null ? null : footTraffic.commercialName();
    }

    private static double totalSalesAmount(CommercialSalesByDayOfWeekInfo info) {
        return info.mondaySalesAmount() + info.tuesdaySalesAmount() + info.wednesdaySalesAmount()
            + info.thursdaySalesAmount() + info.fridaySalesAmount()
            + info.saturdaySalesAmount() + info.sundaySalesAmount();
    }

    private static double totalFootTraffic(CommercialFootTrafficByDayOfWeekInfo info) {
        return info.mondayFootTraffic() + info.tuesdayFootTraffic() + info.wednesdayFootTraffic()
            + info.thursdayFootTraffic() + info.fridayFootTraffic()
            + info.saturdayFootTraffic() + info.sundayFootTraffic();
    }

    private static String peakSalesTimeSlot(CommercialSalesByTimeSlotInfo slot) {
        long[] amounts = {
            slot.salesAmountTime00To06(), slot.salesAmountTime06To11(),
            slot.salesAmountTime11To14(), slot.salesAmountTime14To17(),
            slot.salesAmountTime17To21(), slot.salesAmountTime21To24()
        };
        return TIME_SLOT_LABELS[peakIndex(amounts)];
    }

    private static String peakFootTrafficTimeSlot(CommercialFootTrafficByTimeSlotInfo slot) {
        long[] amounts = {
            slot.footTrafficTime00To06(), slot.footTrafficTime06To11(),
            slot.footTrafficTime11To14(), slot.footTrafficTime14To17(),
            slot.footTrafficTime17To21(), slot.footTrafficTime21To24()
        };
        return TIME_SLOT_LABELS[peakIndex(amounts)];
    }

    private static String dominantSalesAgeGroup(CommercialSalesByAgeInfo age) {
        long[] amounts = {
            age.age10SalesAmount(), age.age20SalesAmount(), age.age30SalesAmount(),
            age.age40SalesAmount(), age.age50SalesAmount(), age.age60PlusSalesAmount()
        };
        return AGE_GROUP_LABELS[peakIndex(amounts)];
    }

    private static int peakIndex(long[] amounts) {
        int peak = 0;
        for (int i = 1; i < amounts.length; i++) {
            if (amounts[i] > amounts[peak]) {
                peak = i;
            }
        }
        return peak;
    }
}
