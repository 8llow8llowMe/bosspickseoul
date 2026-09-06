package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.out.source;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.ImportRequest;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.SourceReceipt;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.SourceRow;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.DatasetSourcePort;
import com.followfollowme.bosspickseoul.global.properties.DatasetSourceProperties;
import java.io.*;
import java.net.URI;
import java.net.http.*;
import java.nio.charset.Charset;
import java.nio.charset.CodingErrorAction;
import java.nio.file.*;
import java.security.*;
import java.time.Duration;
import java.util.*;
import java.util.zip.*;

public final class SeoulDatasetSourceAdapter implements DatasetSourcePort {
    private final ObjectMapper mapper;
    private final DatasetSourceProperties properties;
    private final HttpTransport transport;

    public SeoulDatasetSourceAdapter(ObjectMapper mapper, DatasetSourceProperties properties) {
        this(mapper, properties, jdkTransport(properties));
    }

    SeoulDatasetSourceAdapter(ObjectMapper mapper, DatasetSourceProperties properties, HttpTransport transport) {
        this.mapper = mapper;
        this.properties = properties;
        this.transport = transport;
        if (properties.getTimeoutSeconds() < 1 || properties.getMaxAttempts() < 1 || properties.getMaxAttempts() > 5)
            throw new IllegalArgumentException("Invalid source timeout or retry limit");
    }

