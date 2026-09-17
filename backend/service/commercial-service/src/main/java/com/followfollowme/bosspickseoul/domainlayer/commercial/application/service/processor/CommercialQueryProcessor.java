package com.followfollowme.bosspickseoul.domainlayer.commercial.application.service.processor;

import com.followfollowme.bosspickseoul.domainlayer.category.application.port.out.ServiceCategoryRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.category.domain.enums.ServiceType;
import com.followfollowme.bosspickseoul.domainlayer.category.domain.model.ServiceCategory;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.exception.CommercialErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.exception.CommercialException;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.facility.CommercialFacilityInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.foottraffic.CommercialFootTrafficInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.income.CommercialIncomeAndExpenseInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.population.CommercialResidentPopulationInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.sales.CommercialSalesInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.store.CommercialServiceCategoryInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.summary.CommercialPeerStoreInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.summary.CommercialStoreAnalysisInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.summary.CommercialStoreCountsInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.FacilityCommercialRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.FootTrafficCommercialRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.IncomeCommercialRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.PopulationCommercialRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.SalesCommercialRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.StoreCommercialRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.FacilityCommercial;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.FootTrafficCommercial;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.IncomeCommercial;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.PopulationCommercial;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.SalesCommercial;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.StoreCommercial;
import java.util.List;
import java.util.Map;
import java.util.function.BinaryOperator;
import java.util.function.Supplier;
import java.util.stream.Collectors;
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
    private final StoreCommercialRepositoryPort storeCommercialRepositoryPort;

    /**
     * 분기 종속 데이터 부재(404 {@link CommercialException})만 null 로 흡수한다. 그 외 예외는 전파한다.
     *
     * <p>{@code catch (CommercialException)} 으로 통째로 잡으면 503(INTERNAL_SERVICE_UNAVAILABLE)과
     * 400(요청 오류)까지 "데이터 없음"으로 뭉개져, 지역 서비스 장애가 지표 하나 빠진 정상 응답으로 보인다.
     * 비교·프로필 두 Processor 가 같은 판정을 쓰도록 여기 한 곳에 둔다.
     */
    static <T> T fetchOrNullWhenNotFound(Supplier<T> fetcher) {
        try {
            return fetcher.get();
        } catch (CommercialException exception) {
            if (exception.isNotFound()) {
                return null;
            }
            throw exception;
        }
    }

    public List<CommercialServiceCategoryInfo> getServiceCategoriesByCommercialCode(String commercialCode) {
        List<String> serviceCodes = salesCommercialRepositoryPort.findDistinctServiceCodesByCommercialCode(commercialCode);

        if (serviceCodes.isEmpty()) {
            return List.of();
        }

        List<ServiceCategory> serviceCategories = serviceCategoryRepositoryPort.findByServiceCodeIn(serviceCodes);

        return serviceCategories.stream()
            .map(CommercialServiceCategoryInfo::from)
            .toList();
    }

    public CommercialFootTrafficInfo getFootTrafficByPeriodCodeAndCommercialCode(String periodCode, String commercialCode) {
        FootTrafficCommercial footTrafficCommercial = footTrafficCommercialRepositoryPort.findByPeriodCodeAndCommercialCode(periodCode,
                commercialCode)
            .orElseThrow(() -> new CommercialException(CommercialErrorCode.FOOT_TRAFFIC_NOT_FOUND));
        return CommercialFootTrafficInfo.from(footTrafficCommercial);
    }

    public CommercialSalesInfo getSalesByPeriodCodeAndCommercialCodeAndServiceCode(
        String periodCode, String commercialCode, String serviceCode
    ) {
        SalesCommercial salesCommercial = salesCommercialRepositoryPort
            .findByPeriodCodeAndCommercialCodeAndServiceCode(periodCode, commercialCode, serviceCode)
            .orElseThrow(() -> new CommercialException(CommercialErrorCode.SALES_NOT_FOUND));
        return CommercialSalesInfo.from(salesCommercial);
    }

    public CommercialFacilityInfo getFacilityByPeriodAndCommercialCode(String periodCode, String commercialCode) {
        FacilityCommercial facilityCommercial = facilityCommercialRepositoryPort
            .findByPeriodCodeAndCommercialCode(periodCode, commercialCode)
            .orElseThrow(() -> new CommercialException(CommercialErrorCode.FACILITY_NOT_FOUND));
        return CommercialFacilityInfo.from(facilityCommercial);
    }

    public CommercialResidentPopulationInfo getPopulationByPeriodAndCommercialCode(String periodCode, String commercialCode) {
        PopulationCommercial populationCommercial = populationCommercialRepositoryPort
            .findByPeriodCodeAndCommercialCode(periodCode, commercialCode)
            .orElseThrow(() -> new CommercialException(CommercialErrorCode.RESIDENT_POPULATION_NOT_FOUND));
        return CommercialResidentPopulationInfo.from(populationCommercial);
    }

    /**
     * 상권 네이티브 소비 전용 경로. 행정동 대체 사다리를 타지 않는다. (이슈 #415)
     *
     * <p>이 메서드를 쓰는 곳은 비교와 후보 추천처럼 <b>상권끼리 우열을 가리는</b> 계산이다. 행정동 대체값은
     * 같은 행정동 안의 상권이 전부 같은 값이라 그 판정에 넣으면 행정동 단위로 뭉친 가짜 차이를 만든다.
     * 화면에 값을 보여 주는 {@code /commercials/{code}/income} 은
     * {@link CommercialExpenseProvenanceProcessor} 의 사다리를 쓴다.
     */
    public CommercialIncomeAndExpenseInfo getIncomeByPeriodCodeAndCommercialCode(String periodCode, String commercialCode) {
        IncomeCommercial incomeCommercial = incomeCommercialRepositoryPort.findByPeriodCodeAndCommercialCode(periodCode, commercialCode)
            .orElseThrow(() -> new CommercialException(CommercialErrorCode.INCOME_NOT_FOUND));
        return CommercialIncomeAndExpenseInfo.from(incomeCommercial);
    }

    public CommercialStoreAnalysisInfo getStoreByPeriodCodeAndCommercialCodeAndServiceCode(
        String periodCode,
        String commercialCode,
        String serviceCode
    ) {
        StoreCommercial targetStore = storeCommercialRepositoryPort.findByPeriodCodeAndCommercialCodeAndServiceCode(
                periodCode, commercialCode, serviceCode)
            .orElseThrow(() -> new CommercialException(CommercialErrorCode.STORE_NOT_FOUND));

        List<CommercialPeerStoreInfo> peerStores = findPeerStores(periodCode, commercialCode, serviceCode, targetStore.serviceType());

        return CommercialStoreAnalysisInfo.of(targetStore, peerStores);
    }

    /**
     * 여러 상권의 원천 지표를 분기당 조회 한 번으로 가져온다.
     *
     * <p>단건 메서드들을 상권 수만큼 반복하면 히트맵 한 번에 상권당 7회씩 왕복한다. 아래 벌크 메서드는
     * 상권 수와 무관하게 각 1회다. 요청한 코드 중 데이터가 없는 상권은 맵에 키가 없으므로,
     * 단건 경로가 예외로 알리던 「없음」을 호출부는 {@code null} 로 받는다.
     *
     * <p>같은 키가 둘 이상 오면 앞의 것을 쓴다. 정상 데이터에서는 생기지 않지만, 중복 적재가 있어도
     * {@code toMap} 이 {@code IllegalStateException} 을 던져 요청 전체를 죽이는 일은 없어야 한다.
     */
    public Map<String, CommercialSalesInfo> getSalesByPeriodCodeAndCommercialCodesAndServiceCode(
        String periodCode, List<String> commercialCodes, String serviceCode
    ) {
        return salesCommercialRepositoryPort
            .findAllByPeriodCodeAndServiceCodeAndCommercialCodeIn(periodCode, serviceCode, commercialCodes)
            .stream()
            .collect(Collectors.toMap(SalesCommercial::commercialCode, CommercialSalesInfo::from, keepFirst()));
    }

    public Map<String, CommercialFootTrafficInfo> getFootTrafficByPeriodCodeAndCommercialCodes(
        String periodCode, List<String> commercialCodes
    ) {
        return footTrafficCommercialRepositoryPort
            .findAllByPeriodCodeAndCommercialCodeIn(periodCode, commercialCodes)
            .stream()
            .collect(Collectors.toMap(FootTrafficCommercial::commercialCode, CommercialFootTrafficInfo::from, keepFirst()));
    }

    /**
     * 점포 집계 수치만 벌크로 가져온다. 동종업종 피어는 조회하지 않는다 —
     * 그래서 반환 타입이 {@link CommercialStoreAnalysisInfo} 가 아니라 {@link CommercialStoreCountsInfo} 다.
     */
    public Map<String, CommercialStoreCountsInfo> getStoreCountsByPeriodCodeAndCommercialCodesAndServiceCode(
        String periodCode, List<String> commercialCodes, String serviceCode
    ) {
        return storeCommercialRepositoryPort
            .findAllByPeriodCodeAndServiceCodeAndCommercialCodeIn(periodCode, serviceCode, commercialCodes)
            .stream()
            .collect(Collectors.toMap(StoreCommercial::commercialCode, CommercialStoreCountsInfo::from, keepFirst()));
    }

    public Map<String, CommercialResidentPopulationInfo> getPopulationByPeriodCodeAndCommercialCodes(
        String periodCode, List<String> commercialCodes
    ) {
        return populationCommercialRepositoryPort
            .findAllByPeriodCodeAndCommercialCodeIn(periodCode, commercialCodes)
            .stream()
            .collect(Collectors.toMap(PopulationCommercial::commercialCode, CommercialResidentPopulationInfo::from, keepFirst()));
    }

    /**
     * 히트맵 점수 원천용 벌크 조회. 단건과 마찬가지로 <b>네이티브만</b> 본다 — 행정동 대체값이 점수로
     * 흘러가면 안 되기 때문이다. (이슈 #415)
     */
    public Map<String, CommercialIncomeAndExpenseInfo> getIncomeByPeriodCodeAndCommercialCodes(
        String periodCode, List<String> commercialCodes
    ) {
        return incomeCommercialRepositoryPort
            .findAllByPeriodCodeAndCommercialCodeIn(periodCode, commercialCodes)
            .stream()
            .collect(Collectors.toMap(IncomeCommercial::commercialCode, CommercialIncomeAndExpenseInfo::from, keepFirst()));
    }

    public Map<String, CommercialFacilityInfo> getFacilityByPeriodCodeAndCommercialCodes(
        String periodCode, List<String> commercialCodes
    ) {
        return facilityCommercialRepositoryPort
            .findAllByPeriodCodeAndCommercialCodeIn(periodCode, commercialCodes)
            .stream()
            .collect(Collectors.toMap(FacilityCommercial::commercialCode, CommercialFacilityInfo::from, keepFirst()));
    }

    private static <T> BinaryOperator<T> keepFirst() {
        return (first, ignored) -> first;
    }

    /**
     * 동종업종 피어 조회. 프로필·히트맵·비교가 모두 이 경로를 다시 타므로 방어는 여기 한 곳에만 둔다.
     *
     * <p>{@code serviceType} 이 null 이면 조회 자체를 하지 않는다. Spring Data 파생 쿼리는 파라미터가 null 이면
     * {@code = ?} 가 아니라 {@code IS NULL} 로 나가므로, {@code service_type} 이 null 로 적재된 행이 있으면
     * 동종업종 필터가 통째로 풀려 그 상권·분기의 거의 모든 업종이 피어로 딸려온다. 빈 결과보다 나쁜 조용한 오답이다.
     */
    private List<CommercialPeerStoreInfo> findPeerStores(
        String periodCode, String commercialCode, String serviceCode, ServiceType serviceType
    ) {
        if (serviceType == null) {
            return List.of();
        }

        return storeCommercialRepositoryPort.findByPeriodCodeAndCommercialCodeAndServiceType(periodCode, commercialCode, serviceType)
            .stream()
            .filter(store -> !store.serviceCode().equals(serviceCode))
            .map(CommercialPeerStoreInfo::from)
            .toList();
    }
}