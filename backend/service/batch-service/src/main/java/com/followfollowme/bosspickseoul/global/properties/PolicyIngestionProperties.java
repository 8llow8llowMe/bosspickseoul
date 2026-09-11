package com.followfollowme.bosspickseoul.global.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "batch.policy")
public record PolicyIngestionProperties(
    boolean enabled,
    String collectCron,
    String purgeCron,
    double staleRatio,
    int purgeGraceDays,
    Bizinfo bizinfo,
    Datasource datasource
) {

    // 생성자가 둘이면 Spring 이 바인딩 대상을 고르지 못하고 JavaBean 바인딩으로 떨어진다.
    // record 에는 기본 생성자가 없어 그 순간 기동이 깨지므로 정규 생성자 하나만 둔다.
    public PolicyIngestionProperties {
        if (collectCron == null || collectCron.isBlank()) {
            collectCron = "0 0 6 * * ?";
        }
        if (purgeCron == null || purgeCron.isBlank()) {
            purgeCron = "0 30 6 * * ?";
        }
        if (staleRatio <= 0 || staleRatio > 1) {
            throw new IllegalArgumentException("batch.policy.stale-ratio must be in (0, 1]");
        }
        if (purgeGraceDays < 1) {
            throw new IllegalArgumentException("batch.policy.purge-grace-days must be >= 1");
        }
        if (bizinfo == null) {
            bizinfo = new Bizinfo(
                "https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do",
                "",
                "소상공인",
                100,
                20,
                30,
                3
            );
        }
        if (datasource == null) {
            datasource = Datasource.empty();
        }
        if (enabled && !datasource.hasUrl()) {
            throw new IllegalArgumentException("COMMERCIAL_DB_URL is required when batch.policy.enabled=true");
        }
    }

    public record Bizinfo(
        String baseUrl,
        String crtfcKey,
        String hashtags,
        int pageSize,
        int maxPages,
        int timeoutSeconds,
        int maxAttempts
    ) {
        public Bizinfo {
            if (baseUrl == null || baseUrl.isBlank()) {
                throw new IllegalArgumentException("batch.policy.bizinfo.base-url is required");
            }
            if (pageSize < 1 || pageSize > 1000) {
                throw new IllegalArgumentException("batch.policy.bizinfo.page-size must be 1..1000");
            }
            if (maxPages < 1 || maxPages > 100) {
                throw new IllegalArgumentException("batch.policy.bizinfo.max-pages must be 1..100");
            }
            if (timeoutSeconds < 1) {
                throw new IllegalArgumentException("batch.policy.bizinfo.timeout-seconds must be >= 1");
            }
            if (maxAttempts < 1 || maxAttempts > 5) {
                throw new IllegalArgumentException("batch.policy.bizinfo.max-attempts must be 1..5");
            }
            if (crtfcKey == null) {
                crtfcKey = "";
            }
            if (hashtags == null) {
                hashtags = "";
            }
        }
    }

    public record Datasource(
        String url,
        String username,
        String password,
        String driverClassName
    ) {
        private static final String DEFAULT_DRIVER = "com.mysql.cj.jdbc.Driver";

        public Datasource {
            if (url == null) {
                url = "";
            }
            if (username == null) {
                username = "";
            }
            if (password == null) {
                password = "";
            }
            if (driverClassName == null || driverClassName.isBlank()) {
                driverClassName = DEFAULT_DRIVER;
            }
        }

        static Datasource empty() {
            return new Datasource("", "", "", DEFAULT_DRIVER);
        }

        public boolean hasUrl() {
            return !url.isBlank();
        }
    }
}
