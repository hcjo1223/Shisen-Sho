/**
 * 서비스 워커 등록 + 새 버전 즉시 적용.
 *
 * 서비스 워커는 새 버전을 받으면 바로 활성화된다(skipWaiting·clientsClaim).
 * 하지만 이미 열려 있는 페이지는 이전 코드로 계속 돌기 때문에, 그대로 두면
 * 다음 실행 때에야 새 버전이 보인다. 그래서 서비스 워커가 바뀐 것을 감지하면
 * 안전한 시점(게임 중이 아닐 때)에 새로고침해 바로 적용한다.
 * 진행 중인 판은 자동 저장되므로 홈의 '이어하기'로 계속할 수 있다.
 * (코드는 한 파일로 묶어 빌드하므로, 교체 직후에도 이전 페이지가 깨지지 않는다)
 */

let updateReady = false;
let reloading = false;
let isSafeNow: () => boolean = () => true;

function reloadOnce(): void {
  if (reloading) return;
  reloading = true;
  window.location.reload();
}

export function initPwaUpdate(isSafe: () => boolean): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  if (import.meta.env.DEV) return;
  isSafeNow = isSafe;

  // 처음 설치되어 페이지를 넘겨받을 때(이전 서비스 워커 없음)는 새로고침할 필요가 없다.
  // 그 뒤의 교체부터가 새 버전이다.
  let controlled = navigator.serviceWorker.controller != null;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!controlled) {
      controlled = true;
      return;
    }
    updateReady = true;
    if (isSafeNow()) reloadOnce();
  });

  const register = () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, {scope: import.meta.env.BASE_URL})
      .then(registration => {
        // 홈 화면 앱은 오래 켜져 있으므로, 다시 열 때마다 새 버전을 확인한다
        document.addEventListener('visibilitychange', () => {
          if (!document.hidden) void registration.update().catch(() => undefined);
        });
      })
      .catch(() => undefined);
  };
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, {once: true});
}

/** 게임 화면을 벗어나는 등 안전한 시점에 호출: 받아 둔 새 버전이 있으면 적용한다. */
export function applyPendingUpdate(): void {
  if (updateReady) reloadOnce();
}
