package com.followfollowme.nowdoboss.domainlayer.administration.adapter.out.persistence.entity;

import com.followfollowme.nowdoboss.domainlayer.commercial.domain.enums.ServiceType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Comment;

@Entity
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PROTECTED)
@Table(
    name = "store_administration",
    indexes = {
        @Index(name = "idx_store_administration_period_code", columnList = "periodCode"),
        @Index(name = "idx_store_administration_administration_code", columnList = "administrationCode"),
        @Index(name = "idx_store_administration_service_code", columnList = "serviceCode")
    })
public class StoreAdministrationEntity {

    @Id
    @Comment("점포_행정동 아이디")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Comment("기준 년분기 코드")
    @Column(length = 5, nullable = false)
    private String periodCode;

    @Comment("행정동 코드")
    @Column(length = 10, nullable = false)
    private String administrationCode;

    @Comment("행정동 코드명")
    @Column(length = 20, nullable = false)
    private String administrationCodeName;

    @Comment("서비스 업종 코드")
    @Column(length = 8, nullable = false)
    private String serviceCode;

    @Comment("서비스 업종 코드명")
    @Column(length = 20, nullable = false)
    private String serviceCodeName;

    @Comment("서비스 업종 타입")
    @Enumerated(EnumType.STRING)
    private ServiceType serviceType;

    @Comment("점포 수")
    private Long totalStore;

    @Comment("유사 업종 점포 수")
    private Long similarStore;

    @Comment("개업 점포 수")
    private Long openedStore;

    @Comment("폐업 점포 수")
    private Long closedStore;

    @Comment("프랜차이즈 점포 수")
    private Long franchiseStore;

    @Comment("개업률")
    private Double openedRate;

    @Comment("폐업률")
    private Double closedRate;
}
