package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial;

import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialAverageIncomeQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialExpenseByCategoryQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialFacilityQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialFootTrafficByAgeGenderPercentQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialFootTrafficByAgeGroupQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialFootTrafficByDayOfWeekQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialFootTrafficByTimeSlotQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialFootTrafficQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialIncomeAndExpenseQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialResidentPopulationByAgeQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialResidentPopulationQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialSalesByAgeGenderPercentQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialSalesByAgeQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialSalesByDayOfWeekQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialSalesByTimeSlotQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialSalesCountByDayOfWeekQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialSalesCountByGenderQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialSalesCountByTimeSlotQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialSalesQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialSchoolCountQueryResult;

/**
 * commercial-service 응답 wire DTO 를 out-port 반환 타입인 QueryResult 로 옮긴다.
 *
 * <p>peer 의 응답 필드명({@code ...Item})을 아는 지점은 wire DTO 뿐이고, application 계층은 QueryResult 만 본다.
 * 상주인구의 {@code totalResidentPopulationCount} 한 개를 뺀 나머지는 컴포넌트 이름·구조가 1:1 로 같고
 * 값 변환이나 분기가 전혀 없는 순수 필드 복사다. 필드를 하나라도 빠뜨리면 primitive 기본값 0 이 조용히 흘러가므로,
 * {@code CommercialAnalysisWireMapperTest} 가 리플렉션으로 모든 말단 필드가 옮겨졌는지 검사한다.
 *
 * <p>유일한 파생 필드는 {@code CommercialResidentPopulationQueryResult.totalResidentPopulationCount} 다.
 * peer 응답에 대응 키가 없고 총 상주인구는 {@code byAgeItem.totalResidentPopulation} 으로 내려오므로
 * 여기서 그 값을 끌어와 채운다.
 *
 * <p>중첩 컴포넌트는 peer 가 생략할 수 있어 null 을 그대로 통과시킨다(기존 역직렬화 동작과 같다).
 */
public final class CommercialAnalysisWireMapper {

    private CommercialAnalysisWireMapper() {
    }

    public static CommercialSalesQueryResult toQueryResult(CommercialSalesClientResponse wire) {
        if (wire == null) {
            return null;
        }
        return CommercialSalesQueryResult.builder()
            .amountByTimeSlot(toQueryResult(wire.amountByTimeSlot()))
            .amountByDayOfWeek(toQueryResult(wire.amountByDayOfWeek()))
            .amountByAge(toQueryResult(wire.amountByAge()))
            .amountByAgeGenderPercent(toQueryResult(wire.amountByAgeGenderPercent()))
            .countByDayOfWeek(toQueryResult(wire.countByDayOfWeek()))
            .countByTimeSlot(toQueryResult(wire.countByTimeSlot()))
            .countByGender(toQueryResult(wire.countByGender()))
            .build();
    }

    public static CommercialFootTrafficQueryResult toQueryResult(CommercialFootTrafficClientResponse wire) {
        if (wire == null) {
            return null;
        }
        return CommercialFootTrafficQueryResult.builder()
            .byTimeSlot(toQueryResult(wire.byTimeSlot()))
            .byDayOfWeek(toQueryResult(wire.byDayOfWeek()))
            .byAgeGroup(toQueryResult(wire.byAgeGroup()))
            .byAgeGenderPercent(toQueryResult(wire.byAgeGenderPercent()))
            .build();
    }

    public static CommercialIncomeAndExpenseQueryResult toQueryResult(CommercialIncomeAndExpenseClientResponse wire) {
        if (wire == null) {
            return null;
        }
        return CommercialIncomeAndExpenseQueryResult.builder()
            .averageIncome(toQueryResult(wire.averageIncome()))
            .expenseByCategory(toQueryResult(wire.expenseByCategory()))
            .build();
    }

