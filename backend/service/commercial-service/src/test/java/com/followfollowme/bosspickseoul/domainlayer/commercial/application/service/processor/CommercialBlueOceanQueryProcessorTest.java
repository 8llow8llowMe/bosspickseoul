package com.followfollowme.bosspickseoul.domainlayer.commercial.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.commercial.application.exception.CommercialErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.exception.CommercialException;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.candidate.BlueOceanCategoryInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.AdministrationStoreQueryPort;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.CommercialRegionQueryPort;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.StoreCommercialRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.query.AdministrationServiceStoreQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.query.CommercialAdministrationQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.StoreCommercial;
import java.util.List;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CommercialBlueOceanQueryProcessorTest {

    private static final String PERIOD = "20233";
    private static final String COMMERCIAL = "3111078";

    @Mock
    private CommercialRegionQueryPort commercialRegionQueryPort;

    @Mock
    private AdministrationStoreQueryPort administrationStoreQueryPort;

    @Mock
    private StoreCommercialRepositoryPort storeCommercialRepositoryPort;

    @InjectMocks
    private CommercialBlueOceanQueryProcessor processor;

    @Test
    void getBlueOceanCategories_sortsByLowestShareAndAppliesLaplaceCorrectionForMissingCategories() {
        givenAdministration();
        when(administrationStoreQueryPort.findAllByPeriodCodeAndAdministrationCode(PERIOD, "11740685"))
            .thenReturn(List.of(
                administrationStore("CS100001", "한식음식점", 50),
                administrationStore("CS100010", "커피-음료", 40),
                administrationStore("CS300002", "편의점", 9)
            ));
        // 내 상권: 한식 10개(점유 20%), 편의점 3개(점유 33.3%), 커피-음료는 없음
        when(storeCommercialRepositoryPort.findAllByPeriodCodeAndCommercialCode(PERIOD, COMMERCIAL))
            .thenReturn(List.of(
                commercialStore("CS100001", 10),
                commercialStore("CS300002", 3)
            ));

        List<BlueOceanCategoryInfo> result = processor.getBlueOceanCategories(PERIOD, COMMERCIAL);

        assertThat(result).hasSize(3);
        // 미보유 업종(커피-음료)은 라플라스 보정 1/(40+1)*100 ≈ 2.44% 로 가장 낮아 1순위
        assertThat(result.get(0).serviceCode()).isEqualTo("CS100010");
        assertThat(result.get(0).commercialStoreCount()).isZero();
        assertThat(result.get(0).storeRate()).isCloseTo(100D / 41, org.assertj.core.data.Offset.offset(0.01));
        // 한식 20% < 편의점 33.3%
        assertThat(result.get(1).serviceCode()).isEqualTo("CS100001");
        assertThat(result.get(1).storeRate()).isCloseTo(20D, org.assertj.core.data.Offset.offset(0.01));
        assertThat(result.get(2).serviceCode()).isEqualTo("CS300002");
    }

    @Test
    void getBlueOceanCategories_limitsToTopFive() {
        givenAdministration();
        when(administrationStoreQueryPort.findAllByPeriodCodeAndAdministrationCode(PERIOD, "11740685"))
            .thenReturn(IntStream.rangeClosed(1, 7)
                .mapToObj(i -> administrationStore("CS10000" + i, "업종" + i, 10 + i))
                .toList());
        when(storeCommercialRepositoryPort.findAllByPeriodCodeAndCommercialCode(PERIOD, COMMERCIAL))
            .thenReturn(List.of());

        assertThat(processor.getBlueOceanCategories(PERIOD, COMMERCIAL)).hasSize(5);
    }

    @Test
    void getBlueOceanCategories_regionLookupFailure_returnsEmptyInsteadOfFailingRecommendation() {
        when(commercialRegionQueryPort.getCommercialAdministration(anyString()))
            .thenThrow(new CommercialException(CommercialErrorCode.INTERNAL_SERVICE_UNAVAILABLE));

        assertThat(processor.getBlueOceanCategories(PERIOD, COMMERCIAL)).isEmpty();
    }

    private void givenAdministration() {
        when(commercialRegionQueryPort.getCommercialAdministration(COMMERCIAL))
            .thenReturn(new CommercialAdministrationQueryResult("11740", "강동구", "11740685", "길동"));
    }

    private AdministrationServiceStoreQueryResult administrationStore(String serviceCode, String serviceName, long count) {
        return AdministrationServiceStoreQueryResult.builder()
            .serviceCode(serviceCode)
            .serviceName(serviceName)
            .totalStoreCount(count)
            .build();
    }

    private StoreCommercial commercialStore(String serviceCode, long count) {
        return StoreCommercial.builder()
            .periodCode(PERIOD)
            .commercialCode(COMMERCIAL)
            .serviceCode(serviceCode)
            .totalStoreCount(count)
            .build();
    }
}
