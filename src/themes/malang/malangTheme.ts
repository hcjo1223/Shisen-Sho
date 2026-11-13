/**
 * 말랑 파스텔 (Malang Pastel) Astryx Theme
 *
 * 폭신폭신 따뜻한 피치-크림 뉴트럴과 말랑 코랄 액센트,
 * Jua 디스플레이·제목 서체와 Gowun Dodum 본문 서체로 구성한 게임 전용 테마.
 */

import {defineTheme, defineSyntaxTheme} from '@astryxdesign/core/theme';
import {palette} from './malang.palette';

const {
  accent,
  blue,
  cyan,
  green,
  neutral,
  orange,
  pink,
  purple,
  red,
  teal,
  yellow,
} = palette;

const withAlpha = (color: string, alpha: string): string => `${color}${alpha}`;
const lightDark = (light: string, dark: string): string =>
  `light-dark(${light}, ${dark})`;

const malangSyntax = defineSyntaxTheme({
  name: 'astryx-malang',
  tokens: {
    keyword: [purple.light[30], purple.dark[75]],
    string: [green.light[30], green.dark[75]],
    comment: [neutral.light[45], neutral.dark[65]],
    number: [orange.light[30], orange.dark[80]],
    function: [blue.light[35], blue.dark[75]],
    type: [purple.light[30], purple.dark[75]],
    variable: [neutral.light[15], neutral.dark[85]],
    operator: [neutral.light[40], neutral.dark[70]],
    constant: [orange.light[30], orange.dark[80]],
    tag: [accent.light[40], accent.dark[85]],
    attribute: [yellow.light[35], yellow.dark[80]],
    property: [teal.light[30], teal.dark[75]],
    punctuation: [neutral.light[45], neutral.dark[65]],
    background: [neutral.light[95], neutral.dark[10]],
  },
});

