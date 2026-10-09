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

  type KakaoMapsNamespace = {
    load(callback: () => void): void
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
