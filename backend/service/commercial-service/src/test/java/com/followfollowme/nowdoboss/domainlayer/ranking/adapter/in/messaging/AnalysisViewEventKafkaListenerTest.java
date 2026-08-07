package com.followfollowme.nowdoboss.domainlayer.ranking.adapter.in.messaging;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.nowdoboss.domainlayer.ranking.application.port.out.AnalysisRankingStorePort;
import com.followfollowme.nowdoboss.domainlayer.ranking.application.model.AnalysisRankingEntry;
import com.followfollowme.nowdoboss.domainlayer.ranking.application.service.processor.RankingCommandProcessor;
import com.followfollowme.nowdoboss.domainlayer.ranking.domain.enums.AnalysisAreaType;
import com.followfollowme.nowdoboss.domainlayer.ranking.domain.model.AnalysisViewEvent;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class AnalysisViewEventKafkaListenerTest {

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
    private final RecordingStorePort storePort = new RecordingStorePort();
    private final AnalysisViewEventKafkaListener listener = new AnalysisViewEventKafkaListener(
        new RankingCommandProcessor(storePort), objectMapper
    );

    @Test
    void onAnalysisViewEvent_recordsParsedEvent() {
        listener.onAnalysisViewEvent(
            "{\"areaType\":\"DISTRICT\",\"areaCode\":\"11680\",\"areaName\":\"강남구\",\"occurredAt\":\"2026-08-07T12:00:00\"}");

        assertThat(storePort.recorded).hasSize(1);
        assertThat(storePort.recorded.get(0).areaType()).isEqualTo(AnalysisAreaType.DISTRICT);
        assertThat(storePort.recorded.get(0).areaCode()).isEqualTo("11680");
    }

    @Test
    void onAnalysisViewEvent_skipsMalformedPayloadWithoutThrowing() {
        assertThatCode(() -> listener.onAnalysisViewEvent("not-a-json")).doesNotThrowAnyException();
        assertThat(storePort.recorded).isEmpty();
    }

    @Test
    void onAnalysisViewEvent_skipsStoreFailureWithoutThrowing() {
        storePort.failOnRecord = true;

        assertThatCode(() -> listener.onAnalysisViewEvent(
            "{\"areaType\":\"COMMERCIAL\",\"areaCode\":\"3110008\",\"areaName\":null,\"occurredAt\":\"2026-08-07T12:00:00\"}"))
            .doesNotThrowAnyException();
    }

    private static class RecordingStorePort implements AnalysisRankingStorePort {

        private final List<AnalysisViewEvent> recorded = new ArrayList<>();
        private boolean failOnRecord;

        @Override
        public void recordView(AnalysisViewEvent event) {
            if (failOnRecord) {
                throw new IllegalStateException("저장소 장애");
            }
            recorded.add(event);
        }

        @Override
        public List<AnalysisRankingEntry> getTopRankings(AnalysisAreaType areaType, int size) {
            return List.of();
        }
    }
}
