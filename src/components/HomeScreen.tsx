import {
  BarChart3,
  Monitor,
  Moon,
  Palette,
  Play,
  Sun,
} from 'lucide-react';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {Center} from '@astryxdesign/core/Center';
import {Divider} from '@astryxdesign/core/Divider';
import {Grid} from '@astryxdesign/core/Grid';
import {Icon} from '@astryxdesign/core/Icon';
import {
  HStack,
  Layout,
  LayoutContent,
  LayoutFooter,
  VStack,
} from '@astryxdesign/core/Layout';
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@astryxdesign/core/SegmentedControl';
import {SelectableCard} from '@astryxdesign/core/SelectableCard';
import {Selector} from '@astryxdesign/core/Selector';
import {Switch} from '@astryxdesign/core/Switch';
import {Heading, Text} from '@astryxdesign/core/Text';
import {Token} from '@astryxdesign/core/Token';
import type {ThemeSlug} from '../astryx-themes';
import {
  DIFFICULTY_META,
  DIFFICULTY_ORDER,
  THEMES,
  TILE_THEME_ORDER,
  UI_THEME_OPTIONS,
  formatTime,
  getBestMs,
  type ColorModeKey,
  type DifficultyKey,
  type GameSettings,
  type TileThemeKey,
} from '../utils/gameStore';

export interface HomeScreenProps {
  settings: GameSettings;
  onSelectDifficulty: (diff: DifficultyKey) => void;
  onSelectTileTheme: (theme: TileThemeKey) => void;
  onChangeUiTheme: (uiTheme: ThemeSlug) => void;
  onChangeColorMode: (mode: ColorModeKey) => void;
  onToggleBgm: (enabled: boolean) => void;
  onToggleSound: (enabled: boolean) => void;
  onStartGame: () => void;
  onOpenDashboard: () => void;
}

