package com.followfollowme.bosspickseoul.domainlayer.aireport.application.service.prompt;

import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialExpenseCategoryQueryResult;
import java.text.NumberFormat;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

public final class PromptFormatterSupport {

    /** 원천이 값을 주지 않는 지표의 표기. 0 으로 채우면 LLM 이 실측치로 읽는다. */
    public static final String NOT_AVAILABLE = "N/A";

    private static final NumberFormat NUMBER_FORMAT = NumberFormat.getNumberInstance(Locale.KOREA);

    private PromptFormatterSupport() {
    }

    public static String formatNumber(long value) {
        return NUMBER_FORMAT.format(value);
    }

    /** 결측을 표현해야 하는 금액용. null 은 0 이 아니라 "값 없음" 이다. (이슈 #413) */
    public static String formatNumber(Long value) {
        return value == null ? NOT_AVAILABLE : formatNumber(value.longValue());
    }

    /** 원천이 값을 주지 않는 문자열 지표용. 빈 문자열도 결측으로 본다. (이슈 #415) */
    public static String orNotAvailable(String value) {
        return value == null || value.isBlank() ? NOT_AVAILABLE : value;
    }

    public static String formatPercent(double value) {
        return "%.1f%%".formatted(value);
    }

    /**
     * 지출 항목 중 금액이 가장 큰 것을 {@code "라벨 (금액)"} 으로 적는다. (이슈 #415)
     *
     * <p><b>항목의 동일성은 {@code key} 로 본다.</b> 라벨을 Map 키로 삼으면 원천이 문구가 같은 항목을 둘
     * 내려보내거나 라벨이 비어 올 때 뒤의 항목이 앞의 것을 덮어써 최댓값 후보에서 조용히 사라진다.
     * 라벨은 프롬프트에 적을 표시용으로만 쓴다.
     *
     * <p>항목 키를 여기서 나열하지 않는 이유는 구성이 스코프마다 다르기 때문이다(상권 9개 / 행정동 대체 10개).
     * 고정 목록으로 집계하면 대체 스코프에만 있는 기타·음식이 후보에서 빠진다.
     */
    public static String formatTopExpenseCategory(List<CommercialExpenseCategoryQueryResult> categories) {
        if (categories == null || categories.isEmpty()) {
            return NOT_AVAILABLE;
        }
        Map<String, CommercialExpenseCategoryQueryResult> categoryByKey = new LinkedHashMap<>();
        categories.forEach(category -> categoryByKey.put(category.key(), category));
        return categoryByKey.values().stream()
            .max(Comparator.comparingLong(CommercialExpenseCategoryQueryResult::amount))
            .map(top -> "%s (%s)".formatted(orNotAvailable(top.label()), formatNumber(top.amount())))
            .orElse(NOT_AVAILABLE);
    }

    public static String formatTopEntry(Map<String, Long> valueByLabel) {
        return valueByLabel.entrySet().stream()
            .max(Map.Entry.comparingByValue())
            .map(entry -> "%s (%s)".formatted(entry.getKey(), formatNumber(entry.getValue())))
            .orElse(NOT_AVAILABLE);
    }

    public static String formatTopPercentEntry(Map<String, Double> valueByLabel) {
        return valueByLabel.entrySet().stream()
            .max(Map.Entry.comparingByValue())
            .map(entry -> "%s (%s)".formatted(entry.getKey(), formatPercent(entry.getValue())))
            .orElse(NOT_AVAILABLE);
    }

    public static <T> String formatTopList(List<T> items, int size, Function<T, String> mapper) {
        if (items == null || items.isEmpty()) {
            return NOT_AVAILABLE;
        }
        return items.stream().limit(size).map(mapper).collect(Collectors.joining(", "));
    }

    public static Map<String, Long> orderedMap(Object... pairs) {
        Map<String, Long> map = new LinkedHashMap<>();
        for (int index = 0; index < pairs.length; index += 2) {
            map.put((String) pairs[index], (Long) pairs[index + 1]);
        }
        return map;
    }

    public static Map<String, Double> orderedPercentMap(Object... pairs) {
        Map<String, Double> map = new LinkedHashMap<>();
        for (int index = 0; index < pairs.length; index += 2) {
            map.put((String) pairs[index], (Double) pairs[index + 1]);
        }
        return map;
    }
}