    public static CommercialFacilityQueryResult toQueryResult(CommercialFacilityClientResponse wire) {
        if (wire == null) {
            return null;
        }
        return CommercialFacilityQueryResult.builder()
            .totalFacilityCount(wire.totalFacilityCount())
            .schoolCount(toQueryResult(wire.schoolCount()))
            .totalTransportationFacilityCount(wire.totalTransportationFacilityCount())
            .build();
    }

    public static CommercialResidentPopulationQueryResult toQueryResult(CommercialResidentPopulationClientResponse wire) {
        if (wire == null) {
            return null;
        }
        // totalResidentPopulationCount 는 peer 응답에 대응 키가 없는 파생 필드다. 총 상주인구는 byAgeItem 안에 있다.
        // byAge 가 null 이면 파생시킬 원천이 없다. primitive long 이라 "모름" 을 표현할 수 없고, 매퍼가 숫자를
        // 지어내서도 안 되므로 0 으로 둔다. 다른 중첩 블록과 마찬가지로 byAge 자체는 null 을 그대로 통과시키며,
        // 이 경우 AiReportProcessor 가 population.byAge() 를 역참조하는 지점에서 0 이 아니라 NPE 로 드러난다.
        CommercialResidentPopulationByAgeClientResponse byAge = wire.byAge();
        return CommercialResidentPopulationQueryResult.builder()
            .byAge(toQueryResult(byAge))
            .totalResidentPopulationCount(byAge == null ? 0L : byAge.totalResidentPopulation())
            .build();
    }

    private static CommercialSalesByTimeSlotQueryResult toQueryResult(CommercialSalesByTimeSlotClientResponse wire) {
        if (wire == null) {
            return null;
        }
        return CommercialSalesByTimeSlotQueryResult.builder()
            .salesAmountTime00To06(wire.salesAmountTime00To06())
            .salesAmountTime06To11(wire.salesAmountTime06To11())
            .salesAmountTime11To14(wire.salesAmountTime11To14())
            .salesAmountTime14To17(wire.salesAmountTime14To17())
            .salesAmountTime17To21(wire.salesAmountTime17To21())
            .salesAmountTime21To24(wire.salesAmountTime21To24())
            .build();
    }

    private static CommercialSalesByDayOfWeekQueryResult toQueryResult(CommercialSalesByDayOfWeekClientResponse wire) {
        if (wire == null) {
            return null;
        }
        return CommercialSalesByDayOfWeekQueryResult.builder()
            .mondaySalesAmount(wire.mondaySalesAmount())
            .tuesdaySalesAmount(wire.tuesdaySalesAmount())
            .wednesdaySalesAmount(wire.wednesdaySalesAmount())
            .thursdaySalesAmount(wire.thursdaySalesAmount())
            .fridaySalesAmount(wire.fridaySalesAmount())
            .saturdaySalesAmount(wire.saturdaySalesAmount())
            .sundaySalesAmount(wire.sundaySalesAmount())
            .build();
    }

    private static CommercialSalesByAgeQueryResult toQueryResult(CommercialSalesByAgeClientResponse wire) {
        if (wire == null) {
            return null;
        }
        return CommercialSalesByAgeQueryResult.builder()
            .age10SalesAmount(wire.age10SalesAmount())
            .age20SalesAmount(wire.age20SalesAmount())
            .age30SalesAmount(wire.age30SalesAmount())
            .age40SalesAmount(wire.age40SalesAmount())
            .age50SalesAmount(wire.age50SalesAmount())
            .age60PlusSalesAmount(wire.age60PlusSalesAmount())
            .build();
    }

    private static CommercialSalesByAgeGenderPercentQueryResult toQueryResult(CommercialSalesByAgeGenderPercentClientResponse wire) {
        if (wire == null) {
            return null;
        }
        return CommercialSalesByAgeGenderPercentQueryResult.builder()
            .maleAge10Percent(wire.maleAge10Percent())
            .femaleAge10Percent(wire.femaleAge10Percent())
            .maleAge20Percent(wire.maleAge20Percent())
            .femaleAge20Percent(wire.femaleAge20Percent())
            .maleAge30Percent(wire.maleAge30Percent())
            .femaleAge30Percent(wire.femaleAge30Percent())
            .maleAge40Percent(wire.maleAge40Percent())
            .femaleAge40Percent(wire.femaleAge40Percent())
            .maleAge50Percent(wire.maleAge50Percent())
            .femaleAge50Percent(wire.femaleAge50Percent())
            .maleAge60PlusPercent(wire.maleAge60PlusPercent())
            .femaleAge60PlusPercent(wire.femaleAge60PlusPercent())
            .build();
    }

