package com.followfollowme.nowdoboss.domainlayer.aireport.application.service.prompt;

import java.text.NumberFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

public final class PromptFormatterSupport {

    private static final NumberFormat NUMBER_FORMAT = NumberFormat.getNumberInstance(Locale.KOREA);

    private PromptFormatterSupport() {
    }

    public static String formatNumber(long value) {
        return NUMBER_FORMAT.format(value);
    }

    public static String formatPercent(double value) {
        return "%.1f%%".formatted(value);
    }

    public static String formatTopEntry(Map<String, Long> valueByLabel) {
        return valueByLabel.entrySet().stream()
            .max(Map.Entry.comparingByValue())
            .map(entry -> "%s (%s)".formatted(entry.getKey(), formatNumber(entry.getValue())))
            .orElse("N/A");
    }

    public static String formatTopPercentEntry(Map<String, Double> valueByLabel) {
        return valueByLabel.entrySet().stream()
            .max(Map.Entry.comparingByValue())
            .map(entry -> "%s (%s)".formatted(entry.getKey(), formatPercent(entry.getValue())))
            .orElse("N/A");
    }

    public static <T> String formatTopList(List<T> items, int size, Function<T, String> mapper) {
        if (items == null || items.isEmpty()) {
            return "N/A";
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
