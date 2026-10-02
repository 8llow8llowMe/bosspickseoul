package com.followfollowme.bosspickseoul.domainlayer.commercial.application.service.processor;

import com.followfollowme.bosspickseoul.domainlayer.administration.domain.model.StoreAdministration;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.comparison.CommercialSalesPerStoreSummaryInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.summary.CommercialSalesSummaryInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.CommercialSummaryRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.StoreCommercial;
import com.followfollowme.bosspickseoul.domainlayer.district.domain.model.StoreDistrict;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CommercialSalesPerStoreProcessor {

    private final CommercialSummaryRepositoryPort commercialSummaryRepositoryPort;

    /**
     * 이미 읽은 매출 요약 세 단위에 같은 업종의 점포 수를 붙여 점포당 평균 매출 지수를 만든다(이슈 #485). 점포 조회는 단위마다 한 번,
     * 모두 세 번이다. 지역 코드는 매출 요약 leg 의 것을 써서 매출과 점포가 같은 단위를 가리킨다.
     *
     * <p>점포 행이 없으면 404 로 끊지 않고 그 단위의 점포 수만 null 로 둔다. 개발 DB 20261 실측에서는 매출 행마다 점포 행이 있었지만,
     * 두 데이터셋의 적재가 어긋난 분기에 이미 성립한 매출 벤치마크까지 실패시키지 않기 위해서다. 점포 행은 있는데 점포 수가 0 인 단위
     * (같은 실측에서 상권 519행, 행정동 94행)는 점포당 매출이 null 이다. 계산은 {@link CommercialSalesPerStoreSummaryInfo#of} 에 있다.
     *
     * <p>세 조회를 한 읽기 트랜잭션으로 묶는다. 이 트랜잭션 안에는 DB 조회만 있다. 지역 해석 Feign 은 앞에서, 소비 사다리의 추가 해석은 뒤에서 — 둘 다 트랜잭션 밖에서
     * 일어나므로 원격 응답을 기다리며 커넥션을 쥐지 않는다(architecture-guide §3). 예외를 삼키지 않으므로 rollback-only 함정도 없다.
     */
    @Transactional(readOnly = true)
    public CommercialSalesPerStoreSummaryInfo getSalesPerStore(String periodCode, String serviceCode, CommercialSalesSummaryInfo salesSummary) {
        Long districtStoreCount = commercialSummaryRepositoryPort
            .findStoreDistrict(periodCode, salesSummary.district().code(), serviceCode)
            .map(StoreDistrict::similarStoreCount)
            .orElse(null);
        Long administrationStoreCount = commercialSummaryRepositoryPort
            .findStoreAdministration(periodCode, salesSummary.administration().code(), serviceCode)
            .map(StoreAdministration::similarStoreCount)
            .orElse(null);
        Long commercialStoreCount = commercialSummaryRepositoryPort
            .findStoreCommercial(periodCode, salesSummary.commercial().code(), serviceCode)
            .map(StoreCommercial::similarStoreCount)
            .orElse(null);

        return CommercialSalesPerStoreSummaryInfo.of(salesSummary, districtStoreCount, administrationStoreCount, commercialStoreCount);
    }
}
