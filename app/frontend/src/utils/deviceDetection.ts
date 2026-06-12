const MOUSE_INTERACTION_MEDIA_QUERY = '(hover: hover) and (pointer: fine)';

/** ホバーと細かいポインター操作を前提にできるUIだけを有効化するため、CSS Media Queriesで判定する。 */
export function supportsMouseInteraction(): boolean {
  return window.matchMedia(MOUSE_INTERACTION_MEDIA_QUERY).matches;
}

/** タッチ向けUIへ切り替える判断を、マウス操作に適した環境かどうかの反転として統一する。 */
export function isTouchDevice(): boolean {
  return !supportsMouseInteraction();
}

/** 主入力方式ではなくタッチイベントAPIの有無だけを知りたい箇所向けに、低レベルな判定を分けている。 */
export function hasTouchSupport(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

export interface DeviceCapabilities {
  /** ホバーと細かいポインター操作を前提にできるかどうか。 */
  supportsMouseInteraction: boolean;
  /** タッチ向けUIへ切り替えるべきかどうか。 */
  isTouchDevice: boolean;
  /** タッチイベントAPIを利用できるかどうか。 */
  hasTouchSupport: boolean;
}

/** 同じタイミングで複数のデバイス能力を参照する箇所が、判定関数を個別に呼ばずに済むよう集約する。 */
export function getDeviceCapabilities(): DeviceCapabilities {
  return {
    supportsMouseInteraction: supportsMouseInteraction(),
    isTouchDevice: isTouchDevice(),
    hasTouchSupport: hasTouchSupport(),
  };
}
