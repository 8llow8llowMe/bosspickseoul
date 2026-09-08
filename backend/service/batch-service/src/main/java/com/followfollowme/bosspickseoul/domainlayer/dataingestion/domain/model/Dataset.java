package com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model;

import java.util.List;
import java.util.Locale;

/**
 * One Seoul commercial-analysis dataset. Each constant maps to exactly one legacy fact table
 * so a quarter can be backfilled for every table the services already read.
 *
 * <p>Every service name was confirmed by a live call on 2026-09-08 (sample key). Two facts about the
 * live API shape the pipeline: only some services honour the quarter path argument (the rest return the
 * full 2021+ timeline and are filtered while streaming), and numeric fields arrive as JSON numbers.
 * The consumption dataset for commercial areas was re-published as "소비-상권배후지"
 * ({@code VwsmTrdhlNcmCnsmpQq}); it no longer carries the income columns the legacy table has.
 *
 * <p>A blank service would mean no Open API contract is registered, so the dataset is CSV/ZIP only;
 * {@code ImportRequest} rejects an API run for it instead of guessing an endpoint.
 */
public enum Dataset {
    SALES_COMMERCIAL("VwsmTrdarSelngQq", AreaScope.COMMERCIAL, true, List.of("THSMON_SELNG_AMT")),
    STORE_COMMERCIAL("VwsmTrdarStorQq", AreaScope.COMMERCIAL, true, List.of("STOR_CO")),
    FOOT_TRAFFIC_COMMERCIAL("VwsmTrdarFlpopQq", AreaScope.COMMERCIAL, false, List.of("TOT_FLPOP_CO")),
    CHANGE_COMMERCIAL("VwsmTrdarIxQq", AreaScope.COMMERCIAL, false, List.of("TRDAR_CHNGE_IX")),
    POPULATION_COMMERCIAL("VwsmTrdarRepopQq", AreaScope.COMMERCIAL, false, List.of("TOT_REPOP_CO")),
    FACILITY_COMMERCIAL("VwsmTrdarFcltyQq", AreaScope.COMMERCIAL, false, List.of("VIATR_FCLTY_CO")),
    CONSUMPTION_COMMERCIAL("VwsmTrdhlNcmCnsmpQq", AreaScope.COMMERCIAL, false, List.of("EXPNDTR_TOTAMT")),
    SALES_ADMINISTRATION("VwsmAdstrdSelngW", AreaScope.ADMINISTRATION, true, List.of("THSMON_SELNG_AMT")),
    STORE_ADMINISTRATION("VwsmAdstrdStorW", AreaScope.ADMINISTRATION, true, List.of("STOR_CO")),
    CONSUMPTION_ADMINISTRATION("VwsmAdstrdNcmCnsmpW", AreaScope.ADMINISTRATION, false, List.of("EXPNDTR_TOTAMT")),
    SALES_DISTRICT("VwsmSignguSelngW", AreaScope.DISTRICT, true, List.of("THSMON_SELNG_AMT")),
    STORE_DISTRICT("VwsmSignguStorW", AreaScope.DISTRICT, true, List.of("STOR_CO")),
    FOOT_TRAFFIC_DISTRICT("VwsmSignguFlpopW", AreaScope.DISTRICT, false, List.of("TOT_FLPOP_CO")),
    CONSUMPTION_DISTRICT("VwsmSignguNcmCnsmpW", AreaScope.DISTRICT, false, List.of("EXPNDTR_TOTAMT")),
    CHANGE_DISTRICT("VwsmSignguIxQq", AreaScope.DISTRICT, false, List.of("TRDAR_CHNGE_IX"));

    /** Categorical change indicator; validated against its code set instead of as a number. */
    public static final String CHANGE_INDICATOR_FIELD = "TRDAR_CHNGE_IX";

    private final String service;
    private final AreaScope scope;
    private final boolean industry;
    private final List<String> requiredMetrics;

    Dataset(String service, AreaScope scope, boolean industry, List<String> requiredMetrics) {
        this.service = service;
        this.scope = scope;
        this.industry = industry;
        this.requiredMetrics = requiredMetrics;
    }

    public String service() { return service; }
    public AreaScope scope() { return scope; }
    public String areaType() { return scope.name(); }
    public String areaField() { return scope.areaField(); }
    public boolean industry() { return industry; }
    public List<String> requiredMetrics() { return requiredMetrics; }

    public boolean changeIndicator() { return requiredMetrics.contains(CHANGE_INDICATOR_FIELD); }

    public static Dataset parse(String value) {
        return valueOf(value.toUpperCase(Locale.ROOT));
    }
}
