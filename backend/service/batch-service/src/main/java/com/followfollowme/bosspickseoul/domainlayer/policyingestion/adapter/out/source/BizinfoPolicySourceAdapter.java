package com.followfollowme.bosspickseoul.domainlayer.policyingestion.adapter.out.source;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.bosspickseoul.domainlayer.policyingestion.application.exception.PolicyIngestionErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.policyingestion.application.exception.PolicyIngestionException;
import com.followfollowme.bosspickseoul.domainlayer.policyingestion.application.model.BizinfoNotice;
import com.followfollowme.bosspickseoul.domainlayer.policyingestion.application.port.out.PolicySourcePort;
import com.followfollowme.bosspickseoul.global.properties.PolicyIngestionProperties;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

public class BizinfoPolicySourceAdapter implements PolicySourcePort {

    private final PolicyIngestionProperties properties;
    private final ObjectMapper mapper;
    private final HttpClient client;
    private final Duration timeout;

    public BizinfoPolicySourceAdapter(PolicyIngestionProperties properties) {
        this.properties = properties;
        this.mapper = new ObjectMapper().configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        this.timeout = Duration.ofSeconds(properties.bizinfo().timeoutSeconds());
        this.client = HttpClient.newBuilder()
            .connectTimeout(timeout)
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();
    }

    @Override
    public List<BizinfoNotice> fetchAll() {
        String key = properties.bizinfo().crtfcKey();
        if (key == null || key.isBlank()) {
            throw new PolicyIngestionException(PolicyIngestionErrorCode.SOURCE_KEY_MISSING);
        }
        List<BizinfoNotice> notices = new ArrayList<>();
        int pageSize = properties.bizinfo().pageSize();
        int maxPages = properties.bizinfo().maxPages();
        Integer total = null;
        for (int page = 1; page <= maxPages; page++) {
            JsonNode root = readPage(page);
            List<JsonNode> items = itemsOf(root);
            if (items.isEmpty()) {
                break;
            }
            if (total == null && !items.isEmpty()) {
                JsonNode tot = items.getFirst().path("totCnt");
                if (tot.isNumber() || tot.isTextual()) {
                    try {
                        total = Integer.parseInt(tot.asText());
                    } catch (NumberFormatException ignored) {
                        total = null;
                    }
                }
            }
            for (JsonNode item : items) {
                notices.add(toNotice(item));
            }
            if (items.size() < pageSize) {
                break;
            }
            if (total != null && notices.size() >= total) {
                break;
            }
        }
        return List.copyOf(notices);
    }

    private JsonNode readPage(int pageIndex) {
        URI uri = pageUri(pageIndex);
        int attempts = properties.bizinfo().maxAttempts();
        IOException lastIo = null;
        for (int attempt = 1; attempt <= attempts; attempt++) {
            try {
                HttpResponse<byte[]> response = client.send(
                    HttpRequest.newBuilder(uri).timeout(timeout).GET().build(),
                    HttpResponse.BodyHandlers.ofByteArray()
                );
                if (response.statusCode() >= 500 && attempt < attempts) {
                    continue;
                }
                if (response.statusCode() < 200 || response.statusCode() >= 300) {
                    throw new PolicyIngestionException(
                        PolicyIngestionErrorCode.SOURCE_FETCH_FAILED,
                        "HTTP " + response.statusCode()
                    );
                }
                return mapper.readTree(response.body());
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new PolicyIngestionException(PolicyIngestionErrorCode.SOURCE_FETCH_FAILED, e, "interrupted");
            } catch (IOException e) {
                lastIo = e;
                if (attempt >= attempts) {
                    break;
                }
            }
        }
        throw new PolicyIngestionException(PolicyIngestionErrorCode.SOURCE_FETCH_FAILED, lastIo, "retry exhausted");
    }

    private URI pageUri(int pageIndex) {
        PolicyIngestionProperties.Bizinfo bizinfo = properties.bizinfo();
        StringBuilder query = new StringBuilder();
        append(query, "crtfcKey", bizinfo.crtfcKey());
        append(query, "dataType", "json");
        append(query, "pageUnit", Integer.toString(bizinfo.pageSize()));
        append(query, "pageIndex", Integer.toString(pageIndex));
        if (bizinfo.hashtags() != null && !bizinfo.hashtags().isBlank()) {
            append(query, "hashtags", bizinfo.hashtags());
        }
        String base = bizinfo.baseUrl();
        String separator = base.contains("?") ? "&" : "?";
        return URI.create(base + separator + query);
    }

    private static void append(StringBuilder query, String name, String value) {
        if (!query.isEmpty()) {
            query.append('&');
        }
        query.append(URLEncoder.encode(name, StandardCharsets.UTF_8))
            .append('=')
            .append(URLEncoder.encode(value, StandardCharsets.UTF_8));
    }

    static List<JsonNode> itemsOf(JsonNode root) {
        JsonNode array = root.path("jsonArray");
        JsonNode items = array.isMissingNode() || array.isNull() ? root.path("item") : array.path("item");
        if (items.isMissingNode() || items.isNull()) {
            if (array.isArray()) {
                items = array;
            } else if (root.isArray()) {
                items = root;
            }
        }
        List<JsonNode> result = new ArrayList<>();
        if (items.isArray()) {
            items.forEach(result::add);
        } else if (items.isObject() && !items.isEmpty()) {
            result.add(items);
        }
        return result;
    }

    static BizinfoNotice toNotice(JsonNode item) {
        String url = firstText(item, "pblancUrl", "link");
        String pblancId = firstText(item, "pblancId", "seq");
        if (pblancId.isEmpty() && url.contains("pblancId=")) {
            int from = url.indexOf("pblancId=") + "pblancId=".length();
            int to = url.indexOf('&', from);
            pblancId = to < 0 ? url.substring(from) : url.substring(from, to);
        }
        return new BizinfoNotice(
            pblancId,
            firstText(item, "pblancNm", "title"),
            firstText(item, "jrsdInsttNm", "author"),
            url,
            firstText(item, "reqstBeginEndDe", "reqstDt"),
            firstText(item, "trgetNm"),
            firstText(item, "bsnsSumryCn", "description"),
            firstText(item, "pldirSportRealmLclasCodeNm", "lcategory")
        );
    }

    private static String firstText(JsonNode item, String... names) {
        for (String name : names) {
            JsonNode node = item.get(name);
            if (node != null && !node.isNull()) {
                String text = node.asText("");
                if (!text.isBlank()) {
                    return text.strip();
                }
            }
        }
        return "";
    }
}
