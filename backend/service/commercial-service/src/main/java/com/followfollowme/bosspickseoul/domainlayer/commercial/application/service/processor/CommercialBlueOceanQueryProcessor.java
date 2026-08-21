package com.followfollowme.bosspickseoul.domainlayer.commercial.application.service.processor;

import com.followfollowme.bosspickseoul.domainlayer.commercial.application.exception.CommercialException;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.candidate.BlueOceanCategoryInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.AdministrationStoreQueryPort;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.CommercialRegionQueryPort;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.StoreCommercialRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.query.AdministrationServiceStoreQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.StoreCommercial;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;

/**
 * 블루오션 업종 산정: 소속 행정동에는 점포가 많은데 내 상권에는 적은 업종일수록
 * "비어 있는 기회 업종"으로 본다. 점유율(내 상권 점포수 / 행정동 점포수)이 낮은 순 Top N.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CommercialBlueOceanQueryProcessor {

    private static final int TOP_CATEGORY_COUNT = 5;
    private static final double PERCENT = 100D;

    private final CommercialRegionQueryPort commercialRegionQueryPort;
    private final AdministrationStoreQueryPort administrationStoreQueryPort;
    private final StoreCommercialRepositoryPort storeCommercialRepositoryPort;

    /**
     * 블루오션은 추천 카드의 부가 정보이므로 산정 실패(지역 서비스 장애, 데이터 부재)가
     * 추천 요청 전체를 실패시키지 않도록 빈 목록으로 강등한다.
     * 단, 코딩 버그(NPE 등)까지 은폐하지 않도록 도메인/영속 예외로 범위를 한정한다.
     */
    public List<BlueOceanCategoryInfo> getBlueOceanCategories(String periodCode, String commercialCode) {
        try {
            String administrationCode = commercialRegionQueryPort
                .getCommercialAdministration(commercialCode)
                .administrationCode();
            return computeBlueOceanCategories(periodCode, commercialCode, administrationCode);
        } catch (CommercialException | DataAccessException exception) {
            log.warn("블루오션 업종 산정을 건너뜁니다. commercialCode={} reason={}", commercialCode, exception.getMessage());
            return List.of();
        }
    }

    private List<BlueOceanCategoryInfo> computeBlueOceanCategories(
        String periodCode, String commercialCode, String administrationCode
    ) {
        List<AdministrationServiceStoreQueryResult> administrationStores =
            administrationStoreQueryPort.findAllByPeriodCodeAndAdministrationCode(periodCode, administrationCode);
        if (administrationStores.isEmpty()) {
            return List.of();
        }

        Map<String, Long> commercialStoreCountByServiceCode = storeCommercialRepositoryPort
            .findAllByPeriodCodeAndCommercialCode(periodCode, commercialCode)
            .stream()
            .collect(Collectors.toMap(StoreCommercial::serviceCode, StoreCommercial::totalStoreCount, Long::sum));

        return administrationStores.stream()
            .filter(store -> store.totalStoreCount() > 0)
            .map(store -> toBlueOceanCategory(store, commercialStoreCountByServiceCode))
            .sorted(Comparator.comparingDouble(BlueOceanCategoryInfo::storeRate)
                .thenComparing(BlueOceanCategoryInfo::serviceName))
            .limit(TOP_CATEGORY_COUNT)
            .toList();
    }

    private BlueOceanCategoryInfo toBlueOceanCategory(
        AdministrationServiceStoreQueryResult administrationStore, Map<String, Long> commercialStoreCountByServiceCode
    ) {
        long commercialStoreCount = commercialStoreCountByServiceCode
            .getOrDefault(administrationStore.serviceCode(), 0L);
        // 내 상권에 해당 업종이 없으면 0%가 되어 전부 동률이 되므로,
        // 행정동 점포수가 많은 업종일수록 더 "비어 있는" 것으로 보이게 라플라스식 보정을 적용한다.
        double storeRate = commercialStoreCount > 0
            ? (double) commercialStoreCount / administrationStore.totalStoreCount() * PERCENT
            : 1D / (administrationStore.totalStoreCount() + 1) * PERCENT;

        return BlueOceanCategoryInfo.builder()
            .serviceCode(administrationStore.serviceCode())
            .serviceName(administrationStore.serviceName())
            .commercialStoreCount(commercialStoreCount)
            .administrationStoreCount(administrationStore.totalStoreCount())
            .storeRate(storeRate)
            .build();
    }
}
