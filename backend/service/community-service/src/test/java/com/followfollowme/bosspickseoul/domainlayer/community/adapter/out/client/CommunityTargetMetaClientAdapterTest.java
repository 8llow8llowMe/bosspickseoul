package com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.client;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.followfollowme.bosspickseoul.common.dto.Response;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.client.feign.CommunityRegionClient;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.client.support.InternalResponseSupport;
import com.followfollowme.bosspickseoul.domainlayer.community.application.exception.CommunityErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.community.application.exception.CommunityException;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.query.RegionTargetQueryResults.AdministrationAreaQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.query.RegionTargetQueryResults.CommercialAreaQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.query.RegionTargetQueryResults.DistrictAreaQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityTargetType;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityTargetMeta;
import feign.FeignException;
import feign.Request;
import feign.RequestTemplate;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Optional;
import java.util.function.Supplier;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class CommunityTargetMetaClientAdapterTest {

    private StubCommunityRegionClient client;
    private CommunityTargetMetaClientAdapter adapter;

    @BeforeEach
    void setUp() {
        client = new StubCommunityRegionClient();
        adapter = new CommunityTargetMetaClientAdapter(
            client, new InternalResponseSupport(CircuitBreakerRegistry.ofDefaults()));
    }

    @Test
    void findTargetMeta_district_mapsCodeAndName() {
        client.district = () -> Response.success(new DistrictAreaQueryResult("11680", "강남구"));

        Optional<CommunityTargetMeta> meta = adapter.findTargetMeta(CommunityTargetType.DISTRICT, "11680");

        assertThat(meta).contains(new CommunityTargetMeta(CommunityTargetType.DISTRICT, "11680", "강남구"));
    }

    @Test
    void findTargetMeta_administration_mapsCodeAndName() {
        client.administration = () -> Response.success(
            new AdministrationAreaQueryResult("11680", "강남구", "11680640", "역삼1동"));

        Optional<CommunityTargetMeta> meta = adapter.findTargetMeta(CommunityTargetType.ADMINISTRATION, "11680640");

        assertThat(meta).contains(new CommunityTargetMeta(CommunityTargetType.ADMINISTRATION, "11680640", "역삼1동"));
    }

    @Test
    void findTargetMeta_commercial_mapsCodeAndName() {
        client.commercial = () -> Response.success(new CommercialAreaQueryResult(
            "3110971", "선정릉역 4번", "11680", "강남구", "11680640", "역삼1동"));

        Optional<CommunityTargetMeta> meta = adapter.findTargetMeta(CommunityTargetType.COMMERCIAL, "3110971");

        assertThat(meta).contains(new CommunityTargetMeta(CommunityTargetType.COMMERCIAL, "3110971", "선정릉역 4번"));
    }

    @Test
    void findTargetMeta_unknownCode_returnsEmpty() {
        // district-service 의 404(REGION_00x)는 장애가 아니라 "그런 코드 없음" — TARGET_NOT_FOUND 로 이어진다
        client.district = () -> {
            throw notFound();
        };

        assertThat(adapter.findTargetMeta(CommunityTargetType.DISTRICT, "99999")).isEmpty();
    }

    @Test
    void findTargetMeta_districtServiceDown_throwsServiceUnavailable() {
        client.commercial = () -> {
            throw serverError();
        };

        assertThatThrownBy(() -> adapter.findTargetMeta(CommunityTargetType.COMMERCIAL, "3110971"))
            .isInstanceOf(CommunityException.class)
            .extracting(exception -> ((CommunityException) exception).getErrorCode())
            .isEqualTo(CommunityErrorCode.REGION_SERVICE_UNAVAILABLE);
    }

    private FeignException notFound() {
        return new FeignException.NotFound("not found", request(), null, Map.of());
    }

    private FeignException serverError() {
        return new FeignException.InternalServerError("boom", request(), null, Map.of());
    }

    private Request request() {
        return Request.create(Request.HttpMethod.GET, "/", Map.of(), null, StandardCharsets.UTF_8, new RequestTemplate());
    }

    private static class StubCommunityRegionClient implements CommunityRegionClient {

        private Supplier<Response<DistrictAreaQueryResult>> district;
        private Supplier<Response<AdministrationAreaQueryResult>> administration;
        private Supplier<Response<CommercialAreaQueryResult>> commercial;

        @Override
        public Response<DistrictAreaQueryResult> getDistrict(String districtCode) {
            return district.get();
        }

        @Override
        public Response<AdministrationAreaQueryResult> getAdministration(String administrationCode) {
            return administration.get();
        }

        @Override
        public Response<CommercialAreaQueryResult> getCommercialAdministration(String commercialCode) {
            return commercial.get();
        }
    }
}
