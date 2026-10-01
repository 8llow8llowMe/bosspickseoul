package com.followfollowme.bosspickseoul.domainlayer.commercial.application.service.processor;

import com.followfollowme.bosspickseoul.domainlayer.commercial.application.common.QuarterEndDateCalculator;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.income.CommercialDistrictAverageIncomeInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.query.CommercialAdministrationQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.DistrictPensionIncomeRepositoryPort;
import java.time.LocalDate;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * 자치구 평균 소득(대체) 판정 정본. (이슈 #415)
 *
 * <pre>
 * periodCode + 상권의 소속 자치구
 *   (1) 요청 분기 말일 이하에서 가장 최근 기준일 행이 있다     -> DISTRICT_PROXY, 그 행의 평균소득월액
 *   (2) 분기 형식 오류 / 상권 매핑 없음(404) / 그 이전 자료 없음 -> UNAVAILABLE, 값 null
 * </pre>
 *
 * <p>원천은 국민연금 지역가입자의 신고 기준소득월액을 시군구별로 평균한 <b>연 1회(12월 기준) 스냅샷</b>이라 분기와 1:1 로
 * 맞지 않는다. 그래서 요청 분기 말일 이하 가장 최근 기준일을 쓴다 — {@code 20211} 은 {@code 2020-12-31}, {@code 20244} 는
 * {@code 2024-12-31}, 다음 파일이 아직 없으면 {@code 20261} 도 {@code 2024-12-31}. 요청 시점 뒤에 나온 자료는 끌어오지 않는다.
 *
 * <p><b>비교·히트맵·후보 추천·벤치마크·점수 경로에 이 값을 넣지 않는다.</b> 첫째, 같은 자치구에 속한 상권은 전부 같은 값을
 * 받아 상권 간 변별력이 0 이다 — 점수나 승패에 넣으면 자치구 단위로 뭉친 가짜 차이가 상권 차이처럼 보인다. 둘째, 연 스냅샷이라
 * 분기 비교 축과 맞지 않는다 — 같은 해 네 분기가 같은 값이고, 분기 사이 변화처럼 보이는 차이는 기준일이 넘어간 것뿐이다.
 * 그래서 이 판정은 {@code /income} 한 경로({@link CommercialIncomeQueryProcessor})만 쓴다.
 *
 * <p>트랜잭션을 걸지 않는다. 리포지터리 호출 한 번이라 Spring Data 가 여는 읽기 트랜잭션과 같고, 호출부가 지역 서비스 Feign 을
 * 섞는다. 사유는 {@code CommercialWebFacade} javadoc.
 */
@Service
@RequiredArgsConstructor
public class CommercialDistrictIncomeProcessor {

    private final DistrictPensionIncomeRepositoryPort districtPensionIncomeRepositoryPort;

    /**
     * 분기 형식부터 본다. 형식이 틀린 분기는 어느 기준일로 물을지 정할 수 없으니 지역 서비스도 부르지 않는다.
     *
     * @param regionLookup 같은 요청의 소비 판정과 나눠 쓰는 상권 -> 지역 해석. 404 는 「제공 없음」, 503·400 은 전파된다
     */
    public CommercialDistrictAverageIncomeInfo resolve(String periodCode, CommercialRegionLookup regionLookup) {
        Optional<LocalDate> quarterEndDate = QuarterEndDateCalculator.quarterEndDate(periodCode);
        if (quarterEndDate.isEmpty()) {
            return CommercialDistrictAverageIncomeInfo.unavailable();
        }

        CommercialAdministrationQueryResult region = regionLookup.administration();
        if (region == null || region.districtCode() == null) {
            return CommercialDistrictAverageIncomeInfo.unavailable();
        }

        return districtPensionIncomeRepositoryPort
            .findLatestByDistrictCodeOnOrBefore(region.districtCode(), quarterEndDate.get())
            .map(CommercialDistrictAverageIncomeInfo::from)
            .orElseGet(CommercialDistrictAverageIncomeInfo::unavailable);
    }
}
