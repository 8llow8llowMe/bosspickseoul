package com.followfollowme.bosspickseoul.domainlayer.policyingestion.adapter.out.source;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.bosspickseoul.domainlayer.policyingestion.application.exception.PolicyIngestionException;
import com.followfollowme.bosspickseoul.domainlayer.policyingestion.application.model.BizinfoNotice;
import com.followfollowme.bosspickseoul.global.properties.PolicyIngestionProperties;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

class BizinfoPolicySourceAdapterTest {

    @Test
    void fetchesPagesUntilTotCntAndAcceptsSingleItemObject() throws Exception {
        byte[] page1 = new ClassPathResource("policyingestion/bizinfo-page1.json").getInputStream().readAllBytes();
        byte[] page2 = new ClassPathResource("policyingestion/bizinfo-page2.json").getInputStream().readAllBytes();
        BizinfoPolicySourceAdapter adapter = new BizinfoPolicySourceAdapter(
            properties("key", 2, 5),
            uri -> {
                String query = uri.toString();
                if (query.contains("pageIndex=1")) {
                    return new BizinfoPolicySourceAdapter.ApiResponse(200, page1);
                }
                if (query.contains("pageIndex=2")) {
                    return new BizinfoPolicySourceAdapter.ApiResponse(200, page2);
                }
                return new BizinfoPolicySourceAdapter.ApiResponse(200, "{\"jsonArray\":{\"item\":[]}}".getBytes(StandardCharsets.UTF_8));
            },
            new ObjectMapper()
        );

        List<BizinfoNotice> notices = adapter.fetchAll();

        assertThat(notices).extracting(BizinfoNotice::pblancId)
            .containsExactly("PBLN_000000000080236", "PBLN_000000000124551", "PBLN_000000000120010");
        assertThat(notices.get(2).title()).isEqualTo("식품안심업소 기술지원");
        assertThat(notices.get(2).applyPeriod()).isEqualTo("상시");
    }

    @Test
    void failsWhenHttpStatusIsNotSuccessful() {
        BizinfoPolicySourceAdapter adapter = new BizinfoPolicySourceAdapter(
            properties("key", 100, 1),
            uri -> new BizinfoPolicySourceAdapter.ApiResponse(500, "{}".getBytes(StandardCharsets.UTF_8)),
            new ObjectMapper()
        );

        assertThatThrownBy(adapter::fetchAll).isInstanceOf(PolicyIngestionException.class);
    }

    @Test
    void failsWhenApiKeyIsMissing() {
        BizinfoPolicySourceAdapter adapter = new BizinfoPolicySourceAdapter(
            properties("", 100, 1),
            uri -> new BizinfoPolicySourceAdapter.ApiResponse(200, "{}".getBytes(StandardCharsets.UTF_8)),
            new ObjectMapper()
        );

        assertThatThrownBy(adapter::fetchAll).isInstanceOf(PolicyIngestionException.class);
    }

    private static PolicyIngestionProperties properties(String key, int pageSize, int maxPages) {
        return new PolicyIngestionProperties(
            false, "0 0 6 * * ?", "0 30 6 * * ?", 0.5, 30,
            new PolicyIngestionProperties.Bizinfo(
                "https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do",
                key,
                "소상공인",
                pageSize,
                maxPages,
                5,
                1
            )
        );
    }
}
