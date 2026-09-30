package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.out.source;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.ImportRequest;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.SourceAcquisition;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.SourceReceipt;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.SourceRow;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.DatasetSourcePort;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.Dataset;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.Quarter;
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
    private static final int PAGE_SIZE = 1000;
    private static final String OK = "INFO-000";
    /**
     * "해당하는 데이터가 없습니다". 서울 열린데이터광장 공통 응답 코드로 알려진 값이고, 서비스 키 없이 최상위 {@code RESULT}
     * 로 오는 경우와 서비스 키 아래로 오는 경우를 모두 받는다. 이 저장소에서는 아직 실호출로 확인하지 못했다
     * (batch-service.md 「분기 적재 자동 최신화」 실호출 확인 필요). 다른 비-INFO-000 코드는 계속 예외다.
     */
    static final String NO_DATA = "INFO-200";
    private static final String RUN_ID = "[a-zA-Z0-9_-]{1,64}";
    private final ObjectMapper mapper;
    private final DatasetSourceProperties properties;
    private final HttpTransport transport;
    private final CsvHeaderAliases headerAliases;

    public SeoulDatasetSourceAdapter(ObjectMapper mapper, DatasetSourceProperties properties) {
        this(mapper, properties, jdkTransport(properties));
    }

    SeoulDatasetSourceAdapter(ObjectMapper mapper, DatasetSourceProperties properties, HttpTransport transport) {
        this.mapper = mapper;
        this.properties = properties;
        this.transport = transport;
        this.headerAliases = new CsvHeaderAliases(properties.getHeaderAliases());
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
            // A replay reads an earlier attempt's immutable pages in place; it neither copies nor creates a directory.
            if (request.sourceType() == ImportRequest.SourceType.ARCHIVE) return new ArchiveSession(request);
            Path archive = newArchive(request.runId());
            return request.sourceType() == ImportRequest.SourceType.API
                    ? new ApiSession(request, archive) : new FileSession(request, archive);
        } catch (IOException e) { throw new IllegalStateException("Cannot initialize raw source archive"); }
    }

    /**
     * 분기 1건 탐지. {@code /1/1/<period>} 로 API 를 한 번만 부르고 {@code list_total_count} 를 돌려준다.
     * 분기 인자를 무시하는 데이터셋은 어떤 분기를 넣어도 전 기간 합계가 온다. 페이지를 보관하지 않는다.
     */
    @Override public Optional<Long> probe(Dataset dataset, Quarter period) {
        byte[] body = get(uri(endpointPrefix(), dataset, 1, 1, period));
        Envelope envelope = envelope(body, dataset);
        return envelope.empty() ? Optional.empty() : Optional.of(envelope.total());
    }

    /**
     * 요청 분기({@code urlPeriod})의 전 페이지를 받아 {@code page-<start>.json} 으로 보관하고, 행을 버리지 않고
     * {@code STDR_YYQU_CD} 별로 센다. 보관 디렉터리는 ARCHIVE 재생({@code open})이 그대로 읽는 형식이다.
     * dataset_release 는 쓰지 않는다. 게시 판단은 호출자가 이 건수로 한다.
     */
    @Override public SourceAcquisition acquire(Dataset dataset, Quarter urlPeriod, String runId) {
        if (runId == null || !runId.matches(RUN_ID)) throw new IllegalArgumentException("Invalid runId");
        String prefix = endpointPrefix();
        Path archive;
        try { archive = newArchive(runId); }
        catch (IOException e) { throw new IllegalStateException("Cannot initialize raw source archive"); }
        SortedMap<Quarter, Long> rowsByQuarter = new TreeMap<>();
        long total = -1;
        long fetched = 0;
        int calls = 0;
        while (total < 0 || fetched < total) {
            long start = fetched + 1;
            long end = total < 0 ? start + PAGE_SIZE - 1 : Math.min(total, start + PAGE_SIZE - 1);
            byte[] body = get(uri(prefix, dataset, start, end, urlPeriod));
            calls++;
            archivePage(archive, start, body);
            Envelope envelope = envelope(body, dataset);
            if (envelope.empty()) {
                if (total < 0) return new SourceAcquisition(archive.toString(), rowsByQuarter, calls, 0);
                throw new IllegalArgumentException("API row count changed during pagination");
            }
            if (total != -1 && total != envelope.total()) throw new IllegalArgumentException("API row count changed during pagination");
            total = envelope.total();
            if (!envelope.rows().isArray() || envelope.rows().size() != Math.min(PAGE_SIZE, total - fetched))
                throw new IllegalArgumentException("Incomplete API page");
            for (JsonNode row : envelope.rows()) {
                String period = row.isObject() ? scalar(row.path("STDR_YYQU_CD")) : null;
                if (period == null || !period.matches("20[0-9]{2}[1-4]")) throw new IllegalArgumentException("API returned an invalid quarter");
                rowsByQuarter.merge(new Quarter(period), 1L, Long::sum);
            }
            fetched += envelope.rows().size();
        }
        return new SourceAcquisition(archive.toString(), rowsByQuarter, calls, total);
    }

    static String pageFile(long start) { return "page-" + start + ".json"; }

    private Path newArchive(String runId) throws IOException {
        Path root = properties.getRawDirectory().toAbsolutePath().normalize();
        Files.createDirectories(root);
        // Each attempt has a new directory, including retries with the same runId.
        return Files.createTempDirectory(root, runId + "-");
    }

    private static void archivePage(Path archive, long start, byte[] body) {
        try { Files.write(archive.resolve(pageFile(start)), body, StandardOpenOption.CREATE_NEW); }
        catch (IOException e) { throw new IllegalStateException("Cannot archive Seoul API page"); }
    }

    /** Validates the configured endpoint and key, returning {@code <base>/<key>}. The key never enters an exception. */
    private String endpointPrefix() {
        String base = properties.getBaseUrl();
        String key = properties.getApiKey();
        try {
            URI uri = URI.create(base);
            boolean https = "https".equals(uri.getScheme()) && (uri.getPort() == -1 || uri.getPort() == 443);
            boolean http = "http".equals(uri.getScheme()) && uri.getPort() == 8088;
            if (!"openapi.seoul.go.kr".equals(uri.getHost()) || !(https || http)
                    || uri.getRawQuery() != null || uri.getRawFragment() != null || uri.getUserInfo() != null
                    || (uri.getPath() != null && !uri.getPath().isEmpty())) throw new IllegalArgumentException();
            if (key == null || !key.matches("[a-zA-Z0-9]+")) throw new IllegalArgumentException();
        } catch (IllegalArgumentException e) { throw new IllegalArgumentException("Invalid Seoul API endpoint or missing API key"); }
        return base + "/" + key;
    }

    private static URI uri(String prefix, Dataset dataset, long start, long end, Quarter period) {
        if (dataset.service().isBlank()) throw new IllegalArgumentException("Dataset supports archival files only");
        return URI.create(prefix + "/json/" + dataset.service() + "/" + start + "/" + end + "/" + period.value());
    }

    /** Bounded retries on 429/5xx and I/O errors. Never propagates URI-bearing exceptions, which contain the API key. */
    private byte[] get(URI uri) {
        for (int attempt = 1; attempt <= properties.getMaxAttempts(); attempt++) {
            try {
                ApiResponse response = transport.get(uri);
                if (response.status() == 200) return response.body();
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
        throw new IllegalStateException("Seoul API unavailable after bounded retries");
    }

    private record Envelope(boolean empty, long total, JsonNode rows) {
        static final Envelope EMPTY = new Envelope(true, 0, null);
    }

    /**
     * Decodes one page and checks its envelope. {@link #NO_DATA} at the top level or under the service key is
     * "no rows for this request"; any other code but {@code INFO-000} is an error.
     */
    private Envelope envelope(byte[] body, Dataset dataset) {
        JsonNode root;
        try {
            // Amounts reach 13 digits; decode them exactly instead of through a double.
            root = mapper.reader().with(JsonParser.Feature.STRICT_DUPLICATE_DETECTION)
                    .with(DeserializationFeature.USE_BIG_DECIMAL_FOR_FLOATS).readTree(body);
        } catch (IOException e) { throw new IllegalStateException("Cannot decode Seoul API page"); }
        JsonNode data = root == null ? null : root.get(dataset.service());
        if (root != null && (NO_DATA.equals(resultCode(root)) || (data != null && NO_DATA.equals(resultCode(data))))) return Envelope.EMPTY;
        if (data == null || !OK.equals(resultCode(data)))
            throw new IllegalArgumentException("Seoul API returned an error or unexpected envelope");
        JsonNode totalNode = data.path("list_total_count");
        if (!totalNode.isIntegralNumber() || !totalNode.canConvertToLong() || totalNode.longValue() <= 0)
            throw new IllegalArgumentException("Invalid API total row count");
        return new Envelope(false, totalNode.longValue(), data.path("row"));
    }

    private static String resultCode(JsonNode node) { return node.path("RESULT").path("CODE").asText(); }

    /**
     * Seoul serialises every metric as a JSON number ({@code 5.03135509E8}, {@code 51551.0}). The payload
     * must hold the same plain decimal text a CSV row would ({@code 503135509}, {@code 51551}) so both
     * routes stage identical values and no reader has to parse scientific notation.
     */
    private static String scalar(JsonNode value) {
        if (value.isNull() || value.isMissingNode()) return null;
        if (value.isNumber()) return value.decimalValue().stripTrailingZeros().toPlainString();
        return value.asText();
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

    /**
     * Walks Seoul JSON envelopes page by page. The subclass supplies each page's bytes, either from the API
     * (archiving them as {@code page-<start>.json}) or from such an archive, so both produce the same rows,
     * row numbers and checksum for the same pages.
     */
    private abstract class PageSession extends Session {
        private Iterator<JsonNode> page = Collections.emptyIterator();
        private long total = -1;
        private long fetchedCount;

        PageSession(ImportRequest request, Path archive) { super(request, archive); }

        abstract byte[] pageBytes(long start, long end);

        @Override public SourceRow read() {
            checkOpen();
            if (complete) return null;
            while (true) {
                if (!page.hasNext()) {
                    if (total >= 0 && fetchedCount == total) { complete = true; return null; }
                    fetchPage();
                }
                JsonNode row = page.next();
                fetchedCount++;
                if (!row.isObject()) throw new IllegalArgumentException("API row must be an object");
                Map<String, String> fields = new LinkedHashMap<>();
                row.fields().forEachRemaining(entry -> {
                    if (!entry.getValue().isValueNode()) throw new IllegalArgumentException("API field must be scalar");
                    fields.put(entry.getKey(), scalar(entry.getValue()));
                });
                String rowPeriod = fields.get("STDR_YYQU_CD");
                if (rowPeriod == null || !rowPeriod.matches("20[0-9]{2}[1-4]")) {
                    throw new IllegalArgumentException("API returned an invalid quarter");
                }
                if (!String.valueOf(request.period().value()).equals(rowPeriod)) continue;
                count++;
                return new SourceRow(fetchedCount, fields);
            }
        }

        private void fetchPage() {
            long start = fetchedCount + 1;
            long end = total < 0 ? start + PAGE_SIZE - 1 : Math.min(total, start + PAGE_SIZE - 1);
            byte[] body = pageBytes(start, end);
            digest.update(body);
            Envelope envelope = envelope(body, request.dataset());
            // An import was asked for a quarter it expects rows for; "no data" here is not a valid source.
            if (envelope.empty()) throw new IllegalArgumentException("Seoul API returned an error or unexpected envelope");
            long returnedTotal = envelope.total();
            if (total != -1 && total != returnedTotal) throw new IllegalArgumentException("API row count changed during pagination");
            total = returnedTotal;
            JsonNode rows = envelope.rows();
            long expected = Math.min(PAGE_SIZE, total - fetchedCount);
            if (!rows.isArray() || rows.size() != expected) throw new IllegalArgumentException("Incomplete API page");
            page = rows.elements();
        }

        @Override public void close() { closed = true; }
    }

    private final class ApiSession extends PageSession {
        private final String prefix;

        ApiSession(ImportRequest request, Path archive) {
            super(request, archive);
            prefix = endpointPrefix();
        }

        @Override byte[] pageBytes(long start, long end) {
            byte[] body = get(uri(prefix, request.dataset(), start, end, request.period()));
            archivePage(archive, start, body);
            return body;
        }
    }

    /** Replays the {@code page-<start>.json} files of an earlier API attempt; a missing page fails closed. */
    private final class ArchiveSession extends PageSession {
        ArchiveSession(ImportRequest request) {
            super(request, request.sourceFile().toAbsolutePath().normalize());
            if (!Files.isRegularFile(archive.resolve(pageFile(1))))
                throw new IllegalArgumentException("Raw archive directory has no " + pageFile(1));
        }

        @Override byte[] pageBytes(long start, long end) {
            try { return Files.readAllBytes(archive.resolve(pageFile(start))); }
            catch (NoSuchFileException e) { throw new IllegalArgumentException("Raw archive is missing " + pageFile(start)); }
            catch (IOException e) { throw new IllegalStateException("Cannot read raw archive page"); }
        }
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
            headers = rawHeaders.stream().map(headerAliases::resolve).toList();
            if (headers.stream().anyMatch(String::isBlank) || new HashSet<>(headers).size() != headers.size())
                throw new IllegalArgumentException("CSV header is blank or duplicated");
            if (!headers.contains("STDR_YYQU_CD")) throw new IllegalArgumentException("CSV missing quarter header; configure explicit header aliases");
            // A Korean header left unaliased would stage under a key the API route never produces and skip the
            // suffix-based numeric checks, so the two routes would silently disagree. Stop and name the headers.
            List<String> unaliased = headers.stream().filter(h -> !h.matches("[A-Za-z][A-Za-z0-9_]*")).toList();
            if (!unaliased.isEmpty()) throw new IllegalArgumentException("CSV headers without a source column alias: " + unaliased);
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
