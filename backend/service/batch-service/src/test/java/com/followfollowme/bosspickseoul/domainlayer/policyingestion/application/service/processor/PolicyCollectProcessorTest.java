package com.followfollowme.bosspickseoul.domainlayer.policyingestion.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.policyingestion.application.exception.PolicyIngestionErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.policyingestion.application.exception.PolicyIngestionException;
import com.followfollowme.bosspickseoul.domainlayer.policyingestion.application.model.BizinfoNotice;
import com.followfollowme.bosspickseoul.domainlayer.policyingestion.application.model.PolicyCollectSnapshot;
import com.followfollowme.bosspickseoul.domainlayer.policyingestion.application.model.PolicyUpsert;
import com.followfollowme.bosspickseoul.domainlayer.policyingestion.application.port.out.PolicyCommandPort;
import com.followfollowme.bosspickseoul.domainlayer.policyingestion.application.port.out.PolicySourcePort;
import com.followfollowme.bosspickseoul.domainlayer.policyingestion.domain.enums.PolicySource;
import com.followfollowme.bosspickseoul.domainlayer.policyingestion.domain.enums.PolicySupportType;
import com.followfollowme.bosspickseoul.global.properties.PolicyIngestionProperties;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PolicyCollectProcessorTest {

    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-09-09T15:00:00Z"), SEOUL);

    @Mock
    private PolicySourcePort sourcePort;
    @Mock
    private PolicyCommandPort commandPort;

    private PolicyCollectProcessor processor;

    @BeforeEach
    void setUp() {
        processor = new PolicyCollectProcessor(sourcePort, commandPort, properties(0.5), CLOCK);
    }

    @Test
    void prepareDoesNotTouchPersistenceWhenSourceFails() {
        when(sourcePort.fetchAll()).thenThrow(
            new PolicyIngestionException(PolicyIngestionErrorCode.SOURCE_FETCH_FAILED, "HTTP 500")
        );

        assertThatThrownBy(() -> processor.prepare()).isInstanceOf(PolicyIngestionException.class);
        verify(commandPort, never()).upsertAll(any(), any(), any());
        verify(commandPort, never()).staleMarkUnseen(any(), any(), any());
    }

    @Test
    void commitSkipsStaleMarkWhenAcceptedBelowHalfOfPrevious() {
        PolicyCollectSnapshot snapshot = snapshot(List.of(row("a")));
        when(commandPort.countBySource(PolicySource.BIZINFO)).thenReturn(10L);

        processor.commit(snapshot);

        verify(commandPort).upsertAll(eq(PolicySource.BIZINFO), eq(snapshot.rows()), eq(snapshot.seenAt()));
        verify(commandPort, never()).staleMarkUnseen(any(), any(), any());
    }

    @Test
    void commitStaleMarksWhenAcceptedMeetsHalfOfPrevious() {
        PolicyCollectSnapshot snapshot = snapshot(List.of(row("a"), row("b"), row("c"), row("d"), row("e")));
        when(commandPort.countBySource(PolicySource.BIZINFO)).thenReturn(10L);

        processor.commit(snapshot);

        verify(commandPort).staleMarkUnseen(
            PolicySource.BIZINFO,
            snapshot.seenAt(),
            snapshot.hideEndAt()
        );
    }

    @Test
    void commitDoesNotStaleMarkWhenThereWereNoPreviousBizinfoRows() {
        PolicyCollectSnapshot snapshot = snapshot(List.of(row("a")));
        when(commandPort.countBySource(PolicySource.BIZINFO)).thenReturn(0L);

        processor.commit(snapshot);

        verify(commandPort).upsertAll(eq(PolicySource.BIZINFO), eq(snapshot.rows()), any());
        verify(commandPort, never()).staleMarkUnseen(any(), any(), any());
    }

    @Test
    void normalizeMapsBizinfoFieldsAndLeavesIndustryNull() {
        PolicyUpsert row = processor.normalize(new BizinfoNotice(
            "PBLN_000000000120010",
            "식품안심업소 기술지원",
            "한국식품안전관리인증원",
            "https://www.bizinfo.go.kr/sii/siia/selectSIIA200Detail.do?pblancId=PBLN_000000000120010",
            "20260318 ~ 20260930",
            "음식점",
            "현장 맞춤형 기술지원",
            "기술"
        ));

        assertThat(row.externalId()).isEqualTo("PBLN_000000000120010");
        assertThat(row.supportType()).isEqualTo(PolicySupportType.FACILITY.name());
        assertThat(row.applyStartAt()).isEqualTo(LocalDate.of(2026, 3, 18));
        assertThat(row.applyEndAt()).isEqualTo(LocalDate.of(2026, 9, 30));
        assertThat(row.districtCode()).isNull();
        assertThat(row.serviceCategoryCode()).isNull();
    }

    @Test
    void normalizeSkipsRowsWithoutIdentity() {
        assertThat(processor.normalize(new BizinfoNotice(
            "", "제목", "기관", "https://example.test", "상시", "대상", "내용", "금융"
        ))).isNull();
    }

    @Test
    void mapSupportTypePrefersExistingFiveKinds() {
        assertThat(PolicyCollectProcessor.mapSupportType("금융")).isEqualTo(PolicySupportType.FUNDING);
        assertThat(PolicyCollectProcessor.mapSupportType("내수")).isEqualTo(PolicySupportType.MARKETING);
        assertThat(PolicyCollectProcessor.mapSupportType("창업")).isEqualTo(PolicySupportType.EDUCATION);
        assertThat(PolicyCollectProcessor.mapSupportType("기타")).isEqualTo(PolicySupportType.SUBSIDY);
    }

    private static PolicyCollectSnapshot snapshot(List<PolicyUpsert> rows) {
        return new PolicyCollectSnapshot(rows, LocalDateTime.of(2026, 9, 10, 0, 0), LocalDate.of(2026, 9, 9));
    }

    private static PolicyUpsert row(String id) {
        return new PolicyUpsert(
            id, "제목-" + id, "기관", "SUBSIDY", "대상", "내용",
            null, null, null, null, "https://example.test/" + id
        );
    }

    private static PolicyIngestionProperties properties(double ratio) {
        return new PolicyIngestionProperties(
            false, "0 0 6 * * ?", "0 30 6 * * ?", ratio, 30,
            new PolicyIngestionProperties.Bizinfo(
                "https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do",
                "key",
                "소상공인",
                100,
                20,
                30,
                3
            )
        );
    }
}
