package com.followfollowme.bosspickseoul.domainlayer.policyingestion.application.service.processor;

import com.followfollowme.bosspickseoul.domainlayer.policyingestion.application.model.BizinfoNotice;
import com.followfollowme.bosspickseoul.domainlayer.policyingestion.application.model.PolicyCollectSnapshot;
import com.followfollowme.bosspickseoul.domainlayer.policyingestion.application.model.PolicyUpsert;
import com.followfollowme.bosspickseoul.domainlayer.policyingestion.application.port.out.PolicyCommandPort;
import com.followfollowme.bosspickseoul.domainlayer.policyingestion.application.port.out.PolicySourcePort;
import com.followfollowme.bosspickseoul.domainlayer.policyingestion.domain.enums.PolicySource;
import com.followfollowme.bosspickseoul.domainlayer.policyingestion.domain.enums.PolicySupportType;
import com.followfollowme.bosspickseoul.global.properties.PolicyIngestionProperties;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class PolicyCollectProcessor {

    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
    private static final DateTimeFormatter BASIC = DateTimeFormatter.BASIC_ISO_DATE;

    private final PolicySourcePort policySourcePort;
    private final PolicyCommandPort policyCommandPort;
    private final PolicyIngestionProperties properties;
    private final Clock clock;

    /**
     * 원천 HTTP. 호출 측 Facade 가 DB 트랜잭션 밖에 둔다.
     */
    public PolicyCollectSnapshot prepare() {
        List<BizinfoNotice> notices = policySourcePort.fetchAll();
        List<PolicyUpsert> rows = new ArrayList<>();
        int skipped = 0;
        for (BizinfoNotice notice : notices) {
            PolicyUpsert row = normalize(notice);
            if (row == null) {
                skipped++;
                continue;
            }
            rows.add(row);
        }
        LocalDateTime seenAt = LocalDateTime.ofInstant(clock.instant(), SEOUL);
        LocalDate hideEndAt = seenAt.toLocalDate().minusDays(1);
        log.info("기업마당 정책 정규화 완료 accepted={} skipped={} fetched={}", rows.size(), skipped, notices.size());
        return new PolicyCollectSnapshot(List.copyOf(rows), seenAt, hideEndAt);
    }

    /**
     * upsert 와 stale-mark 를 한 트랜잭션으로 묶는다. 원천 실패 시 여기까지 오지 않는다.
     */
    @Transactional
    public void commit(PolicyCollectSnapshot snapshot) {
        long previous = policyCommandPort.countBySource(PolicySource.BIZINFO);
        policyCommandPort.upsertAll(PolicySource.BIZINFO, snapshot.rows(), snapshot.seenAt());
        int accepted = snapshot.rows().size();
        boolean complete = previous == 0 || accepted >= previous * properties.staleRatio();
        int stale = 0;
        if (complete && previous > 0) {
            stale = policyCommandPort.staleMarkUnseen(PolicySource.BIZINFO, snapshot.seenAt(), snapshot.hideEndAt());
        } else if (!complete) {
            log.warn(
                "기업마당 수집 완전성 게이트 실패 previous={} accepted={} ratio={} — stale-mark 생략",
                previous, accepted, properties.staleRatio()
            );
        }
        log.info(
            "기업마당 정책 적재 완료 previous={} accepted={} staleMarked={} complete={}",
            previous, accepted, stale, complete
        );
    }

    PolicyUpsert normalize(BizinfoNotice notice) {
        if (notice == null) {
            return null;
        }
        String externalId = clip(notice.pblancId(), 64);
        String title = clip(notice.title(), 200);
        String organization = clip(notice.organization(), 100);
        String rawUrl = notice.detailUrl() == null ? "" : notice.detailUrl().strip();
        if (externalId.isEmpty() || title.isEmpty() || organization.isEmpty() || rawUrl.isEmpty() || rawUrl.length() > 500) {
            return null;
        }
        ApplyPeriod period = parsePeriod(notice.applyPeriod());
        String target = clip(firstNonBlank(notice.targetName(), "소상공인"), 300);
        String content = clip(firstNonBlank(notice.summary(), title), 500);
        return new PolicyUpsert(
            externalId,
            title,
            organization,
            mapSupportType(notice.category()).name(),
            target,
            content,
            null,
            null,
            period.start(),
            period.end(),
            rawUrl
        );
    }

    static PolicySupportType mapSupportType(String category) {
        if (category == null || category.isBlank()) {
            return PolicySupportType.SUBSIDY;
        }
        String token = category.strip().toLowerCase(Locale.ROOT);
        if (token.contains("금융") || token.contains("자금") || token.contains("보증")) {
            return PolicySupportType.FUNDING;
        }
        if (token.contains("기술") || token.contains("시설") || token.contains("설비")) {
            return PolicySupportType.FACILITY;
        }
        if (token.contains("인력") || token.contains("교육") || token.contains("창업") || token.contains("경영")) {
            return PolicySupportType.EDUCATION;
        }
        if (token.contains("수출") || token.contains("내수") || token.contains("판로") || token.contains("마케팅")) {
            return PolicySupportType.MARKETING;
        }
        return PolicySupportType.SUBSIDY;
    }

    static ApplyPeriod parsePeriod(String raw) {
        if (raw == null || raw.isBlank()) {
            return new ApplyPeriod(null, null);
        }
        String value = raw.strip();
        if (value.contains("상시") || value.equals("-")) {
            return new ApplyPeriod(null, null);
        }
        String[] parts = value.split("~", 2);
        LocalDate start = parseDate(parts[0]);
        LocalDate end = parts.length > 1 ? parseDate(parts[1]) : null;
        return new ApplyPeriod(start, end);
    }

    private static LocalDate parseDate(String token) {
        if (token == null) {
            return null;
        }
        String value = token.strip().replace(".", "-").replace("/", "-");
        if (value.isEmpty()) {
            return null;
        }
        try {
            if (value.length() == 8 && value.chars().allMatch(Character::isDigit)) {
                return LocalDate.parse(value, BASIC);
            }
            if (value.length() >= 10) {
                return LocalDate.parse(value.substring(0, 10));
            }
        } catch (DateTimeParseException ignored) {
            return null;
        }
        return null;
    }

    private static String firstNonBlank(String primary, String fallback) {
        if (primary != null && !primary.isBlank()) {
            return primary;
        }
        return fallback;
    }

    static String clip(String value, int max) {
        if (value == null) {
            return "";
        }
        String text = value.replaceAll("<[^>]+>", " ").replaceAll("\\s+", " ").strip();
        if (text.length() <= max) {
            return text;
        }
        return text.substring(0, max);
    }

    record ApplyPeriod(LocalDate start, LocalDate end) {
    }
}
