package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.district;

import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.DistrictAgeGroupFootTrafficQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.DistrictAreaQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.DistrictChangeIndicatorQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.DistrictClosedStoreAdministrationTopQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.DistrictDayOfWeekFootTrafficQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.DistrictDetailQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.DistrictFootTrafficDetailQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.DistrictGenderFootTrafficQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.DistrictOpenedStoreAdministrationTopQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.DistrictPeriodFootTrafficQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.DistrictSalesAdministrationTopQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.DistrictSalesDetailQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.DistrictSalesServiceTopQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.DistrictStoreDetailQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.DistrictStoreServiceTopQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.DistrictTimeSlotFootTrafficQueryResult;
import java.util.List;
import java.util.function.Function;

/**
 * District 응답 wire DTO 를 out-port 반환 타입인 QueryResult 로 옮긴다.
 *
 * <p>peer 의 응답 필드명을 아는 지점은 wire DTO 뿐이고, application 계층은 QueryResult 만 본다.
 * 16종 전부 컴포넌트 이름·구조가 1:1 로 같고 값 변환이나 분기가 전혀 없는 순수 필드 복사다.
 * 필드를 하나라도 빠뜨리면 primitive 기본값 0 이 조용히 흘러가므로,
 * {@code DistrictAnalysisWireMapperTest} 가 리플렉션으로 모든 말단 필드가 옮겨졌는지 검사한다.
 *
 * <p>중첩 컴포넌트와 리스트는 peer 가 생략할 수 있어 null 을 그대로 통과시킨다(기존 역직렬화 동작과 같다).
 * 빈 리스트로 바꿔 주지 않는 이유는 "peer 가 안 내려줬다" 와 "0건이다" 를 구분하는 판단이 어댑터가 아니라
 * 이 값을 읽는 쪽에 있기 때문이다.
 */
public final class DistrictAnalysisWireMapper {

    private DistrictAnalysisWireMapper() {
    }

    public static DistrictDetailQueryResult toQueryResult(DistrictDetailClientResponse wire) {
        if (wire == null) {
            return null;
        }
        return DistrictDetailQueryResult.builder()
            .changeIndicator(toQueryResult(wire.changeIndicator()))
            .footTraffic(toQueryResult(wire.footTraffic()))
            .store(toQueryResult(wire.store()))
            .sales(toQueryResult(wire.sales()))
            .build();
    }

    public static DistrictAreaQueryResult toQueryResult(DistrictAreaClientResponse wire) {
        if (wire == null) {
            return null;
        }
        return DistrictAreaQueryResult.builder()
            .districtCode(wire.districtCode())
            .districtName(wire.districtName())
            .build();
    }

    private static DistrictChangeIndicatorQueryResult toQueryResult(DistrictChangeIndicatorClientResponse wire) {
        if (wire == null) {
            return null;
        }
        return DistrictChangeIndicatorQueryResult.builder()
            .changeIndicatorCode(wire.changeIndicatorCode())
            .changeIndicatorName(wire.changeIndicatorName())
            .averageOpenedMonths(wire.averageOpenedMonths())
            .averageClosedMonths(wire.averageClosedMonths())
            .build();
    }

    private static DistrictFootTrafficDetailQueryResult toQueryResult(DistrictFootTrafficDetailClientResponse wire) {
        if (wire == null) {
            return null;
        }
        return DistrictFootTrafficDetailQueryResult.builder()
            // CodeNameDescriptionMetadata 는 common-core 의 공용 스키마라 양쪽이 같은 타입을 쓴다. 참조를 그대로 넘긴다.
            .periodTrend(wire.periodTrend())
            .periodTotalFootTrafficList(mapEach(wire.periodTotalFootTrafficList(), DistrictAnalysisWireMapper::toQueryResult))
            .timeSlot(toQueryResult(wire.timeSlot()))
            .gender(toQueryResult(wire.gender()))
            .ageGroup(toQueryResult(wire.ageGroup()))
            .dayOfWeek(toQueryResult(wire.dayOfWeek()))
            .build();
    }

    private static DistrictPeriodFootTrafficQueryResult toQueryResult(DistrictPeriodFootTrafficClientResponse wire) {
        if (wire == null) {
            return null;
        }
        return DistrictPeriodFootTrafficQueryResult.builder()
            .periodCode(wire.periodCode())
            .totalFootTraffic(wire.totalFootTraffic())
            .build();
    }

    private static DistrictTimeSlotFootTrafficQueryResult toQueryResult(DistrictTimeSlotFootTrafficClientResponse wire) {
        if (wire == null) {
            return null;
        }
        return DistrictTimeSlotFootTrafficQueryResult.builder()
            .footTrafficTime00To06(wire.footTrafficTime00To06())
            .footTrafficTime06To11(wire.footTrafficTime06To11())
            .footTrafficTime11To14(wire.footTrafficTime11To14())
            .footTrafficTime14To17(wire.footTrafficTime14To17())
            .footTrafficTime17To21(wire.footTrafficTime17To21())
            .footTrafficTime21To24(wire.footTrafficTime21To24())
            .dominantTimeSlotType(wire.dominantTimeSlotType())
            .build();
    }

    private static DistrictGenderFootTrafficQueryResult toQueryResult(DistrictGenderFootTrafficClientResponse wire) {
        if (wire == null) {
            return null;
        }
        return DistrictGenderFootTrafficQueryResult.builder()
            .maleFootTraffic(wire.maleFootTraffic())
            .femaleFootTraffic(wire.femaleFootTraffic())
            .dominantGenderType(wire.dominantGenderType())
            .build();
    }

