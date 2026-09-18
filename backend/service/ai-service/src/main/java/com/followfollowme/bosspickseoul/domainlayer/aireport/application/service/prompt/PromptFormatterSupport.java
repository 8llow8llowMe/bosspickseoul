package com.followfollowme.bosspickseoul.domainlayer.aireport.application.service.prompt;

import java.text.NumberFormat;
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
