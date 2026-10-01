package com.followfollowme.bosspickseoul.domainlayer.commercial.domain.enums;

import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescribable;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 소득 지표를 어느 영역 단위에서 가져왔는지. (이슈 #415)
 *
 * <pre>
 * (1) 소속 자치구에 요청 분기 말일 이하 기준일 자료가 있다 -> DISTRICT_PROXY
 * (2) 없다(분기 형식 오류·상권 매핑 없음 포함)             -> UNAVAILABLE (값은 null, 사유만 전한다)
 * </pre>
 *
 * <p>상권 단위 값({@code COMMERCIAL})은 없다. 상권 소득 원천은 2024년 이후 끊겼고 응답 계약에서도 빠졌다(이슈 #413).
 *
 * <p>면책 문장을 여기 두는 이유는 {@link ExpenseScopeType} 과 같다 — 화면과 LLM 프롬프트가 <b>같은 문장을 그대로</b> 써야
 * 하기 때문이다.
 */
@Getter
@RequiredArgsConstructor
public enum IncomeScopeType implements CodeNameDescribable {

    DISTRICT_PROXY("자치구 대체", "상권 단위 소득 원천이 없어 소속 자치구의 국민연금 지역가입자 신고 평균소득월액으로 대체한 참고값입니다."),
    UNAVAILABLE("제공 없음", "이 분기에 쓸 수 있는 자치구 평균 소득 자료가 없어 소득 지표를 제공하지 않습니다.");

    private static final String PROXY_DISCLAIMER_FORMAT =
        "국민연금 지역가입자(사업장 가입자가 아닌 18~60세 국내 거주자)가 신고한 기준소득월액의 %s 평균입니다(기준일 %s). "
            + "이 상권이나 주민 전체의 소득이 아니며, 같은 자치구 안의 상권은 모두 같은 값입니다.";

    private static final String UNAVAILABLE_DISCLAIMER = "이 분기에 쓸 수 있는 자치구 평균 소득 자료가 없어 소득 지표를 제공하지 않습니다.";

    private final String displayName;
    private final String description;

    /**
     * 화면과 프롬프트가 그대로 쓰는 면책 문장. 대체값은 「누구의 무슨 소득인지」가 오해되기 쉬워 두 스코프 모두 채운다.
     *
     * @param scopeName     값을 실제로 가져온 자치구 이름. {@link #DISTRICT_PROXY} 에서만 문장에 박힌다
     * @param referenceDate 값의 기준일. {@link #DISTRICT_PROXY} 에서만 ISO 날짜({@code 2024-12-31})로 박힌다
     */
    public String disclaimer(String scopeName, LocalDate referenceDate) {
        return switch (this) {
            case DISTRICT_PROXY -> PROXY_DISCLAIMER_FORMAT.formatted(scopeName, DateTimeFormatter.ISO_LOCAL_DATE.format(referenceDate));
            case UNAVAILABLE -> UNAVAILABLE_DISCLAIMER;
        };
    }

    /** 값을 담아 온(또는 찾았지만 없던) 원천 데이터셋. 지금은 국민연금 하나다. */
    public IncomeSourceDataset source() {
        return IncomeSourceDataset.NPS_DISTRICT_AVERAGE_INCOME;
    }
}
