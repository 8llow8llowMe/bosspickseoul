package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.out.source;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Maps Seoul CSV Korean headers to the Open API column codes so both routes stage the same payload keys.
 *
 * <p>The table lives in {@code seoul/csv-header-aliases.csv} on the classpath; application properties may
 * add or override entries for a file that spells a header differently. Headers are normalised before lookup
 * (trim, blank and {@code ~} to {@code _}, {@code 률} to {@code 율}) so the table needs one line per column.
 */
final class CsvHeaderAliases {
    static final String RESOURCE = "seoul/csv-header-aliases.csv";
    private final Map<String, String> aliases = new LinkedHashMap<>();

    CsvHeaderAliases(Map<String, String> overrides) {
        try (InputStream stream = CsvHeaderAliases.class.getClassLoader().getResourceAsStream(RESOURCE)) {
            if (stream == null) throw new IllegalStateException("Missing classpath resource " + RESOURCE);
            load(stream);
        } catch (IOException e) {
            throw new IllegalStateException("Cannot read " + RESOURCE, e);
        }
        overrides.forEach((header, code) -> put(header, code, "override " + header));
    }

    /** Returns the column code, or the normalised header itself when no alias is registered. */
    String resolve(String rawHeader) {
        String header = normalise(rawHeader);
        return aliases.getOrDefault(header, header);
    }

    int size() { return aliases.size(); }

    private void load(InputStream stream) throws IOException {
        BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8));
        String line;
        int number = 0;
        while ((line = reader.readLine()) != null) {
            number++;
            if (number == 1 && line.startsWith("\uFEFF")) line = line.substring(1);
            String content = line.strip();
            if (content.isEmpty() || content.startsWith("#")) continue;
            int comma = content.indexOf(',');
            if (comma < 1 || comma == content.length() - 1 || content.indexOf(',', comma + 1) >= 0)
                throw new IllegalStateException(RESOURCE + " line " + number + " must be <header>,<code>");
            put(content.substring(0, comma), content.substring(comma + 1), RESOURCE + " line " + number);
        }
    }

    private void put(String header, String code, String where) {
        String key = normalise(header);
        String value = code.strip();
        if (key.isEmpty() || !value.matches("[A-Za-z][A-Za-z0-9_]*"))
            throw new IllegalStateException("Invalid header alias at " + where);
        String previous = aliases.put(key, value);
        if (previous != null && !previous.equals(value) && where.startsWith(RESOURCE))
            throw new IllegalStateException("Conflicting header alias for " + key + " at " + where);
    }

    private static String normalise(String header) {
        return header.strip().replace(' ', '_').replace('~', '_').replace('률', '율');
    }
}