export const malangTheme = defineTheme({
  name: 'malang',

  typography: {
    scale: {base: 14, ratio: 1.2},
    body: {
      family: 'Gowun Dodum',
      fallbacks:
        'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },
    heading: {
      family: 'Jua',
      fallbacks: '"Gowun Dodum", system-ui, sans-serif',
      weights: {1: 'normal', 2: 'normal', 3: 'normal', 4: 'normal'},
    },
    code: {
      family: 'JetBrains Mono',
      fallbacks: '"SF Mono", Monaco, Consolas, monospace',
    },
  },

  adaptations: {
    rules: [
      {
        when: {pointer: 'coarse', width: {below: 'lg'}},
        value: {typography: {scale: {base: 16, ratio: 1.185}}},
      },
    ],
  },

  radius: {base: 4, multiplier: 1.5},

  motion: {
    tempo: 0.95,
    character: 'expressive',
    fast: 130,
    medium: 280,
    slow: 640,
    ratio: 0.78,
  },

  syntax: malangSyntax,

  tokens: {
    // Core semantic
    '--color-accent': [accent.light[40], accent.dark[85]],
    '--color-accent-muted': [
      withAlpha(accent.light[40], '24'),
      withAlpha(accent.dark[85], '2e'),
    ],
    '--color-neutral': [
      withAlpha(neutral.light[15], '0f'),
      withAlpha(neutral.dark[90], '1a'),
    ],
    '--color-background-surface': ['#fffdfb', neutral.dark[15]],
    '--color-background-body': [neutral.light[95], neutral.dark[10]],
    '--color-overlay': [
      withAlpha(neutral.light[15], '66'),
      withAlpha(neutral.dark[5], 'b3'),
    ],
    '--color-overlay-hover': [
      withAlpha(neutral.light[15], '0c'),
      withAlpha(neutral.dark[90], '0e'),
    ],
    '--color-overlay-pressed': [
      withAlpha(neutral.light[15], '18'),
      withAlpha(neutral.dark[90], '1c'),
    ],
    '--color-background-muted': [neutral.light[90], neutral.dark[20]],

    // Text
    '--color-text-primary': [neutral.light[15], neutral.dark[90]],
    '--color-text-secondary': [neutral.light[45], neutral.dark[70]],
    '--color-text-disabled': [neutral.light[65], neutral.dark[45]],
    '--color-text-accent': [accent.light[35], accent.dark[85]],
    '--color-on-dark': neutral.light[100],
    '--color-on-light': neutral.light[15],
    '--color-on-accent': [neutral.light[100], neutral.dark[5]],

    // Status fills & content
    '--color-info': [blue.light[45], blue.dark[75]],
    '--color-info-muted': 'var(--color-background-blue)',
    '--color-on-info': [neutral.light[100], blue.dark[10]],
    '--color-success': [green.light[40], green.dark[70]],
    '--color-success-muted': [green.light[90], green.dark[20]],
    '--color-on-success': [neutral.light[100], green.dark[10]],
    '--color-warning': [yellow.light[55], yellow.dark[80]],
    '--color-warning-muted': [yellow.light[90], yellow.dark[20]],
    '--color-on-warning': [neutral.light[15], yellow.dark[10]],
    '--color-error': [red.light[45], red.dark[75]],
    '--color-error-muted': [red.light[90], red.dark[20]],
    '--color-on-error': [neutral.light[100], red.dark[10]],

    '--color-text-info': [blue.light[30], blue.dark[80]],
    '--color-text-success': [green.light[25], green.dark[80]],
    '--color-text-warning': [yellow.light[25], yellow.dark[85]],
    '--color-text-error': [red.light[25], red.dark[85]],
    '--color-on-info-muted': [blue.light[25], blue.dark[85]],
    '--color-on-success-muted': [green.light[25], green.dark[85]],
    '--color-on-warning-muted': [yellow.light[25], yellow.dark[85]],
    '--color-on-error-muted': [red.light[25], red.dark[85]],

    // Icon
    '--color-icon-accent': [accent.light[40], accent.dark[85]],
    '--color-icon-primary': [neutral.light[15], neutral.dark[90]],
    '--color-icon-secondary': [neutral.light[45], neutral.dark[70]],
    '--color-icon-disabled': [neutral.light[65], neutral.dark[45]],

    // Surface variants
    '--color-background-card': ['#fffdfb', neutral.dark[15]],
    '--color-background-popover': ['#fffdfb', neutral.dark[20]],
    '--color-background-inverted': [neutral.light[15], neutral.dark[95]],
    '--color-background-error-inverted': [red.light[35], red.dark[65]],

    // Borders
    '--color-border': [neutral.light[85], withAlpha(neutral.dark[90], '22')],
    '--color-border-emphasized': [neutral.light[75], neutral.dark[35]],

    // Effects
    '--color-skeleton': [neutral.light[85], neutral.dark[30]],
    '--color-track': [neutral.light[80], neutral.dark[35]],
    '--color-shadow': [
      withAlpha('#a66856', '24'),
      withAlpha(neutral.dark[0], '55'),
    ],
    '--color-tint-hover': [neutral.light[15], neutral.dark[95]],

    // Control sizes
    '--size-element-sm': '32px',
    '--size-element-md': '38px',
    '--size-element-lg': '46px',

    // Categorical families
    '--color-background-blue': [blue.light[90], blue.dark[90]],
    '--color-border-blue': [blue.light[80], blue.dark[80]],
    '--color-icon-blue': [blue.light[25], blue.dark[25]],
    '--color-text-blue': [blue.light[25], blue.dark[25]],

    '--color-background-cyan': [cyan.light[90], cyan.dark[90]],
    '--color-border-cyan': [cyan.light[80], cyan.dark[80]],
    '--color-icon-cyan': [cyan.light[25], cyan.dark[25]],
    '--color-text-cyan': [cyan.light[25], cyan.dark[25]],

    '--color-background-gray': [neutral.light[90], neutral.dark[85]],
    '--color-border-gray': [neutral.light[80], neutral.dark[75]],
    '--color-icon-gray': [neutral.light[25], neutral.dark[25]],
    '--color-text-gray': [neutral.light[25], neutral.dark[25]],

    '--color-background-green': [green.light[90], green.dark[90]],
    '--color-border-green': [green.light[80], green.dark[80]],
    '--color-icon-green': [green.light[25], green.dark[25]],
    '--color-text-green': [green.light[25], green.dark[25]],

    '--color-background-orange': [orange.light[90], orange.dark[90]],
    '--color-border-orange': [orange.light[80], orange.dark[80]],
    '--color-icon-orange': [orange.light[25], orange.dark[25]],
    '--color-text-orange': [orange.light[25], orange.dark[25]],

    '--color-background-pink': [pink.light[90], pink.dark[90]],
    '--color-border-pink': [pink.light[80], pink.dark[80]],
    '--color-icon-pink': [pink.light[25], pink.dark[25]],
    '--color-text-pink': [pink.light[25], pink.dark[25]],

    '--color-background-purple': [purple.light[90], purple.dark[90]],
    '--color-border-purple': [purple.light[80], purple.dark[80]],
    '--color-icon-purple': [purple.light[25], purple.dark[25]],
    '--color-text-purple': [purple.light[25], purple.dark[25]],

    '--color-background-red': [red.light[90], red.dark[90]],
    '--color-border-red': [red.light[80], red.dark[80]],
    '--color-icon-red': [red.light[25], red.dark[25]],
    '--color-text-red': [red.light[25], red.dark[25]],

    '--color-background-teal': [teal.light[90], teal.dark[90]],
    '--color-border-teal': [teal.light[80], teal.dark[80]],
    '--color-icon-teal': [teal.light[25], teal.dark[25]],
    '--color-text-teal': [teal.light[25], teal.dark[25]],

    '--color-background-yellow': [yellow.light[90], yellow.dark[90]],
    '--color-border-yellow': [yellow.light[80], yellow.dark[80]],
    '--color-icon-yellow': [yellow.light[25], yellow.dark[25]],
    '--color-text-yellow': [yellow.light[25], yellow.dark[25]],

    // Rounded playful radii (--radius-none & --radius-full remain unscaled)
    '--radius-none': '0px',
    '--radius-inner': '8px',
    '--radius-element': '14px',
    '--radius-container': '20px',
    '--radius-page': '28px',
    '--radius-chat': '24px',
    '--radius-full': '9999px',

    // Soft tactile warm shadows
    '--shadow-low': `0 2px 0 ${lightDark(neutral.light[85], neutral.dark[25])}, 0 4px 12px ${lightDark(withAlpha('#a66856', '1a'), withAlpha(neutral.dark[0], '40'))}`,
    '--shadow-med': `0 3px 0 ${lightDark(neutral.light[85], neutral.dark[25])}, 0 8px 20px ${lightDark(withAlpha('#a66856', '24'), withAlpha(neutral.dark[0], '55'))}`,
    '--shadow-high': `0 5px 0 ${lightDark(neutral.light[85], neutral.dark[25])}, 0 18px 36px ${lightDark(withAlpha('#4a3b39', '33'), withAlpha(neutral.dark[0], '66'))}`,
    '--shadow-inset-hover': `inset 0 0 0 2px ${lightDark(withAlpha(accent.light[40], '30'), withAlpha(accent.dark[85], '38'))}`,
    '--shadow-inset-selected': `inset 0 0 0 2px ${lightDark(accent.light[40], accent.dark[85])}`,
    '--shadow-inset-success': `inset 0 0 0 2px ${withAlpha(green.light[40], '40')}`,
    '--shadow-inset-warning': `inset 0 0 0 2px ${withAlpha(yellow.light[45], '40')}`,
    '--shadow-inset-error': `inset 0 0 0 2px ${withAlpha(red.light[40], '40')}`,
  },

  components: {
    button: {
      base: {
        borderRadius: '9999px',
        fontFamily: 'var(--font-family-heading)',
      },
      'variant:primary': {
        boxShadow: `0 3px 0 ${lightDark(accent.light[25], accent.dark[55])}, 0 6px 14px ${lightDark(withAlpha(accent.light[40], '40'), withAlpha(neutral.dark[0], '45'))}`,
      },
      'variant:secondary': {
        backgroundColor: 'var(--color-background-surface)',
        borderWidth: '1.5px',
        borderStyle: 'solid',
        borderColor: 'var(--color-border-emphasized)',
        color: 'var(--color-text-primary)',
        boxShadow: `0 2px 0 ${lightDark(neutral.light[85], neutral.dark[25])}`,
      },
    },
    card: {
      base: {
        borderRadius: 'var(--radius-container)',
        borderWidth: '1.5px',
        borderStyle: 'solid',
        borderColor: 'var(--color-border)',
      },
    },
    'selectable-card': {
      base: {
        borderRadius: 'var(--radius-container)',
        boxShadow: `0 2px 0 ${lightDark(neutral.light[85], neutral.dark[25])}`,
      },
      selected: {
        backgroundColor: lightDark('#fff8f6', neutral.dark[20]),
        boxShadow: `0 3px 0 ${lightDark(accent.light[40], accent.dark[65])}`,
      },
    },
    'clickable-card': {
      base: {
        borderRadius: 'var(--radius-container)',
        boxShadow: `0 2px 0 ${lightDark(neutral.light[85], neutral.dark[25])}`,
      },
    },
    dialog: {
      base: {
        borderRadius: '28px',
      },
    },
    toast: {
      base: {
        borderRadius: '9999px',
      },
    },
  },
});

export default malangTheme;