    private static DistrictAgeGroupFootTrafficQueryResult toQueryResult(DistrictAgeGroupFootTrafficClientResponse wire) {
        if (wire == null) {
            return null;
        }
        return DistrictAgeGroupFootTrafficQueryResult.builder()
            .age10FootTraffic(wire.age10FootTraffic())
            .age20FootTraffic(wire.age20FootTraffic())
            .age30FootTraffic(wire.age30FootTraffic())
            .age40FootTraffic(wire.age40FootTraffic())
            .age50FootTraffic(wire.age50FootTraffic())
            .age60PlusFootTraffic(wire.age60PlusFootTraffic())
            .dominantAgeGroupType(wire.dominantAgeGroupType())
            .build();
    }

    private static DistrictDayOfWeekFootTrafficQueryResult toQueryResult(DistrictDayOfWeekFootTrafficClientResponse wire) {
        if (wire == null) {
            return null;
        }
        return DistrictDayOfWeekFootTrafficQueryResult.builder()
            .mondayFootTraffic(wire.mondayFootTraffic())
            .tuesdayFootTraffic(wire.tuesdayFootTraffic())
            .wednesdayFootTraffic(wire.wednesdayFootTraffic())
            .thursdayFootTraffic(wire.thursdayFootTraffic())
            .fridayFootTraffic(wire.fridayFootTraffic())
            .saturdayFootTraffic(wire.saturdayFootTraffic())
            .sundayFootTraffic(wire.sundayFootTraffic())
            .dominantDayOfWeekType(wire.dominantDayOfWeekType())
            .build();
    }

    private static DistrictStoreDetailQueryResult toQueryResult(DistrictStoreDetailClientResponse wire) {
        if (wire == null) {
            return null;
        }
        return DistrictStoreDetailQueryResult.builder()
            .topStoreServices(mapEach(wire.topStoreServices(), DistrictAnalysisWireMapper::toQueryResult))
            .topOpenedAdministrations(mapEach(wire.topOpenedAdministrations(), DistrictAnalysisWireMapper::toQueryResult))
            .topClosedAdministrations(mapEach(wire.topClosedAdministrations(), DistrictAnalysisWireMapper::toQueryResult))
            .build();
    }

    private static DistrictStoreServiceTopQueryResult toQueryResult(DistrictStoreServiceTopClientResponse wire) {
        if (wire == null) {
            return null;
        }
        return DistrictStoreServiceTopQueryResult.builder()
            .serviceCode(wire.serviceCode())
            .serviceName(wire.serviceName())
            .totalStoreCount(wire.totalStoreCount())
            .build();
    }

    private static DistrictOpenedStoreAdministrationTopQueryResult toQueryResult(
        DistrictOpenedStoreAdministrationTopClientResponse wire
    ) {
        if (wire == null) {
            return null;
        }
        return DistrictOpenedStoreAdministrationTopQueryResult.builder()
            .administrationCode(wire.administrationCode())
            .administrationName(wire.administrationName())
            .openedStoreCount(wire.openedStoreCount())
            .openingRate(wire.openingRate())
            .build();
    }

    private static DistrictClosedStoreAdministrationTopQueryResult toQueryResult(
        DistrictClosedStoreAdministrationTopClientResponse wire
    ) {
        if (wire == null) {
            return null;
        }
        return DistrictClosedStoreAdministrationTopQueryResult.builder()
            .administrationCode(wire.administrationCode())
            .administrationName(wire.administrationName())
            .closedStoreCount(wire.closedStoreCount())
            .closureRate(wire.closureRate())
            .build();
    }

    private static DistrictSalesDetailQueryResult toQueryResult(DistrictSalesDetailClientResponse wire) {
        if (wire == null) {
            return null;
        }
        return DistrictSalesDetailQueryResult.builder()
            .topSalesServices(mapEach(wire.topSalesServices(), DistrictAnalysisWireMapper::toQueryResult))
            .topSalesAdministrations(mapEach(wire.topSalesAdministrations(), DistrictAnalysisWireMapper::toQueryResult))
            .build();
    }

    private static DistrictSalesServiceTopQueryResult toQueryResult(DistrictSalesServiceTopClientResponse wire) {
        if (wire == null) {
            return null;
        }
        return DistrictSalesServiceTopQueryResult.builder()
            .serviceCode(wire.serviceCode())
            .serviceName(wire.serviceName())
            .salesChangeRate(wire.salesChangeRate())
            .build();
    }

    private static DistrictSalesAdministrationTopQueryResult toQueryResult(
        DistrictSalesAdministrationTopClientResponse wire
    ) {
        if (wire == null) {
            return null;
        }
        return DistrictSalesAdministrationTopQueryResult.builder()
            .administrationCode(wire.administrationCode())
            .administrationName(wire.administrationName())
            .totalSalesAmount(wire.totalSalesAmount())
            .salesChangeRate(wire.salesChangeRate())
            .build();
    }

    /**
     * 리스트는 원소 순서를 그대로 두고 원소별로 변환한다. peer 응답의 top N 은 순위가 곧 의미라 정렬하지 않는다.
     * null 리스트는 null 로 남긴다 — 기존 역직렬화 동작과 같다.
     */
    private static <W, Q> List<Q> mapEach(List<W> wires, Function<W, Q> mapping) {
        if (wires == null) {
            return null;
        }
        return wires.stream().map(mapping).toList();
    }
}
