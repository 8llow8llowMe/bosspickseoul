package com.followfollowme.bosspickseoul.domainlayer.commercial.domain.enums;

import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescribable;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 소비 지표를 어느 영역 단위에서 가져왔는지. 해상도 사다리의 결과값이다. (이슈 #415)
 *
 * <pre>
 * (1) income_commercial 에 지출이 있다        -> COMMERCIAL
 * (2) 소속 행정동에 세부 항목이 있다           -> ADMINISTRATION_PROXY
 * (3) 둘 다 없다                              -> UNAVAILABLE (값은 null, 중단 사실만 전한다)
 * </pre>
 *
 * <p>면책 문장을 여기 두는 이유는 화면과 LLM 프롬프트가 <b>같은 문장을 그대로</b> 써야 하기 때문이다.
 * 두 곳이 각자 문구를 만들면 사용자가 보는 설명과 리포트가 갈린다.
 */
@Getter
@RequiredArgsConstructor
public enum ExpenseScopeType implements CodeNameDescribable {

    COMMERCIAL("상권", "상권 단위 원천에서 직접 집계한 값입니다."),
    ADMINISTRATION_PROXY("행정동 대체", "상권 단위 원천이 중단돼 소속 행정동 값으로 대체한 추정치입니다."),
    UNAVAILABLE("제공 없음", "원천이 중단돼 이 분기에는 소비 지표를 제공하지 않습니다.");

    private static final String PROXY_DISCLAIMER_FORMAT =
        "2024년 1분기부터 서울 열린데이터광장이 상권 단위 소비 제공을 중단해, 소속 행정동(%s)의 추정 소비로 대체 표시합니다. "
            + "같은 행정동 안의 상권은 같은 값입니다.";

    private static final String DISCONTINUED_DISCLAIMER =
        "2024년 1분기부터 서울 열린데이터광장이 상권 단위 소비 제공을 중단했습니다. "
            + "이 분기는 대체할 행정동 소비도 없어 소비 지표를 제공하지 않습니다.";

    private final String displayName;
    private final String description;

    /**
     * 화면과 프롬프트가 그대로 쓰는 면책 문장. 네이티브({@link #COMMERCIAL})는 대체가 아니므로 비운다.
     *
     * @param scopeName 값을 실제로 가져온 영역 이름. {@link #ADMINISTRATION_PROXY} 에서만 문장에 박힌다
     */
    public String disclaimer(String scopeName) {
        return switch (this) {
            case COMMERCIAL -> null;
            case ADMINISTRATION_PROXY -> PROXY_DISCLAIMER_FORMAT.formatted(scopeName);
            case UNAVAILABLE -> DISCONTINUED_DISCLAIMER;
        };
    }

    /** 값을 담아 온(또는 중단된) 원천 데이터셋. 값이 없을 때도 어느 원천이 끊겼는지는 알려 준다. */
    public ExpenseSourceDataset source() {
        return this == ADMINISTRATION_PROXY
            ? ExpenseSourceDataset.ADMINISTRATION_CONSUMPTION
            : ExpenseSourceDataset.COMMERCIAL_CONSUMPTION;
    }
}
