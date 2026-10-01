package com.followfollowme.bosspickseoul.domainlayer.commercial.domain.enums;

import static org.assertj.core.api.Assertions.assertThat;

import com.followfollowme.bosspickseoul.shared.enums.FileDatasetKey;
import java.time.LocalDate;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * 소득 출처가 인용하는 식별자가 <b>배치가 원본 헤더를 대조하는 것과 같은 계약</b>인지 고정한다. (이슈 #415)
 *
 * <p>{@link ExpenseSourceDatasetTest} 와 같은 이유다. 원천 식별자를 batch-service 와 여기에 따로 박아 두면 포털이 파일을
 * 재게시했을 때 한쪽만 고쳐지고, 이 서비스는 죽은 데이터셋 번호를 출처로 계속 내보낸다. 두 축은 공유 모듈의
 * {@link FileDatasetKey} 하나를 본다.
 */
class IncomeSourceDatasetTest {

    @Test
    @DisplayName("국민연금 출처는 공유 파일 원천 계약을 가리키고 sourceId 를 그 계약에 위임한다")
    void sourcePointsAtTheSharedFileDatasetKey() {
        IncomeSourceDataset source = IncomeSourceDataset.NPS_DISTRICT_AVERAGE_INCOME;

        assertThat(source.getFileDatasetKey()).isEqualTo(FileDatasetKey.NPS_DISTRICT_AVERAGE_INCOME);
        assertThat(source.getDatasetId())
            .isEqualTo(FileDatasetKey.NPS_DISTRICT_AVERAGE_INCOME.sourceId())
            .isEqualTo("data.go.kr:3046077");
        assertThat(source.getLabel()).isEqualTo("국민연금공단 자격 시군구 신고 평균소득월액");
        assertThat(source.getUrl()).isEqualTo("https://www.data.go.kr/data/3046077/fileData.do");
    }

    @Test
    @DisplayName("값이 없을 때도 어느 원천을 찾았는지는 알려 준다")
    void everyScopeNamesTheSourceItLookedAt() {
        assertThat(IncomeScopeType.DISTRICT_PROXY.source()).isEqualTo(IncomeSourceDataset.NPS_DISTRICT_AVERAGE_INCOME);
        assertThat(IncomeScopeType.UNAVAILABLE.source()).isEqualTo(IncomeSourceDataset.NPS_DISTRICT_AVERAGE_INCOME);
    }

    @Test
    @DisplayName("대체 면책은 자치구 이름과 ISO 기준일을 박고, 제공 없음은 고정 문장이다")
    void disclaimerCarriesDistrictNameAndIsoReferenceDate() {
        // 화면과 리포트가 이 문장을 그대로 쓴다. 문구가 바뀌면 ai-service 프롬프트 골든도 함께 바뀌어야 한다.
        assertThat(IncomeScopeType.DISTRICT_PROXY.disclaimer("종로구", LocalDate.of(2024, 12, 31))).isEqualTo(
            "국민연금 지역가입자(사업장 가입자가 아닌 18~60세 국내 거주자)가 신고한 기준소득월액의 종로구 평균입니다(기준일 2024-12-31). "
                + "이 상권이나 주민 전체의 소득이 아니며, 같은 자치구 안의 상권은 모두 같은 값입니다.");
        assertThat(IncomeScopeType.UNAVAILABLE.disclaimer(null, null))
            .isEqualTo("이 분기에 쓸 수 있는 자치구 평균 소득 자료가 없어 소득 지표를 제공하지 않습니다.");
    }
}