    private static HttpTransport jdkTransport(DatasetSourceProperties properties) {
        HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(properties.getTimeoutSeconds()))
                .followRedirects(HttpClient.Redirect.NEVER).build();
        return uri -> {
            HttpResponse<byte[]> response = client.send(HttpRequest.newBuilder(uri)
                    .timeout(Duration.ofSeconds(properties.getTimeoutSeconds())).GET().build(), HttpResponse.BodyHandlers.ofByteArray());
            return new ApiResponse(response.statusCode(), response.body());
        };
    }

    @Override public SourceSession open(ImportRequest request) {
        try {
            Path root = properties.getRawDirectory().toAbsolutePath().normalize();
            Files.createDirectories(root);
            // Each attempt has a new directory, including retries with the same runId.
            Path archive = Files.createTempDirectory(root, request.runId() + "-");
            return request.sourceType() == ImportRequest.SourceType.API
                    ? new ApiSession(request, archive) : new FileSession(request, archive);
        } catch (IOException e) { throw new IllegalStateException("Cannot initialize raw source archive"); }
    }

    @FunctionalInterface interface HttpTransport { ApiResponse get(URI uri) throws IOException, InterruptedException; }
    record ApiResponse(int status, byte[] body) {}

    private abstract static class Session implements SourceSession {
        final ImportRequest request;
        final Path archive;
        final MessageDigest digest;
        long count;
        boolean complete;
        boolean closed;
        private SourceReceipt receipt;

        Session(ImportRequest request, Path archive) {
            this.request = request; this.archive = archive;
            try { digest = MessageDigest.getInstance("SHA-256"); }
            catch (NoSuchAlgorithmException e) { throw new IllegalStateException("SHA-256 unavailable"); }
        }

        void checkOpen() { if (closed) throw new IllegalStateException("Source session closed"); }
        @Override public SourceReceipt receipt() {
            if (!complete) throw new IllegalStateException("Source must reach EOF before receipt");
            if (receipt == null) receipt = new SourceReceipt(HexFormat.of().formatHex(digest.digest()), archive.toString(), count);
            return receipt;
        }
    }

    private final class ApiSession extends Session {
        private final String base;
        private final String key;
        private Iterator<JsonNode> page = Collections.emptyIterator();
        private long total = -1;

        ApiSession(ImportRequest request, Path archive) {
            super(request, archive);
            base = properties.getBaseUrl(); key = properties.getApiKey();
            try {
                URI uri = URI.create(base);
                boolean https = "https".equals(uri.getScheme()) && (uri.getPort() == -1 || uri.getPort() == 443);
                boolean http = "http".equals(uri.getScheme()) && uri.getPort() == 8088;
                if (!"openapi.seoul.go.kr".equals(uri.getHost()) || !(https || http)
                        || uri.getRawQuery() != null || uri.getRawFragment() != null || uri.getUserInfo() != null
                        || (uri.getPath() != null && !uri.getPath().isEmpty())) throw new IllegalArgumentException();
                if (key == null || !key.matches("[a-zA-Z0-9]+")) throw new IllegalArgumentException();
            } catch (IllegalArgumentException e) { throw new IllegalArgumentException("Invalid Seoul API endpoint or missing API key"); }
        }

        @Override public SourceRow read() {
            checkOpen();
            if (complete) return null;
            if (!page.hasNext()) {
                if (total >= 0 && count == total) { complete = true; return null; }
                fetchPage();
            }
            JsonNode row = page.next();
            if (!row.isObject()) throw new IllegalArgumentException("API row must be an object");
            Map<String, String> fields = new LinkedHashMap<>();
            row.fields().forEachRemaining(entry -> {
                if (!entry.getValue().isValueNode()) throw new IllegalArgumentException("API field must be scalar");
                fields.put(entry.getKey(), entry.getValue().isNull() ? null : entry.getValue().asText());
            });
            if (!String.valueOf(request.period().value()).equals(fields.get("STDR_YYQU_CD")))
                throw new IllegalArgumentException("API returned a different quarter");
            return new SourceRow(++count, fields);
        }

        private void fetchPage() {
            long start = count + 1;
            long end = total < 0 ? start + 999 : Math.min(total, start + 999);
            URI uri = URI.create(base + "/" + key + "/json/" + request.dataset().service() + "/" + start + "/" + end + "/" + request.period().value());
            byte[] body = null;
            for (int attempt = 1; attempt <= properties.getMaxAttempts(); attempt++) {
                try {
                    ApiResponse response = transport.get(uri);
                    if (response.status() == 200) { body = response.body(); break; }
                    if (response.status() != 429 && response.status() < 500)
                        throw new IllegalStateException("Seoul API rejected request (HTTP " + response.status() + ")");
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt(); throw new IllegalStateException("Seoul API request interrupted");
                } catch (IOException e) { /* Do not propagate URI-bearing exceptions containing the API key. */ }
                if (attempt < properties.getMaxAttempts()) {
                    try { Thread.sleep(200L * attempt); }
                    catch (InterruptedException e) { Thread.currentThread().interrupt(); throw new IllegalStateException("Seoul API retry interrupted"); }
                }
            }
            if (body == null) throw new IllegalStateException("Seoul API unavailable after bounded retries");
            try {
                Files.write(archive.resolve("page-" + start + ".json"), body, StandardOpenOption.CREATE_NEW);
                digest.update(body);
                JsonNode root = mapper.reader().with(JsonParser.Feature.STRICT_DUPLICATE_DETECTION).readTree(body);
                JsonNode data = root == null ? null : root.get(request.dataset().service());
                if (data == null || !"INFO-000".equals(data.path("RESULT").path("CODE").asText()))
                    throw new IllegalArgumentException("Seoul API returned an error or unexpected envelope");
                JsonNode totalNode = data.path("list_total_count");
                if (!totalNode.isIntegralNumber() || !totalNode.canConvertToLong() || totalNode.longValue() <= 0)
                    throw new IllegalArgumentException("Invalid API total row count");
                long returnedTotal = totalNode.longValue();
                if (total != -1 && total != returnedTotal) throw new IllegalArgumentException("API row count changed during pagination");
                total = returnedTotal;
                JsonNode rows = data.path("row");
                long expected = Math.min(1000, total - count);
                if (!rows.isArray() || rows.size() != expected) throw new IllegalArgumentException("Incomplete API page");
                page = rows.elements();
            } catch (IOException e) { throw new IllegalStateException("Cannot archive or decode Seoul API page"); }
        }

        @Override public void close() { closed = true; }
    }

    private final class FileSession extends Session {
        private final InputStream input;
        private final ZipInputStream zip;
        private CsvRecordReader csv;
        private List<String> headers;
        private long physicalRow;

        FileSession(ImportRequest request, Path archive) throws IOException {
            super(request, archive);
            Path copy = archive.resolve(request.sourceType() == ImportRequest.SourceType.ZIP ? "source.zip" : "source.csv");
            try (InputStream original = Files.newInputStream(request.sourceFile());
                 DigestInputStream checked = new DigestInputStream(original, digest)) { Files.copy(checked, copy); }
            input = Files.newInputStream(copy);
            zip = request.sourceType() == ImportRequest.SourceType.ZIP ? new ZipInputStream(input, Charset.forName(request.charset())) : null;
            try {
                if (zip == null) beginCsv(input);
                else if (!nextEntry()) throw new IllegalArgumentException("ZIP contains no CSV entries");
            } catch (RuntimeException | IOException e) { if (zip == null) input.close(); else zip.close(); throw e; }
        }

        private void beginCsv(InputStream stream) throws IOException {
            csv = new CsvRecordReader(new InputStreamReader(stream, Charset.forName(request.charset()).newDecoder()
                    .onMalformedInput(CodingErrorAction.REPORT).onUnmappableCharacter(CodingErrorAction.REPORT)));
            List<String> rawHeaders = csv.read();
            if (rawHeaders == null) throw new IllegalArgumentException("CSV has no header");
            headers = rawHeaders.stream().map(h -> properties.getHeaderAliases().getOrDefault(h.strip().replace(' ', '_'), h.strip())).toList();
            if (headers.stream().anyMatch(String::isBlank) || new HashSet<>(headers).size() != headers.size())
                throw new IllegalArgumentException("CSV header is blank or duplicated");
            if (!headers.contains("STDR_YYQU_CD")) throw new IllegalArgumentException("CSV missing quarter header; configure explicit header aliases");
        }

        private boolean nextEntry() throws IOException {
            ZipEntry entry;
            while ((entry = zip.getNextEntry()) != null) {
                if (!entry.isDirectory() && entry.getName().toLowerCase(Locale.ROOT).endsWith(".csv")) { beginCsv(zip); return true; }
            }
            return false;
        }

        @Override public SourceRow read() {
            checkOpen();
            if (complete) return null;
            try {
                while (true) {
                    List<String> values = csv.read();
                    if (values == null) {
                        if (zip != null && nextEntry()) continue;
                        complete = true; return null;
                    }
                    physicalRow++;
                    if (values.size() != headers.size()) throw new IllegalArgumentException("CSV field count mismatch at row " + physicalRow);
                    Map<String, String> fields = new LinkedHashMap<>();
                    for (int i = 0; i < headers.size(); i++) fields.put(headers.get(i), values.get(i));
                    if (!fields.get("STDR_YYQU_CD").matches("20[0-9]{2}[1-4]"))
                        throw new IllegalArgumentException("Invalid CSV quarter at row " + physicalRow);
                    if (!String.valueOf(request.period().value()).equals(fields.get("STDR_YYQU_CD"))) continue;
                    count++;
                    return new SourceRow(physicalRow, fields);
                }
            } catch (IOException e) { throw new IllegalStateException("Cannot read archived CSV/ZIP source"); }
        }

        @Override public void close() {
            closed = true;
            try { if (zip == null) input.close(); else zip.close(); }
            catch (IOException e) { throw new IllegalStateException("Cannot close source file"); }
        }
    }
}
