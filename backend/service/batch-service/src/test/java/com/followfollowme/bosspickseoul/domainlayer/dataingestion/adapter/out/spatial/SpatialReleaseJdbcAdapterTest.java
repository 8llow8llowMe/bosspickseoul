package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.out.spatial;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.SpatialReleasePort;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;

/** 자동 최신화 run 은 공간 스냅샷이 READY 가 아니면 API 를 쓰기 전에 멈춘다. MySQL 문장이라 문장과 바인딩을 대조한다. */
class SpatialReleaseJdbcAdapterTest {

    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);

    @Test
    void readinessRequiresAReadySnapshotOfTheExactVersion() {
        when(jdbc.queryForObject(SpatialReleaseJdbcAdapter.READY_SQL, Long.class, "legacy-20233")).thenReturn(1L);
        SpatialReleasePort adapter = new SpatialReleaseJdbcAdapter(jdbc, mock(PlatformTransactionManager.class));

        assertThat(adapter.isReady("legacy-20233")).isTrue();
        assertThat(adapter.isReady("unknown")).isFalse();
        assertThat(SpatialReleaseJdbcAdapter.READY_SQL).contains("spatial_version=?").contains("status='READY'");
    }
}
