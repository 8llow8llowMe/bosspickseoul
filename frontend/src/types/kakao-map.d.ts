declare global {
  type KakaoMapLatLng = {
    getLat(): number
    getLng(): number
  }

  type KakaoMapLatLngBounds = {
    extend(position: KakaoMapLatLng): void
    getSouthWest(): KakaoMapLatLng
    getNorthEast(): KakaoMapLatLng
  }

  type KakaoMapPoint = {
    x: number
    y: number
  }

  type KakaoMapProjection = {
    /** 지도 컨테이너 왼쪽 위 기준 화면 좌표(px). 라벨 충돌 판정에 쓴다. */
    containerPointFromCoords(position: KakaoMapLatLng): KakaoMapPoint
  }

  type KakaoMapInstance = {
    getBounds(): KakaoMapLatLngBounds
    getProjection(): KakaoMapProjection
    getCenter(): KakaoMapLatLng
    getLevel(): number
    setLevel(level: number): void
    relayout(): void
    getNode(): HTMLElement
    /**
     * 패딩은 px 단위다. 지도 위에 떠 있는 패널을 피해 카메라를 맞출 때 쓴다.
     * 생략하면 카카오 기본 여백(32px)이 적용된다.
     */
    setBounds(
      bounds: KakaoMapLatLngBounds,
      paddingTop?: number,
      paddingRight?: number,
      paddingBottom?: number,
      paddingLeft?: number,
    ): void
    setCenter(position: KakaoMapLatLng): void
  }

  type KakaoMapPolygon = {
    setMap(map: KakaoMapInstance | null): void
    setOptions(options: {
      strokeColor?: string
      strokeWeight?: number
      strokeOpacity?: number
      fillColor?: string
      fillOpacity?: number
    }): void
    setZIndex(zIndex: number): void
  }

  type KakaoMapCustomOverlay = {
    setMap(map: KakaoMapInstance | null): void
    setZIndex(zIndex: number): void
  }

  /** `zoom_changed` 는 레벨이 바뀌는 즉시(애니메이션 전) 온다. 투영도 그때 이미 새 레벨이다. */
  type KakaoMapEventType =
    'click' | 'idle' | 'mouseover' | 'mouseout' | 'zoom_changed'

  /** 장소 검색 결과 한 건. 좌표는 문자열이다(x = 경도, y = 위도). */
  type KakaoPlaceDocument = {
    id: string
    place_name: string
    category_name?: string
    category_group_code?: string
    address_name?: string
    road_address_name?: string
    x: string
    y: string
  }

  type KakaoServicesStatus = 'OK' | 'ZERO_RESULT' | 'ERROR'

  /**
   * `libraries=services` 로 실은 장소 검색(#596). 로더가 그 파라미터를 붙이므로 지도와 같은
   * 스크립트 한 벌에 들어 있다.
   */
  type KakaoMapServices = {
    Status: Record<KakaoServicesStatus, KakaoServicesStatus>
    Places: new () => {
      keywordSearch(
        keyword: string,
        callback: (
          data: KakaoPlaceDocument[],
          status: KakaoServicesStatus,
        ) => void,
        options?: {
          /** 「왼쪽 경도,아래 위도,오른쪽 경도,위 위도」 */
          rect?: string
          size?: number
          page?: number
        },
      ): void
    }
  }

  type KakaoMapsNamespace = {
    load(callback: () => void): void
    /** `libraries=services` 가 실려야 생긴다. 없으면 장소 검색을 건너뛴다. */
    services?: KakaoMapServices
    Map: new (
      container: HTMLElement,
      options: {
        center: KakaoMapLatLng
        level?: number
      },
    ) => KakaoMapInstance
    LatLng: new (latitude: number, longitude: number) => KakaoMapLatLng
    LatLngBounds: new () => KakaoMapLatLngBounds
    Polygon: new (options: {
      map?: KakaoMapInstance
      path: KakaoMapLatLng[]
      strokeWeight?: number
      strokeColor?: string
      strokeOpacity?: number
      fillColor?: string
      fillOpacity?: number
      clickable?: boolean
    }) => KakaoMapPolygon
    CustomOverlay: new (options: {
      map?: KakaoMapInstance
      position: KakaoMapLatLng
      content: Node
      xAnchor?: number
      yAnchor?: number
      zIndex?: number
      clickable?: boolean
    }) => KakaoMapCustomOverlay
    event: {
      addListener(
        target: object,
        type: KakaoMapEventType,
        handler: () => void,
      ): void
      removeListener(
        target: object,
        type: KakaoMapEventType,
        handler: () => void,
      ): void
      preventMap(): void
    }
  }

  type KakaoMapSdk = {
    maps: KakaoMapsNamespace
  }

  interface Window {
    kakao?: KakaoMapSdk
  }
}

export {}
