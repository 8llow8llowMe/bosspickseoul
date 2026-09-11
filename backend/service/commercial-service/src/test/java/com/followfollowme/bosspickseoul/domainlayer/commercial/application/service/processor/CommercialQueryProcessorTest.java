package com.followfollowme.bosspickseoul.domainlayer.commercial.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.category.domain.enums.ServiceType;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.summary.CommercialStoreAnalysisInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.StoreCommercialRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.StoreCommercial;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CommercialQueryProcessorTest {

    private static final String PERIOD = "20241";
    private static final String COMMERCIAL = "3110008";
    private static final String SERVICE = "CS100001";

    @Mock
    private StoreCommercialRepositoryPort storeCommercialRepositoryPort;

    @InjectMocks
    private CommercialQueryProcessor processor;

    @Test
    void getStore_serviceTypeNull_skipsPeerLookupInsteadOfMatchingEveryServiceType() {
        // 이슈 #355: service_type 이 null 이면 파생 쿼리가 IS NULL 로 나가 동종업종 필터가 통째로 풀린다
        when(storeCommercialRepositoryPort.findByPeriodCodeAndCommercialCodeAndServiceCode(PERIOD, COMMERCIAL, SERVICE))
            .thenReturn(Optional.of(store(SERVICE, null)));

        CommercialStoreAnalysisInfo info = processor.getStoreByPeriodCodeAndCommercialCodeAndServiceCode(PERIOD, COMMERCIAL, SERVICE);

        assertThat(info.peerStores()).isEmpty();
        assertThat(info.totalStoreCount()).isEqualTo(12L);
        verify(storeCommercialRepositoryPort, never())
            .findByPeriodCodeAndCommercialCodeAndServiceType(anyString(), anyString(), any());
    }

    @Test
    void getStore_serviceTypePresent_returnsPeersExceptTheTargetItself() {
        when(storeCommercialRepositoryPort.findByPeriodCodeAndCommercialCodeAndServiceCode(PERIOD, COMMERCIAL, SERVICE))
            .thenReturn(Optional.of(store(SERVICE, ServiceType.RESTAURANT)));
        when(storeCommercialRepositoryPort.findByPeriodCodeAndCommercialCodeAndServiceType(PERIOD, COMMERCIAL, ServiceType.RESTAURANT))
            .thenReturn(List.of(store(SERVICE, ServiceType.RESTAURANT), store("CS100002", ServiceType.RESTAURANT)));

        CommercialStoreAnalysisInfo info = processor.getStoreByPeriodCodeAndCommercialCodeAndServiceCode(PERIOD, COMMERCIAL, SERVICE);

        assertThat(info.peerStores()).extracting("serviceCode").containsExactly("CS100002");
    }

    private static StoreCommercial store(String serviceCode, ServiceType serviceType) {
        return StoreCommercial.builder()
            .id(1L)
            .periodCode(PERIOD)
            .commercialCode(COMMERCIAL)
            .commercialName("배화여자대학교")
            .serviceCode(serviceCode)
            .serviceName("한식음식점")
            .serviceType(serviceType)
            .totalStoreCount(12L)
            .similarStoreCount(3L)
            .openingRate(1.5)
            .openedStoreCount(2L)
            .closureRate(0.5)
            .closedStoreCount(1L)
            .franchiseStoreCount(0L)
            .build();
    }
}