    private static CommercialSalesCountByDayOfWeekQueryResult toQueryResult(CommercialSalesCountByDayOfWeekClientResponse wire) {
        if (wire == null) {
            return null;
        }
        return CommercialSalesCountByDayOfWeekQueryResult.builder()
            .mondaySalesCount(wire.mondaySalesCount())
            .tuesdaySalesCount(wire.tuesdaySalesCount())
            .wednesdaySalesCount(wire.wednesdaySalesCount())
            .thursdaySalesCount(wire.thursdaySalesCount())
            .fridaySalesCount(wire.fridaySalesCount())
            .saturdaySalesCount(wire.saturdaySalesCount())
            .sundaySalesCount(wire.sundaySalesCount())
            .build();
    }

    private static CommercialSalesCountByTimeSlotQueryResult toQueryResult(CommercialSalesCountByTimeSlotClientResponse wire) {
        if (wire == null) {
            return null;
        }
        return CommercialSalesCountByTimeSlotQueryResult.builder()
            .salesCountTime00To06(wire.salesCountTime00To06())
            .salesCountTime06To11(wire.salesCountTime06To11())
            .salesCountTime11To14(wire.salesCountTime11To14())
            .salesCountTime14To17(wire.salesCountTime14To17())
            .salesCountTime17To21(wire.salesCountTime17To21())
            .salesCountTime21To24(wire.salesCountTime21To24())
            .build();
    }

    private static CommercialSalesCountByGenderQueryResult toQueryResult(CommercialSalesCountByGenderClientResponse wire) {
        if (wire == null) {
            return null;
        }
        return CommercialSalesCountByGenderQueryResult.builder()
            .maleSalesCount(wire.maleSalesCount())
            .femaleSalesCount(wire.femaleSalesCount())
            .build();
    }

    private static CommercialFootTrafficByTimeSlotQueryResult toQueryResult(CommercialFootTrafficByTimeSlotClientResponse wire) {
        if (wire == null) {
            return null;
        }
        return CommercialFootTrafficByTimeSlotQueryResult.builder()
            .footTrafficTime00To06(wire.footTrafficTime00To06())
            .footTrafficTime06To11(wire.footTrafficTime06To11())
            .footTrafficTime11To14(wire.footTrafficTime11To14())
            .footTrafficTime14To17(wire.footTrafficTime14To17())
            .footTrafficTime17To21(wire.footTrafficTime17To21())
            .footTrafficTime21To24(wire.footTrafficTime21To24())
            .build();
    }

    private static CommercialFootTrafficByDayOfWeekQueryResult toQueryResult(CommercialFootTrafficByDayOfWeekClientResponse wire) {
        if (wire == null) {
            return null;
        }
        return CommercialFootTrafficByDayOfWeekQueryResult.builder()
            .mondayFootTraffic(wire.mondayFootTraffic())
            .tuesdayFootTraffic(wire.tuesdayFootTraffic())
            .wednesdayFootTraffic(wire.wednesdayFootTraffic())
            .thursdayFootTraffic(wire.thursdayFootTraffic())
            .fridayFootTraffic(wire.fridayFootTraffic())
            .saturdayFootTraffic(wire.saturdayFootTraffic())
            .sundayFootTraffic(wire.sundayFootTraffic())
            .build();
    }

