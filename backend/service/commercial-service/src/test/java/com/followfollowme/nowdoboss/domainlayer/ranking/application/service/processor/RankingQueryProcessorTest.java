package com.followfollowme.nowdoboss.domainlayer.ranking.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.followfollowme.nowdoboss.domainlayer.ranking.application.exception.RankingErrorCode;
import com.followfollowme.nowdoboss.domainlayer.ranking.application.exception.RankingException;
import com.followfollowme.nowdoboss.domainlayer.ranking.application.info.AnalysisRankingInfo;
import com.followfollowme.nowdoboss.domainlayer.ranking.application.model.AnalysisRankingEntry;
import com.followfollowme.nowdoboss.domainlayer.ranking.application.port.out.AnalysisRankingStorePort;
import com.followfollowme.nowdoboss.domainlayer.ranking.domain.enums.AnalysisAreaType;
import com.followfollowme.nowdoboss.domainlayer.ranking.domain.model.AnalysisViewEvent;
import com.followfollowme.nowdoboss.global.properties.RankingProperties;
import java.util.List;
import org.junit.jupiter.api.Test;

class RankingQueryProcessorTest {

    private final RankingQueryProcessor processor = new RankingQueryProcessor(
        new StubAnalysisRankingStorePort(),
        new RankingProperties(false, "bosspick.analysis-events", 24, 50, 3, 1)
    );

    @Test
    void getTopRankings_returnsEntriesWithWindowHours() {
        AnalysisRankingInfo info = processor.getTopRankings(AnalysisAreaType.COMMERCIAL, 10);

        assertThat(info.areaType()).isEqualTo(AnalysisAreaType.COMMERCIAL);
        assertThat(info.windowHours()).isEqualTo(24);
        assertThat(info.entries()).hasSize(2);
        assertThat(info.entries().get(0).areaCode()).isEqualTo("3110008");
    }

    // areaType 은 enum RequestParam 바인딩이라 잘못된 값은 컨트롤러 진입 전에
    // MethodArgumentTypeMismatchException(COMMERCIAL_102)으로 걸러진다.

    @Test
    void getTopRankings_rejectsSizeOutOfRange() {
        assertThatThrownBy(() -> processor.getTopRankings(AnalysisAreaType.COMMERCIAL, 0))
            .isInstanceOf(RankingException.class)
            .extracting(exception -> ((RankingException) exception).getErrorCode())
            .isEqualTo(RankingErrorCode.INVALID_SIZE);

        assertThatThrownBy(() -> processor.getTopRankings(AnalysisAreaType.COMMERCIAL, 51))
            .isInstanceOf(RankingException.class)
            .extracting(exception -> ((RankingException) exception).getErrorCode())
            .isEqualTo(RankingErrorCode.INVALID_SIZE);
    }

    private static class StubAnalysisRankingStorePort implements AnalysisRankingStorePort {

        @Override
        public void recordView(AnalysisViewEvent event) {
        }

        @Override
        public List<AnalysisRankingEntry> getTopRankings(AnalysisAreaType areaType, int size) {
            return List.of(
                new AnalysisRankingEntry("3110008", "강남역", 128L),
                new AnalysisRankingEntry("3110009", null, 64L)
            );
        }
    }
}
