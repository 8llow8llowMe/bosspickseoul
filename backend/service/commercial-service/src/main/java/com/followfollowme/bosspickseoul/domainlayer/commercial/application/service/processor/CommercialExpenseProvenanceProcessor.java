package com.followfollowme.bosspickseoul.domainlayer.commercial.application.service.processor;

import com.followfollowme.bosspickseoul.domainlayer.administration.application.port.out.AdministrationIncomeRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.administration.domain.model.IncomeAdministration;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.income.CommercialIncomeAndExpenseInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.CommercialRegionQueryPort;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.IncomeCommercialRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.query.CommercialAdministrationQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.IncomeCommercial;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * 소비 지표의 <b>해상도 사다리</b> 정본. (이슈 #415)
 *
 * <pre>
 * periodCode + commercialCode
 *   (1) income_commercial 에 지출이 있다              -> COMMERCIAL, 상권 네이티브 9항목
 *   (2) 소속 행정동의 income_administration 에 세부 항목이 있다 -> ADMINISTRATION_PROXY, 행정동 10항목
 *   (3) 둘 다 없다                                    -> 값 null + 중단 사실만
 * </pre>
 *
 * <p><b>대체값은 점수 계산에 넣지 않는다.</b> 같은 행정동에 속한 상권이 전부 같은 값을 받으므로 상권 간
 * 변별력이 없고, 점수에 넣으면 행정동 단위로 뭉친 가짜 차이가 만들어진다. 히트맵·비교·후보 추천이 쓰는
 * {@link CommercialQueryProcessor#getIncomeByPeriodCodeAndCommercialCode} 와
 * {@link CommercialQueryProcessor#getIncomeByPeriodCodeAndCommercialCodes} 는 그래서 이 사다리를 타지 않고
 * 네이티브만 본다.
 */
@Service
@RequiredArgsConstructor
public class CommercialExpenseProvenanceProcessor {

    private final IncomeCommercialRepositoryPort incomeCommercialRepositoryPort;
    private final AdministrationIncomeRepositoryPort administrationIncomeRepositoryPort;
    private final CommercialRegionQueryPort commercialRegionQueryPort;

    /**
     * {@code GET /commercials/{code}/income} 이 쓰는 경로. 행이 없어도 404 를 던지지 않고 중단 사실을 담은
     * 출처 메타를 돌려준다 — 화면이 「데이터 없음」 줄을 지우지 않고 사유를 보여 줘야 하기 때문이다.
     *
     * <p>행정동 조회는 <b>네이티브가 없을 때만</b> 한다. 네이티브가 살아 있는 {@code 20233} 이하 분기에서
     * 지역 서비스 왕복을 매번 붙이지 않으려는 것이다.
     */
    public CommercialIncomeAndExpenseInfo getExpenseByPeriodCodeAndCommercialCode(String periodCode, String commercialCode) {
        IncomeCommercial commercialRow = incomeCommercialRepositoryPort
            .findByPeriodCodeAndCommercialCode(periodCode, commercialCode)
            .orElse(null);

        if (commercialRow != null && !commercialRow.expenseUnavailable()) {
            return CommercialIncomeAndExpenseInfo.from(commercialRow);
        }

        return resolve(periodCode, findAdministrationIncome(periodCode, commercialCode), commercialRow);
    }

    /**
     * 사다리 판정만 한다. 두 원천 행을 이미 손에 쥔 호출부(요약 조회)가 재조회 없이 같은 판정을 쓰게 하려고
     * 조회와 분리했다. 판정이 갈리면 같은 상권·분기가 {@code /income} 과 요약에서 다른 값으로 보인다.
     *
     * @param administrationRow 소속 행정동의 소비 행. 없으면 {@code null}
     * @param commercialRow     상권 네이티브 소비 행. 없으면 {@code null}
     */
    public CommercialIncomeAndExpenseInfo resolve(
        String periodCode, IncomeAdministration administrationRow, IncomeCommercial commercialRow
    ) {
        if (commercialRow != null && !commercialRow.expenseUnavailable()) {
            return CommercialIncomeAndExpenseInfo.from(commercialRow);
        }
        if (administrationRow != null && !administrationRow.expenseDetailUnavailable()) {
            return CommercialIncomeAndExpenseInfo.ofAdministrationProxy(administrationRow);
        }
        return CommercialIncomeAndExpenseInfo.unavailable();
    }

    /**
     * 상권 -> 행정동 해석은 이미 있는 경로({@link CommercialRegionQueryPort})를 그대로 쓴다. 상권 코드만으로
     * 자치구·행정동을 돌려주는 지역 서비스 계약이 프로필 조회에 이미 있어 새 포트를 만들지 않는다.
     *
     * <p>매핑이 없는 상권(404)은 「대체 불가」로 흡수해 사다리 3단계로 보낸다. 503·400 은 그대로 전파한다 —
     * 지역 서비스 장애를 「소비 데이터 없음」으로 뭉개면 장애가 정상 응답으로 보인다. (이슈 #413 판정 재사용)
     */
    private IncomeAdministration findAdministrationIncome(String periodCode, String commercialCode) {
        CommercialAdministrationQueryResult administration = CommercialQueryProcessor.fetchOrNullWhenNotFound(
            () -> commercialRegionQueryPort.getCommercialAdministration(commercialCode));

        if (administration == null || administration.administrationCode() == null) {
            return null;
        }

        return administrationIncomeRepositoryPort
            .findIncomeByAdministrationCode(administration.administrationCode(), periodCode)
            .orElse(null);
    }
}
