import {Home, Play} from 'lucide-react';
import {Button} from '@astryxdesign/core/Button';
import {IconButton} from '@astryxdesign/core/IconButton';
import {Card} from '@astryxdesign/core/Card';
import {Grid} from '@astryxdesign/core/Grid';
import {Icon} from '@astryxdesign/core/Icon';
import {
  HStack,
  Layout,
  LayoutContent,
  LayoutHeader,
  VStack,
} from '@astryxdesign/core/Layout';
import {List, ListItem} from '@astryxdesign/core/List';
import {ProgressBar} from '@astryxdesign/core/ProgressBar';
import {Heading, Text} from '@astryxdesign/core/Text';
import {Token} from '@astryxdesign/core/Token';
import {
  BADGES,
  DIFFICULTY_META,
  DIFFICULTY_ORDER,
  formatTime,
  getBestMs,
  type GameStats,
} from '../utils/gameStore';

export interface DashboardScreenProps {
  stats: GameStats;
  onBackHome: () => void;
  onStartGame: () => void;
}

export function DashboardScreen({
  stats,
  onBackHome,
  onStartGame,
}: DashboardScreenProps) {
  const totalMinutes = Math.floor(stats.totalPlayMs / 60000);
  const unlockedSet = new Set(stats.unlockedBadges);
  const unlockedCount = BADGES.filter(b => unlockedSet.has(b.id)).length;

  return (
    <VStack height="100dvh">
      <Layout
        height="fill"
        contentWidth={680}
        header={
          <LayoutHeader hasDivider padding={3}>
            <HStack justify="between" align="center" gap={2}>
              <IconButton
                label="홈으로"
                icon={<Icon icon={Home} size="md" />}
                variant="secondary"
                onClick={onBackHome}
              />
              <Heading level={2}>나의 플레이 대시보드</Heading>
              <IconButton
                label="게임 시작"
                icon={<Icon icon={Play} size="md" />}
                variant="primary"
                onClick={onStartGame}
              />
            </HStack>
          </LayoutHeader>
        }
        content={
          <LayoutContent padding={3} role="main" label="플레이 기록 대시보드">
            <VStack gap={3} paddingBlockEnd={4}>
              <Grid columns={{minWidth: 140, max: 4}} gap={2}>
                <Card padding={3}>
                  <VStack gap={1} hAlign="center">
                    <Text size="2xl">🏆</Text>
                    <Text
                      size="2xl"
                      weight="bold"
                      color="accent"
                      hasTabularNumbers>
                      {stats.totalClears}
                    </Text>
                    <Text type="supporting" size="sm" justify="center">
                      총 클리어
                    </Text>
                  </VStack>
                </Card>

                <Card padding={3}>
                  <VStack gap={1} hAlign="center">
                    <Text size="2xl">🔥</Text>
                    <Text
                      size="2xl"
                      weight="bold"
                      color="accent"
                      hasTabularNumbers>
                      {stats.maxCombo}
                    </Text>
                    <Text type="supporting" size="sm" justify="center">
                      최대 콤보
                    </Text>
                  </VStack>
                </Card>

                <Card padding={3}>
                  <VStack gap={1} hAlign="center">
                    <Text size="2xl">🍒</Text>
                    <Text
                      size="2xl"
                      weight="bold"
                      color="accent"
                      hasTabularNumbers>
                      {stats.matchedPairs}
                    </Text>
                    <Text type="supporting" size="sm" justify="center">
                      맞춘 타일 쌍
                    </Text>
                  </VStack>
                </Card>

                <Card padding={3}>
                  <VStack gap={1} hAlign="center">
                    <Text size="2xl">⏱️</Text>
                    <Text
                      size="2xl"
                      weight="bold"
                      color="accent"
                      hasTabularNumbers>
                      {`${totalMinutes}분`}
                    </Text>
                    <Text type="supporting" size="sm" justify="center">
                      총 플레이 시간
                    </Text>
                  </VStack>
                </Card>
              </Grid>

              <Card padding={3}>
                <VStack gap={2}>
                  <Heading level={3}>난이도별 최고 기록</Heading>
                  <List edge="bleed" hasDividers density="balanced">
                    {DIFFICULTY_ORDER.map(diffKey => {
                      const meta = DIFFICULTY_META[diffKey];
                      const bestMs = getBestMs(diffKey);
                      return (
                        <ListItem
                          key={diffKey}
                          startContent={<Text size="lg">{meta.icon}</Text>}
                          label={meta.name}
                          description={`${meta.tiles}개 타일 (${meta.gridLabel})`}
                          endContent={
                            <Token
                              color={bestMs > 0 ? 'orange' : 'gray'}
                              label={formatTime(bestMs)}
                            />
                          }
                        />
                      );
                    })}
                  </List>
                </VStack>
              </Card>

              <Card padding={3}>
                <VStack gap={2}>
                  <HStack justify="between" align="center" gap={2}>
                    <Heading level={3}>달성 업적</Heading>
                    <Token
                      size="sm"
                      color="green"
                      label={`${unlockedCount} / ${BADGES.length}`}
                    />
                  </HStack>

                  <ProgressBar
                    label="전체 업적 달성률"
                    value={unlockedCount}
                    max={BADGES.length}
                    hasValueLabel
                    variant="success"
                  />

                  <Grid columns={{minWidth: 155, max: 3}} gap={2}>
                    {BADGES.map(b => {
                      const isUnlocked = unlockedSet.has(b.id);
                      return (
                        <Card
                          key={b.id}
                          padding={2}
                          variant={isUnlocked ? 'default' : 'muted'}
                          elevation={isUnlocked ? 'low' : 'none'}>
                          <VStack gap={1} hAlign="center">
                            <Text size="2xl">{b.icon}</Text>
                            <Text weight="semibold" justify="center">
                              {b.name}
                            </Text>
                            <Text
                              type="supporting"
                              size="sm"
                              justify="center">
                              {b.desc}
                            </Text>
                            <Token
                              size="sm"
                              color={isUnlocked ? 'green' : 'gray'}
                              label={isUnlocked ? '달성 완료 ✨' : '미달성'}
                            />
                          </VStack>
                        </Card>
                      );
                    })}
                  </Grid>
                </VStack>
              </Card>

              <Button
                label="지금 플레이하기"
                variant="primary"
                size="lg"
                width="100%"
                icon={<Icon icon={Play} size="sm" />}
                onClick={onStartGame}
              />
            </VStack>
          </LayoutContent>
        }
      />
    </VStack>
  );
}
