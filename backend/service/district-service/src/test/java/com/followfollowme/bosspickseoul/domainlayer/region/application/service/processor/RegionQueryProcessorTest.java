package com.followfollowme.bosspickseoul.domainlayer.region.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.region.application.exception.RegionErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.region.application.exception.RegionException;
import com.followfollowme.bosspickseoul.domainlayer.region.application.info.RegionCodeLookupInfo;
import com.followfollowme.bosspickseoul.domainlayer.region.application.port.out.CommercialRegionMappingRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.region.application.port.out.CoordinateTransformPort;
import com.followfollowme.bosspickseoul.domainlayer.region.application.port.out.query.RegionCodeLookupQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.region.domain.enums.RegionCodeType;
import java.util.List;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * 지역명 조회가 0건 · 1건 · 다건에서 각각 어떤 결과를 내는지 고정한다.
 *
 * <p>이름으로 코드를 찾는 조회는 DISTINCT 를 걸어도 단건이 보장되지 않는다. DISTINCT 는 선택된
 * 컬럼 조합에만 걸리므로, 자치구가 다른 동명 행정동(신사동 등)과 동명 상권은 접히지 않고 그대로
 * 다건으로 올라온다. 예전에는 포트가 {@code Optional} 을 돌려줘 이 경우
 * {@code IncorrectResultSizeDataAccessException} 으로 500 이 났다 — 사용자 입력이 원인인데
 * 서버 장애처럼 보였고, 재현 데이터가 몇 개뿐이라 조용히 남아 있었다.
 *
 * <p>0건일 때 타입별로 서로 다른 404 코드를 고르는 스위치도 함께 고정한다. 세 코드가 같은 모양이라
 * 한 갈래가 엉뚱한 코드를 가리켜도 컴파일로는 드러나지 않는다.
 */
@ExtendWith(MockitoExtension.class)
class RegionQueryProcessorTest {

    @Mock
    private CommercialRegionMappingRepositoryPort commercialRegionMappingRepositoryPort;

    @Mock
    private CoordinateTransformPort coordinateTransformPort;

    @InjectMocks
    private RegionQueryProcessor regionQueryProcessor;

    @Test
    @DisplayName("자치구 이름이 없으면 REGION_002")
    void missingDistrictNameReturnsNotFoundDistrict() {
        when(commercialRegionMappingRepositoryPort.findDistinctByDistrictName("없는구")).thenReturn(List.of());

        assertErrorCode(
            () -> regionQueryProcessor.lookupRegionCode(RegionCodeType.DISTRICT, "없는구"),
            RegionErrorCode.NOT_FOUND_DISTRICT
        );
    }

    @Test
    @DisplayName("행정동 이름이 없으면 REGION_003")
    void missingAdministrationNameReturnsNotFoundAdministration() {
        when(commercialRegionMappingRepositoryPort.findDistinctByAdministrationName("없는동")).thenReturn(List.of());

        assertErrorCode(
            () -> regionQueryProcessor.lookupRegionCode(RegionCodeType.ADMINISTRATION, "없는동"),
            RegionErrorCode.NOT_FOUND_ADMINISTRATION
        );
    }

    @Test
    @DisplayName("상권 이름이 없으면 REGION_004")
    void missingCommercialNameReturnsNotFoundCommercial() {
        when(commercialRegionMappingRepositoryPort.findDistinctByCommercialName("없는상권")).thenReturn(List.of());

        assertErrorCode(
            () -> regionQueryProcessor.lookupRegionCode(RegionCodeType.COMMERCIAL, "없는상권"),
            RegionErrorCode.NOT_FOUND_COMMERCIAL
        );
    }

    @Test
    @DisplayName("단건이면 그 결과를 그대로 Info 로 돌려준다")
    void singleMatchIsReturned() {
        when(commercialRegionMappingRepositoryPort.findDistinctByDistrictName("종로구"))
            .thenReturn(List.of(lookup("11110", "종로구", null, null)));

        RegionCodeLookupInfo info = regionQueryProcessor.lookupRegionCode(RegionCodeType.DISTRICT, "종로구");

        assertThat(info.districtCode()).isEqualTo("11110");
        assertThat(info.districtName()).isEqualTo("종로구");
        assertThat(info.administrationCode()).isNull();
    }

    @Test
    @DisplayName("같은 이름의 행정동이 여러 자치구에 있으면 REGION_006")
    void ambiguousAdministrationNameIsRejected() {
        when(commercialRegionMappingRepositoryPort.findDistinctByAdministrationName("신사동"))
            .thenReturn(List.of(
                lookup("11680", "강남구", "1168064000", "신사동"),
                lookup("11470", "관악구", "1147064000", "신사동")
            ));

        assertErrorCode(
            () -> regionQueryProcessor.lookupRegionCode(RegionCodeType.ADMINISTRATION, "신사동"),
            RegionErrorCode.AMBIGUOUS_REGION_NAME
        );
    }

    @Test
    @DisplayName("같은 이름의 상권이 여러 곳이면 REGION_006")
    void ambiguousCommercialNameIsRejected() {
        when(commercialRegionMappingRepositoryPort.findDistinctByCommercialName("먹자골목"))
            .thenReturn(List.of(
                lookup("11680", "강남구", "1168064000", "역삼1동"),
                lookup("11110", "종로구", "1111053000", "종로1234가동")
            ));

        assertErrorCode(
            () -> regionQueryProcessor.lookupRegionCode(RegionCodeType.COMMERCIAL, "먹자골목"),
            RegionErrorCode.AMBIGUOUS_REGION_NAME
        );
    }

    @Test
    @DisplayName("동명 다건은 404 가 아니라 400 으로 내려간다")
    void ambiguousNameIsBadRequestNotNotFound() {
        when(commercialRegionMappingRepositoryPort.findDistinctByDistrictName("중복구"))
            .thenReturn(List.of(lookup("11110", "중복구", null, null), lookup("11140", "중복구", null, null)));

        assertThatThrownBy(() -> regionQueryProcessor.lookupRegionCode(RegionCodeType.DISTRICT, "중복구"))
            .isInstanceOf(RegionException.class)
            .extracting(exception -> ((RegionException) exception).getErrorCode().getHttpStatus().value())
            .isEqualTo(400);
    }

    private static RegionCodeLookupQueryResult lookup(
        String districtCode, String districtName, String administrationCode, String administrationName
    ) {
        return RegionCodeLookupQueryResult.builder()
            .districtCode(districtCode)
            .districtName(districtName)
            .administrationCode(administrationCode)
            .administrationName(administrationName)
            .build();
    }

    private static void assertErrorCode(ThrowingCallable callable, RegionErrorCode expected) {
        assertThatThrownBy(callable)
            .isInstanceOf(RegionException.class)
            .extracting(exception -> ((RegionException) exception).getErrorCode())
            .isEqualTo(expected);
    }
}
