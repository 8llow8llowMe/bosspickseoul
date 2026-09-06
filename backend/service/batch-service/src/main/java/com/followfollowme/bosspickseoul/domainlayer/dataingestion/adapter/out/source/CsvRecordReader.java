package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.out.source;

import java.io.IOException;
import java.io.PushbackReader;
import java.io.Reader;
import java.util.ArrayList;
import java.util.List;

/** RFC 4180 records, including embedded newlines; malformed quoting fails closed. */
final class CsvRecordReader {
    private final PushbackReader reader;
    private boolean first = true;

    CsvRecordReader(Reader reader) { this.reader = new PushbackReader(reader, 1); }

    List<String> read() throws IOException {
        List<String> fields = new ArrayList<>();
        StringBuilder field = new StringBuilder();
        boolean quoted = false, afterQuote = false, started = false;
        while (true) {
            int c = reader.read();
            if (first) { first = false; if (c == '\uFEFF') c = reader.read(); }
            if (c == -1) {
                if (quoted) throw new IllegalArgumentException("Unclosed CSV quote");
                if (!started && fields.isEmpty()) return null;
                fields.add(field.toString());
                return fields;
            }
            started = true;
            if (quoted) {
                if (c == '"') { quoted = false; afterQuote = true; }
                else field.append((char) c);
            } else if (afterQuote && c == '"') {
                field.append('"'); quoted = true; afterQuote = false;
            } else if (c == ',' || c == '\r' || c == '\n') {
                fields.add(field.toString()); field.setLength(0); afterQuote = false;
                if (c != ',') {
                    if (c == '\r') { int next = reader.read(); if (next != '\n' && next != -1) reader.unread(next); }
                    return fields;
                }
            } else if (afterQuote) {
                throw new IllegalArgumentException("Characters after CSV closing quote");
            } else if (c == '"') {
                if (!field.isEmpty()) throw new IllegalArgumentException("Quote inside unquoted CSV field");
                quoted = true;
            } else field.append((char) c);
        }
    }
}
