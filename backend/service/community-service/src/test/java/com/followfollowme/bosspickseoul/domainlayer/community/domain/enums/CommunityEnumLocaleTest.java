package com.followfollowme.bosspickseoul.domainlayer.community.domain.enums;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Locale;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * 요청 문자열을 enum 으로 파싱할 때 기본 로케일에 흔들리지 않는지 확인한다.
 *
 * <p>터키어 로케일에서 {@code "i".toUpperCase()} 는 ASCII 'I' 가 아니라 'İ' 가 된다.
 * 그래서 로케일을 지정하지 않으면 서버가 뜬 지역에 따라 같은 요청이 어디선 통과하고
 * 어디선 400 이 된다.
 *
 * <p>지금 실제로 깨지는 건 'i' 가 들어간 COMMERCIAL 하나뿐이다. 나머지 두 enum 은 오늘 기준
 * 상수에 'i' 가 없어 이 테스트만으로는 회귀를 잡지 못하지만, 같은 규칙을 쓰는지 함께 못 박아
 * 'i' 가 들어간 상수가 추가될 때 조용히 깨지지 않게 한다.
 */
class CommunityEnumLocaleTest {

    private Locale originalLocale;

    @BeforeEach
    void setUp() {
        originalLocale = Locale.getDefault();
        Locale.setDefault(Locale.forLanguageTag("tr-TR"));
    }

    @AfterEach
    void tearDown() {
        Locale.setDefault(originalLocale);
    }

    @Test
    @DisplayName("터키어 로케일에서도 정렬 타입을 파싱한다")
    void parsesSortTypeUnderTurkishLocale() {
        assertThat(CommunitySortType.from("latest")).isEqualTo(CommunitySortType.LATEST);
    }

    @Test
    @DisplayName("터키어 로케일에서도 대상 타입을 파싱한다")
    void parsesTargetTypeUnderTurkishLocale() {
        assertThat(CommunityTargetType.from("commercial")).isEqualTo(CommunityTargetType.COMMERCIAL);
    }

    @Test
    @DisplayName("터키어 로케일에서도 신고 대상 종류를 파싱한다")
    void parsesReportTargetKindUnderTurkishLocale() {
        assertThat(CommunityReportTargetKind.from("post")).isEqualTo(CommunityReportTargetKind.POST);
    }
}