    private static CommercialFootTrafficByAgeGroupQueryResult toQueryResult(CommercialFootTrafficByAgeGroupClientResponse wire) {
        if (wire == null) {
            return null;
        }
        return CommercialFootTrafficByAgeGroupQueryResult.builder()
            .age10FootTraffic(wire.age10FootTraffic())
            .age20FootTraffic(wire.age20FootTraffic())
            .age30FootTraffic(wire.age30FootTraffic())
            .age40FootTraffic(wire.age40FootTraffic())
            .age50FootTraffic(wire.age50FootTraffic())
            .age60PlusFootTraffic(wire.age60PlusFootTraffic())
            .build();
    }

    private static CommercialFootTrafficByAgeGenderPercentQueryResult toQueryResult(CommercialFootTrafficByAgeGenderPercentClientResponse wire) {
        if (wire == null) {
            return null;
        }
        return CommercialFootTrafficByAgeGenderPercentQueryResult.builder()
            .maleAge10Percent(wire.maleAge10Percent())
            .femaleAge10Percent(wire.femaleAge10Percent())
            .maleAge20Percent(wire.maleAge20Percent())
            .femaleAge20Percent(wire.femaleAge20Percent())
            .maleAge30Percent(wire.maleAge30Percent())
            .femaleAge30Percent(wire.femaleAge30Percent())
            .maleAge40Percent(wire.maleAge40Percent())
            .femaleAge40Percent(wire.femaleAge40Percent())
            .maleAge50Percent(wire.maleAge50Percent())
            .femaleAge50Percent(wire.femaleAge50Percent())
            .maleAge60PlusPercent(wire.maleAge60PlusPercent())
            .femaleAge60PlusPercent(wire.femaleAge60PlusPercent())
            .build();
    }

    private static CommercialAverageIncomeQueryResult toQueryResult(CommercialAverageIncomeClientResponse wire) {
        if (wire == null) {
            return null;
        }
        return CommercialAverageIncomeQueryResult.builder()
            .monthlyAverageIncomeAmount(wire.monthlyAverageIncomeAmount())
            .incomeBracketCode(wire.incomeBracketCode())
            .build();
    }

    private static CommercialExpenseByCategoryQueryResult toQueryResult(CommercialExpenseByCategoryClientResponse wire) {
        if (wire == null) {
            return null;
        }
        return CommercialExpenseByCategoryQueryResult.builder()
            .groceryExpenseAmount(wire.groceryExpenseAmount())
            .clothingExpenseAmount(wire.clothingExpenseAmount())
            .medicalExpenseAmount(wire.medicalExpenseAmount())
            .householdExpenseAmount(wire.householdExpenseAmount())
            .transportationExpenseAmount(wire.transportationExpenseAmount())
            .leisureExpenseAmount(wire.leisureExpenseAmount())
            .cultureExpenseAmount(wire.cultureExpenseAmount())
            .educationExpenseAmount(wire.educationExpenseAmount())
            .entertainmentExpenseAmount(wire.entertainmentExpenseAmount())
            .build();
    }

    private static CommercialSchoolCountQueryResult toQueryResult(CommercialSchoolCountClientResponse wire) {
        if (wire == null) {
            return null;
        }
        return CommercialSchoolCountQueryResult.builder()
            .elementarySchoolCount(wire.elementarySchoolCount())
            .middleSchoolCount(wire.middleSchoolCount())
            .highSchoolCount(wire.highSchoolCount())
            .universityCount(wire.universityCount())
            .totalSchoolCount(wire.totalSchoolCount())
            .build();
    }

    private static CommercialResidentPopulationByAgeQueryResult toQueryResult(CommercialResidentPopulationByAgeClientResponse wire) {
        if (wire == null) {
            return null;
        }
        return CommercialResidentPopulationByAgeQueryResult.builder()
            .totalResidentPopulation(wire.totalResidentPopulation())
            .age10ResidentPopulation(wire.age10ResidentPopulation())
            .age20ResidentPopulation(wire.age20ResidentPopulation())
            .age30ResidentPopulation(wire.age30ResidentPopulation())
            .age40ResidentPopulation(wire.age40ResidentPopulation())
            .age50ResidentPopulation(wire.age50ResidentPopulation())
            .age60PlusResidentPopulation(wire.age60PlusResidentPopulation())
            .build();
    }
}
