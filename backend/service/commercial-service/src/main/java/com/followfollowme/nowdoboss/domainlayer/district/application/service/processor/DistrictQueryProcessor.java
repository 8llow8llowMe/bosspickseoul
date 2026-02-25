package com.followfollowme.nowdoboss.domainlayer.district.application.service.processor;

import com.followfollowme.nowdoboss.domainlayer.district.application.common.PeriodCodeCalculator;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.area.DistrictAreaInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.change.DistrictChangeIndicatorInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.foottraffic.DistrictAgeGroupFootTrafficInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.foottraffic.DistrictDayOfWeekFootTrafficInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.foottraffic.DistrictFootTrafficDetailInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.foottraffic.DistrictFootTrafficTopTenInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.foottraffic.DistrictGenderFootTrafficInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.foottraffic.DistrictMetricValueInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.foottraffic.DistrictPeriodFootTrafficInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.foottraffic.DistrictTimeSlotFootTrafficInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.sales.DistrictSalesAdministrationTopInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.sales.DistrictSalesDetailInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.sales.DistrictSalesServiceTopInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.sales.DistrictSalesTopTenInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.store.DistrictClosedStoreAdministrationTopInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.store.DistrictClosedStoreTopTenInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.store.DistrictOpenedStoreAdministrationTopInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.store.DistrictOpenedStoreTopTenInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.store.DistrictStoreDetailInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.store.DistrictStoreServiceTopInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.summary.DistrictDetailInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.summary.DistrictTopTenSummaryInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.port.out.ChangeDistrictRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.district.application.port.out.FootTrafficDistrictRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.district.application.port.out.SalesAdministrationRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.district.application.port.out.SalesDistrictRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.district.application.port.out.StoreAdministrationRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.district.application.port.out.StoreDistrictRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.district.domain.enums.DistrictAgeGroupType;
import com.followfollowme.nowdoboss.domainlayer.district.domain.enums.DistrictDayOfWeekType;
import com.followfollowme.nowdoboss.domainlayer.district.domain.enums.DistrictGenderType;
import com.followfollowme.nowdoboss.domainlayer.district.domain.enums.FootTrafficTimeSlotType;
import com.followfollowme.nowdoboss.domainlayer.district.domain.enums.PeriodTrendType;
import com.followfollowme.nowdoboss.domainlayer.district.domain.model.FootTrafficDistrict;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Stream;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class DistrictQueryProcessor {

    private static final int FOOT_TRAFFIC_PERIOD_WINDOW = 4;

    private final ChangeDistrictRepositoryPort changeDistrictRepositoryPort;
    private final FootTrafficDistrictRepositoryPort footTrafficDistrictRepositoryPort;
    private final SalesDistrictRepositoryPort salesDistrictRepositoryPort;
    private final SalesAdministrationRepositoryPort salesAdministrationRepositoryPort;
    private final StoreDistrictRepositoryPort storeDistrictRepositoryPort;
    private final StoreAdministrationRepositoryPort storeAdministrationRepositoryPort;
    private final PeriodCodeCalculator periodCodeCalculator;

    public DistrictTopTenSummaryInfo getTopTenSummary(String currentPeriodCode, String previousPeriodCode) {
        // 1. 이전 분기 확정
        String resolvedPreviousPeriodCode =
            periodCodeCalculator.resolvePreviousPeriodCode(currentPeriodCode, previousPeriodCode);

        // 2. Top10 데이터 조회
        List<DistrictFootTrafficTopTenInfo> footTrafficTopTenInfos =
            footTrafficDistrictRepositoryPort.findTopTenByFootTraffic(currentPeriodCode, resolvedPreviousPeriodCode)
                .stream()
                .map(DistrictFootTrafficTopTenInfo::from)
                .toList();
        List<DistrictSalesTopTenInfo> salesTopTenInfos =
            salesDistrictRepositoryPort.findTopTenBySales(currentPeriodCode, resolvedPreviousPeriodCode)
                .stream()
                .map(DistrictSalesTopTenInfo::from)
                .toList();
        List<DistrictOpenedStoreTopTenInfo> openedStoreTopTenInfos =
            storeDistrictRepositoryPort.findTopTenByOpenedStore(currentPeriodCode, resolvedPreviousPeriodCode)
                .stream()
                .map(DistrictOpenedStoreTopTenInfo::from)
                .toList();
        List<DistrictClosedStoreTopTenInfo> closedStoreTopTenInfos =
            storeDistrictRepositoryPort.findTopTenByClosedStore(currentPeriodCode, resolvedPreviousPeriodCode)
                .stream()
                .map(DistrictClosedStoreTopTenInfo::from)
                .toList();

        // 3. Summary Info 조립
        return DistrictTopTenSummaryInfo.builder()
            .footTrafficTopTenInfos(footTrafficTopTenInfos)
            .salesTopTenInfos(salesTopTenInfos)
            .openedStoreTopTenInfos(openedStoreTopTenInfos)
            .closedStoreTopTenInfos(closedStoreTopTenInfos)
            .build();
    }

    public DistrictDetailInfo getDistrictDetail(String districtCode, String currentPeriodCode, String previousPeriodCode) {
        // 1. 영역별 상세 조회
        DistrictChangeIndicatorInfo changeInfo = getDistrictChangeDetail(districtCode, currentPeriodCode);
        DistrictFootTrafficDetailInfo footTrafficInfo =
            getDistrictFootTrafficDetail(districtCode, currentPeriodCode, previousPeriodCode);
        DistrictStoreDetailInfo storeInfo = getDistrictTotalStoreDetail(districtCode, currentPeriodCode);
        DistrictSalesDetailInfo salesInfo = getDistrictSalesTopFiveDetail(districtCode, currentPeriodCode, previousPeriodCode);

        // 2. Detail Info 조립
        return DistrictDetailInfo.builder()
            .changeIndicator(changeInfo)
            .footTraffic(footTrafficInfo)
            .store(storeInfo)
            .sales(salesInfo)
            .build();
    }

    public DistrictChangeIndicatorInfo getDistrictChangeDetail(String districtCode, String currentPeriodCode) {
        // 1. 변화지표 조회
        // 2. Info 변환
        return changeDistrictRepositoryPort.findByPeriodCodeAndDistrictCode(currentPeriodCode, districtCode)
            .map(change -> DistrictChangeIndicatorInfo.builder()
                .changeIndicatorCode(change.changeIndicatorCode())
                .changeIndicatorName(change.changeIndicatorName())
                .averageOpenedMonths(change.averageOpenedMonths())
                .averageClosedMonths(change.averageClosedMonths())
                .build())
            .orElseThrow(() -> new IllegalArgumentException("Change indicator not found."));
    }

    public DistrictFootTrafficDetailInfo getDistrictFootTrafficDetail(
        String districtCode,
        String currentPeriodCode,
        String previousPeriodCode
    ) {
        // 1. 이전 분기 확정
        String resolvedPreviousPeriodCode = periodCodeCalculator.resolvePreviousPeriodCode(currentPeriodCode, previousPeriodCode);

        // 2. 분기 목록/상세 데이터 조회
        List<String> periodCodes = periodCodeCalculator.getRecentPeriodCodes(currentPeriodCode, FOOT_TRAFFIC_PERIOD_WINDOW);
        List<FootTrafficDistrict> footTrafficRows =
            footTrafficDistrictRepositoryPort.findByPeriodCodeInAndDistrictCodeOrderByPeriodCode(periodCodes, districtCode);

        // 3. 현재 분기 필터링
        FootTrafficDistrict current = footTrafficRows.stream()
            .filter(row -> row.periodCode().equals(currentPeriodCode))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Current foot traffic not found."));

        // 4. 분기별 유동인구 계산
        List<DistrictPeriodFootTrafficInfo> periodTotalFootTrafficList = periodCodes.stream()
            .map(periodCode -> toPeriodFootTrafficInfo(footTrafficRows, periodCode))
            .filter(periodInfo -> periodInfo.totalFootTraffic() > -1)
            .toList();

        long previousTotal = periodTotalFootTrafficList.stream()
            .filter(periodInfo -> periodInfo.periodCode().equals(resolvedPreviousPeriodCode))
            .map(DistrictPeriodFootTrafficInfo::totalFootTraffic)
            .findFirst()
            .orElse(0L);

        long currentTotal = periodTotalFootTrafficList.stream()
            .filter(periodInfo -> periodInfo.periodCode().equals(currentPeriodCode))
            .map(DistrictPeriodFootTrafficInfo::totalFootTraffic)
            .findFirst()
            .orElse(0L);

        // 5. 항목별 Info 생성
        DistrictTimeSlotFootTrafficInfo timeSlotInfo = DistrictTimeSlotFootTrafficInfo.builder()
            .footTrafficTime00To06(current.footTrafficTime00To06())
            .footTrafficTime06To11(current.footTrafficTime06To11())
            .footTrafficTime11To14(current.footTrafficTime11To14())
            .footTrafficTime14To17(current.footTrafficTime14To17())
            .footTrafficTime17To21(current.footTrafficTime17To21())
            .footTrafficTime21To24(current.footTrafficTime21To24())
            .dominantTimeSlotType(resolveDominantTimeSlot(current))
            .build();

        DistrictGenderFootTrafficInfo genderInfo = DistrictGenderFootTrafficInfo.builder()
            .maleFootTraffic(current.maleFootTraffic())
            .femaleFootTraffic(current.femaleFootTraffic())
            .dominantGenderType(
                current.maleFootTraffic() >= current.femaleFootTraffic() ? DistrictGenderType.MALE : DistrictGenderType.FEMALE)
            .build();

        DistrictAgeGroupFootTrafficInfo ageGroupInfo = DistrictAgeGroupFootTrafficInfo.builder()
            .age10FootTraffic(current.age10FootTraffic())
            .age20FootTraffic(current.age20FootTraffic())
            .age30FootTraffic(current.age30FootTraffic())
            .age40FootTraffic(current.age40FootTraffic())
            .age50FootTraffic(current.age50FootTraffic())
            .age60PlusFootTraffic(current.age60PlusFootTraffic())
            .dominantAgeGroupType(resolveDominantAgeGroup(current))
            .build();

        DistrictDayOfWeekFootTrafficInfo dayOfWeekInfo = DistrictDayOfWeekFootTrafficInfo.builder()
            .mondayFootTraffic(current.mondayFootTraffic())
            .tuesdayFootTraffic(current.tuesdayFootTraffic())
            .wednesdayFootTraffic(current.wednesdayFootTraffic())
            .thursdayFootTraffic(current.thursdayFootTraffic())
            .fridayFootTraffic(current.fridayFootTraffic())
            .saturdayFootTraffic(current.saturdayFootTraffic())
            .sundayFootTraffic(current.sundayFootTraffic())
            .dominantDayOfWeekType(resolveDominantDayOfWeek(current))
            .build();

        // 6. 유동인구 Detail Info 조립
        return DistrictFootTrafficDetailInfo.builder()
            .periodTrend(resolveTrend(previousTotal, currentTotal))
            .periodTotalFootTrafficList(periodTotalFootTrafficList)
            .timeSlot(timeSlotInfo)
            .gender(genderInfo)
            .ageGroup(ageGroupInfo)
            .dayOfWeek(dayOfWeekInfo)
            .build();
    }

    public DistrictStoreDetailInfo getDistrictTotalStoreDetail(String districtCode, String currentPeriodCode) {
        // 1. 점포 상세 조회
        // 2. Store Info 조립
        return DistrictStoreDetailInfo.builder()
            .topStoreServices(
                storeDistrictRepositoryPort.findTopEightByTotalStore(currentPeriodCode, districtCode)
                    .stream()
                    .map(DistrictStoreServiceTopInfo::from)
                    .toList())
            .topOpenedAdministrations(
                storeAdministrationRepositoryPort.findTopFiveOpenedAdministrationsByDistrictCode(districtCode, currentPeriodCode)
                    .stream()
                    .map(DistrictOpenedStoreAdministrationTopInfo::from)
                    .toList())
            .topClosedAdministrations(
                storeAdministrationRepositoryPort.findTopFiveClosedAdministrationsByDistrictCode(districtCode, currentPeriodCode)
                    .stream()
                    .map(DistrictClosedStoreAdministrationTopInfo::from)
                    .toList())
            .build();
    }

    public DistrictSalesDetailInfo getDistrictSalesTopFiveDetail(String districtCode, String currentPeriodCode, String previousPeriodCode) {
        // 1. 이전 분기 확정
        String resolvedPreviousPeriodCode =
            periodCodeCalculator.resolvePreviousPeriodCode(currentPeriodCode, previousPeriodCode);

        // 2. 업종/행정동 Top5 조회
        return DistrictSalesDetailInfo.builder()
            .topSalesServices(
                salesDistrictRepositoryPort.findTopFiveServiceBySales(districtCode, currentPeriodCode, resolvedPreviousPeriodCode)
                    .stream()
                    .map(DistrictSalesServiceTopInfo::from)
                    .toList())
            .topSalesAdministrations(
                salesAdministrationRepositoryPort.findTopFiveByDistrictCode(districtCode, currentPeriodCode, resolvedPreviousPeriodCode)
                    .stream()
                    .map(DistrictSalesAdministrationTopInfo::from)
                    .toList())
            .build();
    }

    public List<DistrictAreaInfo> getAllDistricts(String currentPeriodCode) {
        // 1. 자치구 목록 조회
        // 2. 목록 Info 변환
        return footTrafficDistrictRepositoryPort.findDistrictAreasByPeriodCode(currentPeriodCode)
            .stream()
            .map(DistrictAreaInfo::from)
            .toList();
    }

    private DistrictPeriodFootTrafficInfo toPeriodFootTrafficInfo(List<FootTrafficDistrict> rows, String periodCode) {
        return rows.stream()
            .filter(row -> row.periodCode().equals(periodCode))
            .findFirst()
            .map(row -> DistrictPeriodFootTrafficInfo.builder()
                .periodCode(periodCode)
                .totalFootTraffic(row.totalFootTraffic())
                .build())
            .orElse(DistrictPeriodFootTrafficInfo.builder()
                .periodCode(periodCode)
                .totalFootTraffic(-1L)
                .build());
    }

    private FootTrafficTimeSlotType resolveDominantTimeSlot(FootTrafficDistrict current) {
        return getDominantEnum(
            FootTrafficTimeSlotType.TIME_00_TO_06,
            DistrictMetricValueInfo.of(FootTrafficTimeSlotType.TIME_00_TO_06, current.footTrafficTime00To06()),
            DistrictMetricValueInfo.of(FootTrafficTimeSlotType.TIME_06_TO_11, current.footTrafficTime06To11()),
            DistrictMetricValueInfo.of(FootTrafficTimeSlotType.TIME_11_TO_14, current.footTrafficTime11To14()),
            DistrictMetricValueInfo.of(FootTrafficTimeSlotType.TIME_14_TO_17, current.footTrafficTime14To17()),
            DistrictMetricValueInfo.of(FootTrafficTimeSlotType.TIME_17_TO_21, current.footTrafficTime17To21()),
            DistrictMetricValueInfo.of(FootTrafficTimeSlotType.TIME_21_TO_24, current.footTrafficTime21To24())
        );
    }

    private DistrictAgeGroupType resolveDominantAgeGroup(FootTrafficDistrict current) {
        return getDominantEnum(
            DistrictAgeGroupType.AGE_10,
            DistrictMetricValueInfo.of(DistrictAgeGroupType.AGE_10, current.age10FootTraffic()),
            DistrictMetricValueInfo.of(DistrictAgeGroupType.AGE_20, current.age20FootTraffic()),
            DistrictMetricValueInfo.of(DistrictAgeGroupType.AGE_30, current.age30FootTraffic()),
            DistrictMetricValueInfo.of(DistrictAgeGroupType.AGE_40, current.age40FootTraffic()),
            DistrictMetricValueInfo.of(DistrictAgeGroupType.AGE_50, current.age50FootTraffic()),
            DistrictMetricValueInfo.of(DistrictAgeGroupType.AGE_60_PLUS, current.age60PlusFootTraffic())
        );
    }

    private DistrictDayOfWeekType resolveDominantDayOfWeek(FootTrafficDistrict current) {
        return getDominantEnum(
            DistrictDayOfWeekType.MONDAY,
            DistrictMetricValueInfo.of(DistrictDayOfWeekType.MONDAY, current.mondayFootTraffic()),
            DistrictMetricValueInfo.of(DistrictDayOfWeekType.TUESDAY, current.tuesdayFootTraffic()),
            DistrictMetricValueInfo.of(DistrictDayOfWeekType.WEDNESDAY, current.wednesdayFootTraffic()),
            DistrictMetricValueInfo.of(DistrictDayOfWeekType.THURSDAY, current.thursdayFootTraffic()),
            DistrictMetricValueInfo.of(DistrictDayOfWeekType.FRIDAY, current.fridayFootTraffic()),
            DistrictMetricValueInfo.of(DistrictDayOfWeekType.SATURDAY, current.saturdayFootTraffic()),
            DistrictMetricValueInfo.of(DistrictDayOfWeekType.SUNDAY, current.sundayFootTraffic())
        );
    }

    private <E extends Enum<E>> E getDominantEnum(E defaultType, DistrictMetricValueInfo... metrics) {
        return Stream.of(metrics)
            .max(Comparator.comparingLong(DistrictMetricValueInfo::value))
            .map(DistrictMetricValueInfo::metricType)
            .map(defaultType.getDeclaringClass()::cast)
            .orElse(defaultType);
    }

    private PeriodTrendType resolveTrend(long previousValue, long currentValue) {
        if (currentValue > previousValue) {
            return PeriodTrendType.INCREASE;
        }

        if (currentValue < previousValue) {
            return PeriodTrendType.DECREASE;
        }

        return PeriodTrendType.STAGNANT;
    }
}