export function HomeScreen({
  settings,
  onSelectDifficulty,
  onSelectTileTheme,
  onChangeUiTheme,
  onChangeColorMode,
  onToggleBgm,
  onToggleSound,
  onStartGame,
  onOpenDashboard,
}: HomeScreenProps) {
  return (
    <VStack height="100dvh">
      <Layout
        height="fill"
        contentWidth={620}
        content={
          <LayoutContent padding={2} role="main" label="말랑 사천성 홈 화면">
            <VStack gap={2} hAlign="stretch" paddingBlockEnd={2}>
              <Center paddingBlock={1}>
                <VStack gap={1} hAlign="center">
                  <HStack gap={1} hAlign="center" wrap="wrap">
                    <Token label="🍎" color="red" size="sm" />
                    <Token label="🐶" color="orange" size="sm" />
                    <Token label="🍰" color="pink" size="sm" />
                    <Token label="🍓" color="yellow" size="sm" />
                    <Token label="🐰" color="purple" size="sm" />
                  </HStack>
                  <Text type="supporting" color="accent" weight="semibold" size="sm">
                    폭신폭신 힐링 퍼즐
                  </Text>
                  <Heading level={1} type="display-2" justify="center">
                    말랑 사천성
                  </Heading>
                  <Text type="supporting" size="sm" justify="center">
                    같은 그림 두 개를 꺾임 2번 이하로 이어보세요 ✨
                  </Text>
                </VStack>
              </Center>

              <Card padding={2}>
                <VStack gap={1.5}>
                  <HStack justify="between" align="center" gap={2} wrap="wrap">
                    <Heading level={2}>난이도 선택</Heading>
                    <Text type="supporting" size="sm">
                      세로·가로 화면 자동 맞춤
                    </Text>
                  </HStack>

                  <VStack gap={1.5}>
                    {DIFFICULTY_ORDER.map(key => {
                      const meta = DIFFICULTY_META[key];
                      const isActive = settings.difficulty === key;
                      const best = formatTime(getBestMs(key));
                      return (
                        <SelectableCard
                          key={key}
                          label={`${meta.name} ${meta.desc} 최고 기록 ${best}`}
                          isSelected={isActive}
                          onChange={() => onSelectDifficulty(key)}
                          variant="default"
                          elevation={isActive ? 'low' : 'none'}
                          padding={2}>
                          <HStack justify="between" align="center" gap={2}>
                            <HStack gap={2} align="center">
                              <Text size="xl">{meta.icon}</Text>
                              <VStack gap={0.5}>
                                <HStack gap={1} align="center">
                                  <Text weight="semibold">{meta.name}</Text>
                                  {isActive && (
                                    <Token size="sm" color="orange" label="선택됨" />
                                  )}
                                </HStack>
                                <Text type="supporting" size="sm">
                                  {meta.desc}
                                </Text>
                              </VStack>
                            </HStack>
                            <Token
                              size="sm"
                              color={isActive ? 'orange' : 'gray'}
                              label={`최고 ${best}`}
                            />
                          </HStack>
                        </SelectableCard>
                      );
                    })}
                  </VStack>
                </VStack>
              </Card>

              <Card padding={2}>
                <VStack gap={1.5}>
                  <Heading level={2}>이모지 타일 테마</Heading>
                  <Grid columns={2} gap={1.5}>
                    {TILE_THEME_ORDER.map(key => {
                      const tileTheme = THEMES[key];
                      const isActive = settings.theme === key;
                      return (
                        <SelectableCard
                          key={key}
                          label={tileTheme.name}
                          isSelected={isActive}
                          onChange={() => onSelectTileTheme(key)}
                          variant="default"
                          elevation={isActive ? 'low' : 'none'}
                          padding={2}>
                          <HStack justify="between" align="center" gap={1.5}>
                            <HStack gap={1.5} align="center">
                              <Text size="lg">{tileTheme.icon}</Text>
                              <Text weight="medium" size="sm">
                                {tileTheme.name}
                              </Text>
                            </HStack>
                            {isActive && (
                              <Token size="sm" color="pink" label="✓" />
                            )}
                          </HStack>
                        </SelectableCard>
                      );
                    })}
                  </Grid>
                </VStack>
              </Card>

              <Card padding={2}>
                <VStack gap={2}>
                  <HStack justify="between" align="center" gap={2} wrap="wrap">
                    <VStack gap={0.5}>
                      <Heading level={3}>UI 디자인 테마 &amp; 사운드</Heading>
                      <Text type="supporting" size="sm">
                        Astryx 디자인 시스템 테마 및 음악 설정
                      </Text>
                    </VStack>
                    <Token size="sm" color="pink" label="Astryx Design" />
                  </HStack>

                  <Grid columns={{minWidth: 210, max: 2}} gap={2}>
                    <Selector
                      label="UI 테마"
                      options={UI_THEME_OPTIONS}
                      value={settings.uiTheme}
                      onChange={val => onChangeUiTheme(val as ThemeSlug)}
                      startIcon={<Icon icon={Palette} size="sm" />}
                      presentation="adaptive"
                      width="100%"
                    />

                    <VStack gap={1}>
                      <Text type="label" weight="medium">
                        화면 모드
                      </Text>
                      <SegmentedControl
                        label="화면 모드"
                        value={settings.colorMode}
                        onChange={val => onChangeColorMode(val as ColorModeKey)}
                        layout="fill"
                        size="md">
                        <SegmentedControlItem
                          value="system"
                          label="자동"
                          icon={<Icon icon={Monitor} size="sm" />}
                        />
                        <SegmentedControlItem
                          value="light"
                          label="라이트"
                          icon={<Icon icon={Sun} size="sm" />}
                        />
                        <SegmentedControlItem
                          value="dark"
                          label="다크"
                          icon={<Icon icon={Moon} size="sm" />}
                        />
                      </SegmentedControl>
                    </VStack>
                  </Grid>

                  <Divider />

                  <Grid columns={{minWidth: 200, max: 2}} gap={2}>
                    <Switch
                      label="배경음악 (도트 BGM)"
                      labelPosition="start"
                      labelSpacing="spread"
                      value={settings.bgm}
                      onChange={checked => onToggleBgm(checked)}
                    />
                    <Switch
                      label="효과음 (SFX)"
                      labelPosition="start"
                      labelSpacing="spread"
                      value={settings.sound}
                      onChange={checked => onToggleSound(checked)}
                    />
                  </Grid>
                </VStack>
              </Card>
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter hasDivider padding={2}>
            <Center>
              <HStack gap={2} width="100%" maxWidth={620} justify="center">
                <Button
                  label="대시보드"
                  variant="secondary"
                  size="lg"
                  icon={<Icon icon={BarChart3} size="sm" />}
                  onClick={onOpenDashboard}
                />
                <Button
                  label="게임 시작"
                  variant="primary"
                  size="lg"
                  width="fill"
                  icon={<Icon icon={Play} size="sm" />}
                  onClick={onStartGame}
                />
              </HStack>
            </Center>
          </LayoutFooter>
        }
      />
    </VStack>
  );
}
