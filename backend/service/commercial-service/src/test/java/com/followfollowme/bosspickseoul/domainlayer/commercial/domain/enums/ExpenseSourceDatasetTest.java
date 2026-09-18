package com.followfollowme.bosspickseoul.domainlayer.commercial.domain.enums;

import static org.assertj.core.api.Assertions.assertThat;

import com.followfollowme.bosspickseoul.shared.enums.DatasetKey;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * 소비 출처가 인용하는 데이터셋 식별자가 <b>배치가 실제로 게시하는 것과 같은 상수</b>인지 고정한다. (이슈 #415)
 *
 * <p>같은 문자열을 batch-service 와 여기에 따로 박아 두면, 포털이 데이터셋을 재게시했을 때 배치만 고쳐도
 * 배치는 돌아가고 이 서비스는 죽은 ID 와 URL 을 출처로 계속 내보낸다. 이 프로젝트는 소비-상권배후지 재게시에서
 * 이미 한 번 겪었다. 지금은 두 축이 {@link DatasetKey} 하나를 보므로, 이름이 바뀌면 batch-service 의
 * {@code DatasetTest} 와 아래 리터럴 고정이 함께 깨진다.
 */
class ExpenseSourceDatasetTest {

    @Test
    @DisplayName("두 출처는 공유 데이터셋 계약의 해당 상수를 그대로 가리킨다")
    void eachSourcePointsAtTheSharedDatasetKey() {
        assertThat(ExpenseSourceDataset.COMMERCIAL_CONSUMPTION.getDatasetKey())
            .isEqualTo(DatasetKey.CONSUMPTION_COMMERCIAL);
        assertThat(ExpenseSourceDataset.ADMINISTRATION_CONSUMPTION.getDatasetKey())
            .isEqualTo(DatasetKey.CONSUMPTION_ADMINISTRATION);
    }

    @Test
    @DisplayName("응답에 싣는 sourceId 는 배치가 호출하는 Open API 서비스명과 같다")
    void datasetIdIsTheOpenApiServiceNameTheBatchCalls() {
        assertThat(ExpenseSourceDataset.COMMERCIAL_CONSUMPTION.getDatasetId())
            .isEqualTo(DatasetKey.CONSUMPTION_COMMERCIAL.openApiService())
            .isEqualTo("VwsmTrdhlNcmCnsmpQq");
        assertThat(ExpenseSourceDataset.ADMINISTRATION_CONSUMPTION.getDatasetId())
            .isEqualTo(DatasetKey.CONSUMPTION_ADMINISTRATION.openApiService())
            .isEqualTo("VwsmAdstrdNcmCnsmpW");
    }

    @Test
    @DisplayName("스코프 -> 원천 매핑은 이 서비스가 들고 있고 대체만 행정동 원천을 가리킨다")
    void scopeMapsToTheSourceThatActuallyCarriedTheValue() {
        assertThat(ExpenseScopeType.COMMERCIAL.source()).isEqualTo(ExpenseSourceDataset.COMMERCIAL_CONSUMPTION);
        assertThat(ExpenseScopeType.ADMINISTRATION_PROXY.source()).isEqualTo(ExpenseSourceDataset.ADMINISTRATION_CONSUMPTION);
        // 값이 없을 때도 「어느 원천이 끊겼는지」는 알려 준다. 끊긴 것은 상권 쪽이다.
        assertThat(ExpenseScopeType.UNAVAILABLE.source()).isEqualTo(ExpenseSourceDataset.COMMERCIAL_CONSUMPTION);
    }
}
