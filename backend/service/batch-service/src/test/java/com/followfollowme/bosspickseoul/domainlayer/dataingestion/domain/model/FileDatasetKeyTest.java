package com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.followfollowme.bosspickseoul.shared.enums.FileDatasetKey;
import org.junit.jupiter.api.Test;

/**
 * 공유 모듈의 파일 원천 계약을 소비자 쪽에서 고정한다. shared-commercial 테스트는 Jenkins 가 돌리지 않으므로
 * ({@code :service:batch-service:test} 만 실행) {@code DatasetKey} 와 같이 이 서비스가 계약을 지킨다.
 */
class FileDatasetKeyTest {

    /**
     * 포털 파일데이터 3046077 의 2024-12-31 기준 파일(2026-10-01 내려받음) 헤더 그대로다.
     * 순서가 바뀌어도 적재가 멈춰야 하므로 집합이 아니라 순서로 비교한다.
     */
    @Test
    void pinsThePensionIncomeSourceIdAndHeaderOrder() {
        FileDatasetKey key = FileDatasetKey.NPS_DISTRICT_AVERAGE_INCOME;

        assertThat(key.sourceId()).isEqualTo("data.go.kr:3046077");
        assertThat(key.headers()).containsExactly("기준년월", "시군구", "평균소득월액");
    }

    @Test
    void headersCannotBeChangedByAConsumer() {
        assertThatThrownBy(() -> FileDatasetKey.NPS_DISTRICT_AVERAGE_INCOME.headers().add("extra"))
            .isInstanceOf(UnsupportedOperationException.class);
    }
}
