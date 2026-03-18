package com.followfollowme.nowdoboss.domainlayer.community.adapter.out.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Comment;

@Entity
@Getter
@Table(name = "area_commercial")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PROTECTED)
@Comment("상권 영역 참조")
public class AreaCommercialReferenceEntity {

    @Id
    @Comment("상권 영역 아이디")
    private Long id;

    @Column(nullable = false, length = 8)
    @Comment("상권 코드")
    private String commercialCode;

    @Column(nullable = false, length = 80)
    @Comment("상권 코드명")
    private String commercialCodeName;

    @Column(nullable = false, length = 5)
    @Comment("자치구 코드")
    private String districtCode;

    @Column(nullable = false, length = 10)
    @Comment("자치구 코드명")
    private String districtCodeName;

    @Column(nullable = false, length = 10)
    @Comment("행정동 코드")
    private String administrationCode;

    @Column(nullable = false, length = 20)
    @Comment("행정동 코드명")
    private String administrationCodeName;
}
