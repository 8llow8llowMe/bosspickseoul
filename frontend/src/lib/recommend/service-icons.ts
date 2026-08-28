import {
  Beer,
  Bike,
  Briefcase,
  Building2,
  Car,
  Coffee,
  Croissant,
  Drumstick,
  Dumbbell,
  Fish,
  Glasses,
  GraduationCap,
  Hamburger,
  Languages,
  Mic,
  Monitor,
  Paintbrush,
  Palette,
  PawPrint,
  Pill,
  Salad,
  Scale,
  Scissors,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Soup,
  Sparkles,
  Store,
  UtensilsCrossed,
  WashingMachine,
  type LucideIcon,
} from 'lucide-react'

/**
 * 업종 아이콘. **폴백을 먼저 만들고 그 위에 개별 매핑을 얹는다.**
 *
 * 추천 응답의 「비어 있는 업종」에는 정적 카탈로그(31개) **밖의 코드가 온다** —
 * 실제로 관측된 것만도 변호사사무소·기타법무서비스·법무사사무소·인테리어·피부관리실
 * 같은 것들이고, 백엔드 서비스 코드가 전부 몇 개인지 FE 는 모른다. 그래서 코드 앞
 * 3자리(대분류)로 먼저 아이콘을 정해 **어떤 코드가 와도 빈칸이 없게** 한다.
 *
 * 아이콘은 **장식이다.** 이름 옆의 보조 신호일 뿐이라 아이콘만으로 업종을 식별하게
 * 하지 않는다(호출부에서 `aria-hidden`).
 */

/** 대분류 폴백 — CS1 음식점 / CS2 서비스 / CS3 도소매. */
const CATEGORY_ICONS: Readonly<Record<string, LucideIcon>> = {
  CS1: UtensilsCrossed,
  CS2: Briefcase,
  CS3: ShoppingBag,
}

/** 대분류조차 모를 때. 「업종」이라는 뜻만 남긴다. */
const UNKNOWN_ICON: LucideIcon = Store

const SERVICE_ICONS: Readonly<Record<string, LucideIcon>> = {
  // 음식점
  CS100001: Soup, // 한식음식점
  CS100002: Soup, // 중식음식점
  CS100003: Fish, // 일식음식점
  CS100004: UtensilsCrossed, // 양식음식점
  CS100005: Croissant, // 제과점
  CS100006: Hamburger, // 패스트푸드점
  CS100007: Drumstick, // 치킨전문점
  CS100008: Salad, // 분식전문점
  CS100009: Beer, // 호프-간이주점
  CS100010: Coffee, // 커피-음료
  // 학원·레저
  CS200001: GraduationCap, // 일반교습학원
  CS200002: Languages, // 외국어학원
  CS200003: Palette, // 예술학원
  CS200005: Dumbbell, // 스포츠 강습
  CS200019: Monitor, // PC방
  CS200037: Mic, // 노래방
  // 서비스
  CS200010: Scale, // 변호사사무소
  CS200012: Scale, // 법무사사무소
  CS200013: Scale, // 기타법무서비스
  CS200025: Car, // 자동차수리
  CS200028: Scissors, // 미용실
  CS200030: Sparkles, // 피부관리실
  CS200031: WashingMachine, // 세탁소
  CS200033: Building2, // 부동산중개업
  CS200034: Building2, // 여관
  // 도소매·생활용품
  CS300001: ShoppingCart, // 슈퍼마켓
  CS300002: Store, // 편의점
  CS300007: Fish, // 수산물판매
  CS300010: Shirt, // 일반의류
  CS300016: Glasses, // 안경
  CS300018: Pill, // 의약품
  CS300022: Sparkles, // 화장품
  CS300025: Bike, // 자전거 및 기타운송장비
  CS300029: PawPrint, // 애완동물
  CS300035: Paintbrush, // 인테리어
}

/**
 * 어떤 코드가 와도 아이콘을 돌려준다. 개별 매핑 → 대분류 폴백 → 「업종」 순이다.
 * 매핑 없는 업종만 아이콘 없이 덜렁 남는 화면을 만들지 않는 것이 핵심이다.
 */
export const resolveServiceIcon = (serviceCode: unknown): LucideIcon => {
  if (typeof serviceCode !== 'string') return UNKNOWN_ICON

  const code = serviceCode.trim()
  if (!code) return UNKNOWN_ICON

  return SERVICE_ICONS[code] ?? CATEGORY_ICONS[code.slice(0, 3)] ?? UNKNOWN_ICON
}
