/**
 * 좁은 모바일 화면(iPhone 15 Pro 등)에서 토큰·배지·아이콘이
 * flex 행 안에서 줄어들며 말줄임(`...`)으로 잘리는 현상을 막는 공용 StyleX 규칙.
 */
import * as stylex from '@stylexjs/stylex';

export const layoutStyles = stylex.create({
  noShrink: {
    flexShrink: 0,
  },
});
