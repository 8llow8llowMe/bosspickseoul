package com.followfollowme.bosspickseoul.global.properties;

import com.followfollowme.bosspickseoul.domainlayer.member.domain.model.MemberConsent;
import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.util.StringUtils;

/**
 * 가입 동의 이력에 남길 법적 문서 판과, 탈퇴 회원 정보의 보관 기간.
 *
 * <p><b>문서 판의 정본은 프론트다.</b> 약관·처리방침 본문과 판은 {@code frontend/src/lib/legal/terms-of-service.ts}
 * · {@code privacy-policy.ts} 의 {@code version} 에 있고, 이 설정은 그 값을 따라 적는 사본이다. 백엔드는 본문을
 * 갖고 있지 않으므로 값이 어긋나면 "회원이 무엇에 동의했는가"가 틀어진다 — 화면에는 1.1 을 보여주고 이력에는
 * 1.0 이 남는 식이다. 문서를 개정할 때는 프론트 상수와 이 설정을 같은 배포에 함께 올린다.
 *
 * <p>문서 판에는 기본값을 두지 않고 비어 있거나 너무 길면 기동을 막는다. 기본값으로 메우면 개정 뒤 설정이 빠졌을 때
 * 옛 판이 조용히 이력에 남고, 그 이력은 나중에 고칠 수 없다. 판이 {@code member_consent.document_version} 컬럼
 * 길이({@link MemberConsent#DOCUMENT_VERSION_MAX_LENGTH})보다 길면 기동은 되고 그 뒤 모든 가입이 INSERT 에서 실패한다
 * — 일반 가입은 그 과정에서 이메일 인증까지 다시 받아야 한다. 기동 실패는 배포 단계에서 바로 보인다.
 *
 * <p>{@code withdrawnRetention} 은 탈퇴 회원의 이메일·동의 이력을 보관하는 기간이다(탈퇴 시점부터). 이 값을 읽어
 * 실제로 파기(이메일 익명화·이력 삭제)하는 작업은 <b>후속 이슈</b>다 — 지금은 기간을 한곳에 고정해 두는 데까지만 한다.
 */
@ConfigurationProperties(prefix = "legal")
public record LegalProperties(String termsVersion, String privacyVersion, Duration withdrawnRetention) {

    private static final Duration DEFAULT_WITHDRAWN_RETENTION = Duration.ofDays(365);

    public LegalProperties {
        requireDocumentVersion("legal.terms-version", "이용약관", termsVersion);
        requireDocumentVersion("legal.privacy-version", "개인정보 처리방침", privacyVersion);
        if (withdrawnRetention == null || withdrawnRetention.isZero() || withdrawnRetention.isNegative()) {
            withdrawnRetention = DEFAULT_WITHDRAWN_RETENTION;
        }
    }

    private static void requireDocumentVersion(String key, String documentName, String version) {
        if (!StringUtils.hasText(version)) {
            throw new IllegalArgumentException(key + " 이 비어 있습니다. 프론트 " + documentName + " version 과 같은 값을 설정하세요.");
        }
        if (version.length() > MemberConsent.DOCUMENT_VERSION_MAX_LENGTH) {
            throw new IllegalArgumentException(key + " 은 " + MemberConsent.DOCUMENT_VERSION_MAX_LENGTH
                + "자 이하여야 합니다(member_consent.document_version 컬럼 길이). 현재 " + version.length() + "자입니다.");
        }
    }
}
