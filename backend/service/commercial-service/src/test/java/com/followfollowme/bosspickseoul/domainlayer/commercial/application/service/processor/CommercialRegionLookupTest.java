package com.followfollowme.bosspickseoul.domainlayer.commercial.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.commercial.application.exception.CommercialErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.exception.CommercialException;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.CommercialRegionQueryPort;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.query.CommercialAdministrationQueryResult;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/** 한 요청 안의 상권 -> 지역 해석이 지역 서비스를 한 번만 부르는지 고정한다. (이슈 #415) */
@ExtendWith(MockitoExtension.class)
class CommercialRegionLookupTest {

    private static final String COMMERCIAL = "3110008";

    @Mock
    private CommercialRegionQueryPort commercialRegionQueryPort;

    @Test
    @DisplayName("만들기만 해서는 지역 서비스를 부르지 않는다")
    void of_doesNotCallRegionService() {
        CommercialRegionLookup.of(commercialRegionQueryPort, COMMERCIAL);

        verifyNoInteractions(commercialRegionQueryPort);
    }

    @Test
    @DisplayName("두 번 물어도 지역 서비스는 한 번만 부르고 같은 결과를 돌려준다")
    void administration_memoizesResolvedRegion() {
        CommercialAdministrationQueryResult mapping = new CommercialAdministrationQueryResult("11110", "종로구", "11110515", "청운효자동");
        when(commercialRegionQueryPort.getCommercialAdministration(COMMERCIAL)).thenReturn(mapping);
        CommercialRegionLookup lookup = CommercialRegionLookup.of(commercialRegionQueryPort, COMMERCIAL);

        assertThat(lookup.administration()).isSameAs(mapping);
        assertThat(lookup.administration()).isSameAs(mapping);
        verify(commercialRegionQueryPort, times(1)).getCommercialAdministration(COMMERCIAL);
    }

    @Test
    @DisplayName("매핑이 없는 상권(404)은 null 로 기억해 두 번째 판정도 다시 부르지 않는다")
    void administration_memoizesNotFoundAsNull() {
        when(commercialRegionQueryPort.getCommercialAdministration(COMMERCIAL))
            .thenThrow(new CommercialException(CommercialErrorCode.COMMERCIAL_NOT_FOUND));
        CommercialRegionLookup lookup = CommercialRegionLookup.of(commercialRegionQueryPort, COMMERCIAL);

        assertThat(lookup.administration()).isNull();
        assertThat(lookup.administration()).isNull();
        verify(commercialRegionQueryPort, times(1)).getCommercialAdministration(COMMERCIAL);
    }

    @Test
    @DisplayName("지역 서비스 장애(503)는 삼키지 않고 전파한다")
    void administration_serviceUnavailable_propagates() {
        when(commercialRegionQueryPort.getCommercialAdministration(COMMERCIAL))
            .thenThrow(new CommercialException(CommercialErrorCode.INTERNAL_SERVICE_UNAVAILABLE));
        CommercialRegionLookup lookup = CommercialRegionLookup.of(commercialRegionQueryPort, COMMERCIAL);

        assertThatThrownBy(lookup::administration)
            .isInstanceOf(CommercialException.class)
            .extracting(exception -> ((CommercialException) exception).getErrorCode())
            .isEqualTo(CommercialErrorCode.INTERNAL_SERVICE_UNAVAILABLE);
    }
}
