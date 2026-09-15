package com.followfollowme.bosspickseoul.domainlayer.policyingestion.adapter.out.source;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.followfollowme.bosspickseoul.domainlayer.policyingestion.application.exception.PolicyIngestionException;
import com.followfollowme.bosspickseoul.domainlayer.policyingestion.application.model.BizinfoNotice;
import com.followfollowme.bosspickseoul.global.properties.PolicyIngestionProperties;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

class BizinfoPolicySourceAdapterTest {

    @Test
    void fetchesPagesUntilTotCntAndAcceptsSingleItemObject() throws Exception {
        byte[] page1 = new ClassPathResource("policyingestion/bizinfo-page1.json").getInputStream().readAllBytes();
        byte[] page2 = new ClassPathResource("policyingestion/bizinfo-page2.json").getInputStream().readAllBytes();
        byte[] empty = "{\"jsonArray\":{\"item\":[]}}".getBytes(StandardCharsets.UTF_8);

        withServer(exchange -> {
            String page = queryParam(exchange.getRequestURI().getRawQuery(), "pageIndex");
            write(exchange, 200, "1".equals(page) ? page1 : "2".equals(page) ? page2 : empty);
        }, baseUrl -> {
            List<BizinfoNotice> notices = new BizinfoPolicySourceAdapter(properties(baseUrl, "key", 2, 5)).fetchAll();
            assertThat(notices).extracting(BizinfoNotice::pblancId)
                .containsExactly("PBLN_000000000080236", "PBLN_000000000124551", "PBLN_000000000120010");
            assertThat(notices.get(2).title()).isEqualTo("식품안심업소 기술지원");
            assertThat(notices.get(2).applyPeriod()).isEqualTo("상시");
        });
    }

    @Test
    void failsWhenHttpStatusIsNotSuccessful() throws Exception {
        withServer(exchange -> write(exchange, 500, "{}".getBytes(StandardCharsets.UTF_8)), baseUrl ->
            assertThatThrownBy(() -> new BizinfoPolicySourceAdapter(properties(baseUrl, "key", 100, 1)).fetchAll())
                .isInstanceOf(PolicyIngestionException.class));
    }

    @Test
    void failsWhenApiKeyIsMissing() {
        assertThatThrownBy(() -> new BizinfoPolicySourceAdapter(properties("http://127.0.0.1:1", "", 100, 1)).fetchAll())
            .isInstanceOf(PolicyIngestionException.class);
    }

    private static void withServer(ExchangeHandler handler, ServerTest test) throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", exchange -> {
            try {
                handler.handle(exchange);
            } finally {
                exchange.close();
            }
        });
        server.start();
        try {
            test.run("http://127.0.0.1:" + server.getAddress().getPort());
        } finally {
            server.stop(0);
        }
    }

    private static void write(HttpExchange exchange, int status, byte[] body) throws IOException {
        exchange.sendResponseHeaders(status, body.length);
        try (OutputStream output = exchange.getResponseBody()) {
            output.write(body);
        }
    }

    private static String queryParam(String query, String name) {
        if (query == null) {
            return null;
        }
        for (String part : query.split("&")) {
            int eq = part.indexOf('=');
            if (eq > 0 && part.substring(0, eq).equals(name)) {
                return part.substring(eq + 1);
            }
        }
        return null;
    }

    private static PolicyIngestionProperties properties(String baseUrl, String key, int pageSize, int maxPages) {
        return new PolicyIngestionProperties(
            false, "0 0 6 * * ?", "0 30 6 * * ?", 0.5, 30,
            new PolicyIngestionProperties.Bizinfo(baseUrl, key, "소상공인", pageSize, maxPages, 5, 1),
            null
        );
    }

    @FunctionalInterface
    private interface ExchangeHandler {
        void handle(HttpExchange exchange) throws IOException;
    }

    @FunctionalInterface
    private interface ServerTest {
        void run(String baseUrl) throws Exception;
    }
}
