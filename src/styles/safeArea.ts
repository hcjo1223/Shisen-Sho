/**
 * iPhone 안전 영역(safe area) 여백.
 * 홈 화면에 추가한 앱(standalone)은 상태 표시줄·홈 인디케이터 영역까지 화면이 채워지므로
 * 그만큼 위아래를 띄우고, 앱 모드에서는 숨 쉴 여백을 조금 더 준다.
 */
import * as stylex from '@stylexjs/stylex';
import {spacingVars} from '@astryxdesign/core/theme/tokens.stylex';

export const safeAreaStyles = stylex.create({
  screen: {
    boxSizing: 'border-box',
    paddingTop: {
      default: 'env(safe-area-inset-top, 0px)',
      '@media (display-mode: standalone)': `calc(env(safe-area-inset-top, 0px) + ${spacingVars['--spacing-3']})`,
    },
    paddingBottom: {
      default: 'env(safe-area-inset-bottom, 0px)',
      '@media (display-mode: standalone)': `max(env(safe-area-inset-bottom, 0px), ${spacingVars['--spacing-3']})`,
    },
    paddingLeft: 'env(safe-area-inset-left, 0px)',
    paddingRight: 'env(safe-area-inset-right, 0px)',
  },
});
