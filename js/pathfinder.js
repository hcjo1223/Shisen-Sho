/**
 * pathfinder.js — 사천성 2회 이하 꺾임 경로 탐색
 *
 * engineer-myoa/Sichuan-HELPER(helper.py)의 접근을 계승:
 *   - 맵은 숫자 2차원 배열, 0 = 빈 칸(길), 그 외 = 타일(장애물)
 *   - 외곽 1줄을 0 으로 패딩해서 보드 바깥으로 돌아가는 연결을 허용
 *   - BFS로 탐색하면서 꺾임 횟수를 추적하고 2회 초과 시 가지치기
 *   - 보드 전체를 훑어 연결 가능한 쌍을 찾아냄 (힌트 / 막힘 감지)
 *
 * 원본 대비 개선점:
 *   - 원본은 한 번 방문한 칸을 close 리스트로 영구 차단해서, 나중에 더 적은
 *     꺾임으로 도달할 수 있는 경로를 놓치는 경우가 있었다.
 *     → "직선 구간(segment) 단위 BFS" + 칸별 최소 구간 수 기록으로 해결.
 *   - 정사각형 맵(VERTEX) 가정 제거 → 임의의 R x C 지원.
 *   - 꺾임이 같으면 총 이동 거리가 가장 짧은 경로를 골라 깔끔한 연결선을 그림.
 */
(function (root) {
  const DIRS = [
    [-1, 0], // UP
    [1, 0],  // DOWN
    [0, -1], // LEFT
    [0, 1],  // RIGHT
  ];
  const MAX_SEGMENTS = 3; // 꺾임 2회 = 직선 구간 최대 3개

  /**
   * 두 칸을 잇는 경로를 찾는다.
   * @param {number[][]} board 패딩 포함 보드 (0 = 빈 칸)
   * @param {{r:number,c:number}} a
   * @param {{r:number,c:number}} b
   * @returns {{points:{r:number,c:number}[], turns:number, length:number} | null}
   *   points 는 시작점, 꺾이는 지점들, 도착점 순서의 좌표 목록
   */
  function findPath(board, a, b) {
    if (a.r === b.r && a.c === b.c) return null;
    const v = board[a.r][a.c];
    if (v === 0 || v !== board[b.r][b.c]) return null;

    const rows = board.length;
    const cols = board[0].length;
    // bestSeg[r][c] / bestLen[r][c]: 해당 칸에 도달한 최소 (구간 수, 거리)
    const bestSeg = [];
    const bestLen = [];
    for (let r = 0; r < rows; r++) {
      bestSeg.push(new Array(cols).fill(Infinity));
      bestLen.push(new Array(cols).fill(Infinity));
    }
    bestSeg[a.r][a.c] = 0;
    bestLen[a.r][a.c] = 0;

    // 노드: 직선 구간이 끝난 지점 (꺾일 수 있는 지점)
    let frontier = [{ r: a.r, c: a.c, seg: 0, len: 0, dir: -1, points: [{ r: a.r, c: a.c }] }];

    for (let seg = 1; seg <= MAX_SEGMENTS; seg++) {
      const next = [];
      let found = null;

      for (const node of frontier) {
        for (let d = 0; d < 4; d++) {
          if (d === node.dir) continue; // 같은 방향 연장은 이미 이전 구간에서 처리됨
          const [dr, dc] = DIRS[d];
          let r = node.r + dr;
          let c = node.c + dc;
          let len = node.len;

          while (r >= 0 && r < rows && c >= 0 && c < cols) {
            len++;
            if (r === b.r && c === b.c) {
              if (!found || len < found.length) {
                found = {
                  points: node.points.concat([{ r, c }]),
                  turns: seg - 1,
                  length: len,
                };
              }
              break;
            }
            if (board[r][c] !== 0) break; // 장애물(다른 타일)

            if (seg < MAX_SEGMENTS &&
                (seg < bestSeg[r][c] || (seg === bestSeg[r][c] && len < bestLen[r][c]))) {
              bestSeg[r][c] = seg;
              bestLen[r][c] = len;
              next.push({ r, c, seg, len, dir: d, points: node.points.concat([{ r, c }]) });
            }
            r += dr;
            c += dc;
          }
        }
      }

      // 최소 꺾임 레벨에서 찾았으면 그 중 가장 짧은 경로를 반환
      if (found) return found;
      frontier = next;
    }
    return null;
  }

  /** 경로 존재 여부만 빠르게 확인 */
  function canConnect(board, a, b) {
    return findPath(board, a, b) !== null;
  }

  /**
   * 보드 전체에서 연결 가능한 쌍을 찾는다. (Sichuan-HELPER 의 전체 스캔과 동일한 역할)
   * @param {number[][]} board
   * @param {{limit?: number}} [opts] limit 개 찾으면 조기 종료
   * @returns {{a:{r,c}, b:{r,c}, path:object}[]}
   */
  function findAvailablePairs(board, opts) {
    const limit = (opts && opts.limit) || Infinity;
    const groups = new Map();
    for (let r = 0; r < board.length; r++) {
      for (let c = 0; c < board[r].length; c++) {
        const v = board[r][c];
        if (v === 0) continue;
        if (!groups.has(v)) groups.set(v, []);
        groups.get(v).push({ r, c });
      }
    }
    const pairs = [];
    for (const cells of groups.values()) {
      for (let i = 0; i < cells.length; i++) {
        for (let j = i + 1; j < cells.length; j++) {
          const path = findPath(board, cells[i], cells[j]);
          if (path) {
            pairs.push({ a: cells[i], b: cells[j], path });
            if (pairs.length >= limit) return pairs;
          }
        }
      }
    }
    return pairs;
  }

  const api = { findPath, canConnect, findAvailablePairs, MAX_SEGMENTS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ShisenPathfinder = api;
})(typeof window !== 'undefined' ? window : globalThis);
