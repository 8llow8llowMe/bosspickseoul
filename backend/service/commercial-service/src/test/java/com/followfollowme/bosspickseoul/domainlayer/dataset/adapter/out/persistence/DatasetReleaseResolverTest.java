package com.followfollowme.bosspickseoul.domainlayer.dataset.adapter.out.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.dataset.adapter.out.persistence.entity.DatasetActiveReleaseEntity;
import com.followfollowme.bosspickseoul.domainlayer.dataset.adapter.out.persistence.entity.DatasetActiveReleaseId;
import com.followfollowme.bosspickseoul.domainlayer.dataset.adapter.out.persistence.repository.DatasetActiveReleaseRepository;
import com.followfollowme.bosspickseoul.global.properties.DatasetReadProperties;
import com.followfollowme.bosspickseoul.shared.enums.DatasetKey;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class DatasetReleaseResolverTest {

    private static final Instant START = Instant.parse("2026-09-09T00:00:00Z");
    private static final DatasetActiveReleaseId SLOT =
        new DatasetActiveReleaseId("CHANGE_COMMERCIAL", "20241", "legacy-20233", "seoul-v1");

    @Mock
    private DatasetActiveReleaseRepository repository;

    private final AtomicReference<Instant> now = new AtomicReference<>(START);
    private DatasetReleaseResolver resolver;

    @BeforeEach
    void setUp() {
        Clock clock = new Clock() {
            @Override public java.time.ZoneId getZone() { return ZoneOffset.UTC; }
            @Override public Clock withZone(java.time.ZoneId zone) { return this; }
            @Override public Instant instant() { return now.get(); }
        };
        resolver = new DatasetReleaseResolver(repository,
            new DatasetReadProperties(true, "legacy-20233", "seoul-v1", "20241", Duration.ofSeconds(60)), clock);
    }

    @Test
    void resolvesTheSlotFromConfiguredSpatialAndSchemaVersion() {
        when(repository.findById(SLOT)).thenReturn(Optional.of(release("change-commercial-20241-002")));

        assertThat(resolver.activeRunId(DatasetKey.CHANGE_COMMERCIAL, "20241")).contains("change-commercial-20241-002");
    }

    @Test
    void cachesHitsAndAbsencesUntilTtlExpires() {
        when(repository.findById(SLOT)).thenReturn(Optional.empty());

        assertThat(resolver.activeRunId(DatasetKey.CHANGE_COMMERCIAL, "20241")).isEmpty();
        assertThat(resolver.activeRunId(DatasetKey.CHANGE_COMMERCIAL, "20241")).isEmpty();
        verify(repository, times(1)).findById(any());

        // TTL 이 지나면 다시 묻고, 그 사이 게시된 run 을 본다
        now.set(START.plusSeconds(61));
        when(repository.findById(SLOT)).thenReturn(Optional.of(release("change-commercial-20241-001")));
        assertThat(resolver.activeRunId(DatasetKey.CHANGE_COMMERCIAL, "20241")).contains("change-commercial-20241-001");
        verify(repository, times(2)).findById(any());
    }

    @Test
    void slotWithNullRunIdMeansNoActiveRelease() {
        when(repository.findById(SLOT)).thenReturn(Optional.of(release(null)));

        assertThat(resolver.activeRunId(DatasetKey.CHANGE_COMMERCIAL, "20241")).isEmpty();
    }

    @Test
    void evictAllForcesAFreshLookup() {
        when(repository.findById(SLOT)).thenReturn(Optional.empty());
        resolver.activeRunId(DatasetKey.CHANGE_COMMERCIAL, "20241");

        resolver.evictAll();
        resolver.activeRunId(DatasetKey.CHANGE_COMMERCIAL, "20241");

        verify(repository, times(2)).findById(any());
    }

    private static DatasetActiveReleaseEntity release(String runId) {
        return DatasetActiveReleaseEntity.builder().id(SLOT).runId(runId).build();
    }
}
