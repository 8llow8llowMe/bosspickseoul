package com.followfollowme.nowdoboss.domainlayer.commercial.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.followfollowme.nowdoboss.domainlayer.category.domain.enums.ServiceType;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.trend.CommercialTrendInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.model.CommercialTrendMetricType;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.port.out.FootTrafficCommercialRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.port.out.SalesCommercialRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.port.out.StoreCommercialRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.FootTrafficCommercial;
import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.SalesCommercial;
import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.StoreCommercial;
import com.followfollowme.nowdoboss.domainlayer.district.application.common.PeriodCodeCalculator;
import com.followfollowme.nowdoboss.domainlayer.district.application.exception.DistrictException;
import com.followfollowme.nowdoboss.domainlayer.district.domain.enums.PeriodTrendType;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class CommercialTrendQueryProcessorTest {

    private final CommercialTrendQueryProcessor processor = new CommercialTrendQueryProcessor(
        new StubSalesCommercialRepositoryPort(),
        new StubFootTrafficCommercialRepositoryPort(),
        new StubStoreCommercialRepositoryPort(),
        new PeriodCodeCalculator()
    );

    @Test
    void getTrend_buildsAscendingPeriodsAndDetectsIncreaseFromLatestKnownValues() {
        CommercialTrendInfo info = processor.getTrend("C1", "CS100001", CommercialTrendMetricType.SALES, "20233", 4);

        assertThat(info.trendDirection()).isEqualTo(PeriodTrendType.INCREASE);
        assertThat(info.periods()).extracting(item -> item.periodCode()).containsExactly("20224", "20231", "20232", "20233");
        assertThat(info.periods()).extracting(item -> item.value()).containsExactly(100.0D, null, 120.0D, 150.0D);
        assertThat(info.periods()).extracting(item -> item.changeRate()).containsExactly(null, null, 0.2D, 0.25D);
    }

    @Test
    void getTrend_rejectsMalformedPeriodCode() {
        assertThatThrownBy(() -> processor.getTrend("C1", "CS100001", CommercialTrendMetricType.SALES, "20235", 4))
            .isInstanceOf(DistrictException.class);
    }

    private static final class StubSalesCommercialRepositoryPort implements SalesCommercialRepositoryPort {

        @Override
        public List<String> findDistinctServiceCodesByCommercialCode(String commercialCode) {
            return List.of();
        }

        @Override
        public Optional<SalesCommercial> findByPeriodCodeAndCommercialCodeAndServiceCode(
            String periodCode,
            String commercialCode,
            String serviceCode
        ) {
            return Optional.empty();
        }

        @Override
        public List<SalesCommercial> findByCommercialCodeAndServiceCodeAndPeriodCodeIn(
            String commercialCode,
            String serviceCode,
            List<String> periodCodes
        ) {
            return List.of(
                sales("20224", 100L),
                sales("20232", 120L),
                sales("20233", 150L)
            );
        }

        private SalesCommercial sales(String periodCode, long monthlySalesAmount) {
            return SalesCommercial.builder()
                .periodCode(periodCode)
                .commercialCode("C1")
                .serviceCode("CS100001")
                .serviceType(ServiceType.RESTAURANT)
                .monthlySalesAmount(monthlySalesAmount)
                .build();
        }
    }

    private static final class StubFootTrafficCommercialRepositoryPort implements FootTrafficCommercialRepositoryPort {

        @Override
        public Optional<FootTrafficCommercial> findByPeriodCodeAndCommercialCode(String periodCode, String commercialCode) {
            return Optional.empty();
        }

        @Override
        public List<FootTrafficCommercial> findByCommercialCodeAndPeriodCodeIn(String commercialCode, List<String> periodCodes) {
            return List.of();
        }
    }

    private static final class StubStoreCommercialRepositoryPort implements StoreCommercialRepositoryPort {

        @Override
        public Optional<StoreCommercial> findByPeriodCodeAndCommercialCodeAndServiceCode(
            String periodCode,
            String commercialCode,
            String serviceCode
        ) {
            return Optional.empty();
        }

        @Override
        public List<StoreCommercial> findByPeriodCodeAndCommercialCodeAndServiceType(
            String periodCode,
            String commercialCode,
            ServiceType serviceType
        ) {
            return List.of();
        }

        @Override
        public List<StoreCommercial> findByCommercialCodeAndServiceCodeAndPeriodCodeIn(
            String commercialCode,
            String serviceCode,
            List<String> periodCodes
        ) {
            return List.of();
        }
    }
}
