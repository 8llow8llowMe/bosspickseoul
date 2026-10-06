package com.followfollowme.bosspickseoul.global.properties;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.followfollowme.bosspickseoul.domainlayer.member.domain.model.MemberConsent;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.yaml.snakeyaml.Yaml;

class LegalPropertiesTest {

    private static final Path RESOURCES = Path.of("src", "main", "resources");

    @Test
    @DisplayName("문서 판이 비어 있으면 기동 단계에서 막는다 — 옛 판이 조용히 이력에 남지 않게 한다")
    void blankVersion_failsFast() {
        assertThatThrownBy(() -> new LegalProperties(" ", "1.1", null))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("legal.terms-version");
        assertThatThrownBy(() -> new LegalProperties("1.0", null, null))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("legal.privacy-version");
    }

    @Test
    @DisplayName("문서 판이 document_version 컬럼(20자)보다 길면 기동 단계에서 막는다 — 기동 뒤 모든 가입이 INSERT 에서 실패하지 않게 한다")
    void tooLongVersion_failsFast() {
        String twentyChars = "2026.10.06-revision1";
        assertThat(twentyChars).hasSize(MemberConsent.DOCUMENT_VERSION_MAX_LENGTH);

        assertThat(new LegalProperties(twentyChars, twentyChars, null).termsVersion()).isEqualTo(twentyChars);
        assertThatThrownBy(() -> new LegalProperties(twentyChars + "X", "1.1", null))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("legal.terms-version")
            .hasMessageContaining("20자 이하");
        assertThatThrownBy(() -> new LegalProperties("1.0", twentyChars + "X", null))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("legal.privacy-version");
    }

    @Test
    @DisplayName("탈퇴 회원 보관 기간이 없거나 0 이하이면 1년(365일)으로 둔다")
    void withdrawnRetention_defaultsToOneYear() {
        assertThat(new LegalProperties("1.0", "1.1", null).withdrawnRetention()).isEqualTo(Duration.ofDays(365));
        assertThat(new LegalProperties("1.0", "1.1", Duration.ZERO).withdrawnRetention()).isEqualTo(Duration.ofDays(365));
        assertThat(new LegalProperties("1.0", "1.1", Duration.parse("P30D")).withdrawnRetention()).isEqualTo(Duration.ofDays(30));
    }

    @Test
    @DisplayName("local·dev·prod 의 legal 설정이 같고, 판은 숫자가 아니라 문자열로 읽힌다")
    void profilesShareTheSameLegalValues() throws IOException {
        Map<String, Object> local = legalOf("application-local.yml");

        // 판이 따옴표 없이 적히면 YAML 이 1.10 을 숫자 1.1 로 읽는다. 문자열로 읽히는지까지 본다.
        assertThat(local.get("terms-version")).isInstanceOf(String.class);
        assertThat(local.get("privacy-version")).isInstanceOf(String.class);
        assertThat(Duration.parse((String) local.get("withdrawn-retention"))).isEqualTo(Duration.ofDays(365));
        // 개정 때 한 파일만 고치면 환경마다 다른 판이 이력에 남는다.
        assertThat(legalOf("application-dev.yml")).isEqualTo(local);
        assertThat(legalOf("application-prod.yml")).isEqualTo(local);
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> legalOf(String fileName) throws IOException {
        try (InputStream in = Files.newInputStream(RESOURCES.resolve(fileName))) {
            Map<String, Object> root = new Yaml().load(in);
            assertThat(root).as("%s has legal block", fileName).containsKey("legal");
            return (Map<String, Object>) root.get("legal");
        }
    }
}
