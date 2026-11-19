/**
 * themes.js — 게임 테마 프리셋 (과일 농장 / 동물 친구들 / 포켓몬 1세대 / 디지몬 어드벤처)
 * 각 타일 값(1..N)은 아래 배열의 인덱스+1 로 매핑된다. 0 은 빈 칸.
 */
(function (root) {
  const THEMES = {
    fruit: {
      name: '과일 농장',
      icon: '🍓',
      tiles: ['🍎', '🍓', '🍊', '🍋', '🍌', '🍉', '🍇', '🍑', '🍒', '🍍', '🥝', '🥑',
              '🍐', '🥥', '🫐', '🍈', '🥕', '🌽', '🍆', '🥦', '🍄', '🌰', '🥜', '🫑',
              '🍅', '🥔', '🧄', '🥒', '🫛', '🥭', '🍠', '🧅', '🥬', '🍏', '🌶️', '🫒'],
      tints: [
        '#ffe4e6', '#ffedd5', '#fef3c7', '#fce7f3', '#fee2e2', '#ffedd5',
        '#fef9c3', '#ecfccb', '#fae8ff', '#e0f2fe', '#d1fae5', '#fde68a',
      ],
      sparkles: ['🍓', '🍑', '🍒', '🍊', '✨', '💖'],
    },
    animal: {
      name: '동물 친구들',
      icon: '🐶',
      tiles: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐸',
              '🐷', '🐮', '🐵', '🐔', '🐧', '🐤', '🦄', '🐝', '🐞', '🦋', '🐢', '🐙',
              '🐳', '🐬', '🦀', '🦔', '🦦', '🦥', '🐺', '🐗', '🐴', '🦉', '🦩', '🦭'],
      tints: [
        '#dcfce7', '#ecfccb', '#fef3c7', '#d1fae5', '#e0f2fe', '#ffedd5',
        '#fce7f3', '#f3e8ff', '#cffafe', '#fef9c3', '#e2f3e3', '#f5f5f4',
      ],
      sparkles: ['🐾', '🍀', '🌿', '🌼', '✨', '💚'],
    },
    pokemon: {
      name: '포켓몬 1세대',
      icon: '⚡',
      kind: 'sprite',
      spriteCols: 6,
      spriteRows: 6,
      tiles: ['피카츄', '이상해씨', '파이리', '꼬부기', '푸린', '나옹',
              '고라파덕', '팬텀', '잠만보', '이브이', '메타몽', '뮤',
              '식스테일', '가디', '발챙이', '야돈', '코일', '찌리리공',
              '고오스', '또가스', '뚜벅쵸', '디그다', '캐이시', '꼬마돌',
              '탕구리', '쏘드라', '잉어킹', '라프라스', '폴리곤', '암나이트',
              '미뇽', '망나뇽', '갸라도스', '뮤츠', '알통몬', '셀러'],
      tints: [
        '#fef08a', '#bbf7d0', '#fed7aa', '#bae6fd', '#fbcfe8', '#fef3c7',
        '#fde68a', '#e9d5ff', '#cbd5e1', '#fed7aa', '#f5d0fe', '#fce7f3',
      ],
      sparkles: ['⚡', '✨', '🌟', '🔥', '💧', '🍃'],
    },
    digimon: {
      name: '디지몬 어드벤처',
      icon: '💠',
      kind: 'sprite',
      spriteCols: 6,
      spriteRows: 6,
      tiles: ['아구몬', '파피몬', '피요몬', '텐타몬', '팔몬', '쉬라몬',
              '파닥몬', '테일몬', '디지바이스', '그레이몬', '가루몬', '버드라몬',
              '카부테리몬', '니드몬', '엔젤몬', '엔젤우몬', '워그레이몬', '메탈가루몬',
              '브이몬', '추추몬', '길몬', '레나몬', '테리어몬', '데블몬',
              '에테몬', '피에몬', '메탈시드라몬', '코로몬', '뿔몬', '깜몬',
              '임프몬', '누메몬', '퍼펫몬', '오메가몬', '베르제브몬', '몬자에몬'],
      tints: [
        '#fed7aa', '#bae6fd', '#fbcfe8', '#fecaca', '#bbf7d0', '#cffafe',
        '#fde68a', '#e9d5ff', '#a5f3fc', '#fed7aa', '#bfdbfe', '#fecdd3',
      ],
      sparkles: ['💠', '✨', '🌟', '⚡', '🔥', '🕊️'],
    },
  };

  // 기본 파스텔 배경 틴트 (폴백)
  const TINTS = [
    '#ffe4e6', '#ffedd5', '#fef3c7', '#ecfccb', '#d1fae5', '#cffafe',
    '#e0f2fe', '#e0e7ff', '#fae8ff', '#fce7f3', '#f5f5f4', '#fef9c3',
  ];

  const api = { THEMES, TINTS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ShisenThemes = api;
})(typeof window !== 'undefined' ? window : globalThis);
