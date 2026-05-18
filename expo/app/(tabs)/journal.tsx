import * as Haptics from "expo-haptics";
import { BookHeart, Plus, Trash2 } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Card from "@/components/Card";
import PressableScale from "@/components/PressableScale";
import SunsetBackground from "@/components/SunsetBackground";
import { fonts, palette, radius, spacing } from "@/constants/theme";
import { useVibly } from "@/providers/ViblyProvider";
import { JournalEntry } from "@/types/vibly";
import { prettyDate, todayKey } from "@/utils/date";

export default function JournalScreen() {
  const insets = useSafeAreaInsets();
  const {
    todaysJournals,
    pastJournals,
    addJournal,
    updateJournal,
    deleteJournal,
  } = useVibly();

  const [focusId, setFocusId] = useState<string | null>(null);

  const groupedPast = useMemo(() => {
    const groups: { date: string; entries: JournalEntry[] }[] = [];
    pastJournals.forEach((e) => {
      const last = groups[groups.length - 1];
      if (last && last.date === e.date) {
        last.entries.push(e);
      } else {
        groups.push({ date: e.date, entries: [e] });
      }
    });
    return groups;
  }, [pastJournals]);

  const onAdd = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    const entry = addJournal("");
    setFocusId(entry.id);
  }, [addJournal]);

  return (
    <SunsetBackground>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 140 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.h1}>Journal</Text>
              <Text style={styles.h1Sub}>{prettyDate(todayKey())}</Text>
            </View>
            <PressableScale onPress={onAdd} style={styles.addBtn} haptic={false}>
              <Plus size={18} color="#FFF7EE" />
            </PressableScale>
          </View>

          <View style={styles.sectionHeadInline}>
            <BookHeart size={14} color={palette.coralDeep} />
            <Text style={styles.sectionInlineLabel}>Today’s reflections</Text>
          </View>

          {todaysJournals.length === 0 ? (
            <PressableScale onPress={onAdd}>
              <Card tint="cream">
                <View style={styles.emptyTodayRow}>
                  <View style={styles.plusIconBig}>
                    <Plus size={20} color={palette.coralDeep} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.emptyTodayTitle}>Add a reflection</Text>
                    <Text style={styles.emptyTodayBody}>
                      Tap to write a short thought. Add as many as you like
                      throughout the day.
                    </Text>
                  </View>
                </View>
              </Card>
            </PressableScale>
          ) : (
            todaysJournals.map((entry) => (
              <EntryEditor
                key={entry.id}
                entry={entry}
                autoFocus={focusId === entry.id}
                onChangeText={(t) => updateJournal(entry.id, t)}
                onDelete={() => {
                  deleteJournal(entry.id);
                  if (focusId === entry.id) setFocusId(null);
                }}
              />
            ))
          )}

          {todaysJournals.length > 0 ? (
            <PressableScale onPress={onAdd} style={styles.addAnotherBtn}>
              <Plus size={16} color={palette.coralDeep} />
              <Text style={styles.addAnotherText}>Add another note</Text>
            </PressableScale>
          ) : null}

          {groupedPast.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>Recent reflections</Text>
              {groupedPast.map((g) => (
                <View key={g.date} style={{ gap: spacing.sm }}>
                  <Text style={styles.entryDate}>{prettyDate(g.date)}</Text>
                  {g.entries.map((e) => (
                    <Card key={e.id} tint="soft">
                      <Text style={styles.entryText}>{e.text}</Text>
                    </Card>
                  ))}
                </View>
              ))}
            </>
          ) : todaysJournals.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>Quiet pages, ready</Text>
              <Text style={styles.emptyBody}>
                Each reflection you save here will appear, gentle and dated, for
                you to return to.
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SunsetBackground>
  );
}

function EntryEditor({
  entry,
  autoFocus,
  onChangeText,
  onDelete,
}: {
  entry: JournalEntry;
  autoFocus: boolean;
  onChangeText: (t: string) => void;
  onDelete: () => void;
}) {
  const [text, setText] = useState<string>(entry.text);
  const fade = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [fade]);

  useEffect(() => {
    if (autoFocus) {
      const t = setTimeout(() => inputRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }
  }, [autoFocus]);

  const onBlur = () => {
    onChangeText(text);
  };

  const confirmDelete = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    onDelete();
  };

  return (
    <Animated.View style={{ opacity: fade }}>
      <Card tint="cream" style={{ padding: 0 }}>
        <View style={styles.editorHead}>
          <Text style={styles.editorTime}>
            {new Date(entry.createdAt).toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            })}
          </Text>
          <PressableScale
            onPress={confirmDelete}
            style={styles.deleteBtn}
            haptic={false}
          >
            <Trash2 size={14} color={palette.muted} />
          </PressableScale>
        </View>
        <TextInput
          ref={inputRef}
          value={text}
          onChangeText={setText}
          onBlur={onBlur}
          placeholder="A sentence is enough. What was true for you in this moment?"
          placeholderTextColor={palette.muted}
          multiline
          style={styles.editor}
          textAlignVertical="top"
        />
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.lg, gap: spacing.lg },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  h1: {
    fontFamily: fonts.serif,
    fontSize: 34,
    color: palette.plum,
    fontWeight: "700",
    letterSpacing: -1,
  },
  h1Sub: { color: palette.plumSoft, fontSize: 14, marginTop: -4 },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: palette.coralDeep,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#5A1F12",
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 6,
  },

  sectionHeadInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 4,
    marginTop: spacing.xs,
  },
  sectionInlineLabel: {
    color: palette.coralDeep,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
  },

  emptyTodayRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  plusIconBig: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "rgba(242,106,76,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTodayTitle: {
    fontFamily: fonts.sans,
    fontWeight: "700",
    color: palette.plum,
    fontSize: 16,
  },
  emptyTodayBody: { color: palette.plumSoft, fontSize: 13, marginTop: 2 },

  addAnotherBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: radius.pill,
    backgroundColor: "rgba(242,106,76,0.10)",
    borderWidth: 1,
    borderColor: "rgba(242,106,76,0.24)",
    borderStyle: "dashed",
  },
  addAnotherText: {
    color: palette.coralDeep,
    fontWeight: "700",
    fontSize: 13,
  },

  editorHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  editorTime: {
    color: palette.coralDeep,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  deleteBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(46,22,32,0.05)",
  },
  editor: {
    minHeight: 110,
    padding: spacing.lg,
    paddingTop: spacing.sm,
    fontSize: 16,
    color: palette.plum,
    fontFamily: fonts.serif,
    lineHeight: 24,
  },

  sectionTitle: {
    fontFamily: fonts.serif,
    fontSize: 22,
    color: palette.plum,
    fontWeight: "700",
    letterSpacing: -0.5,
    marginTop: spacing.sm,
    paddingHorizontal: 4,
  },
  entryDate: {
    fontSize: 11,
    color: palette.coralDeep,
    fontWeight: "700",
    letterSpacing: 1,
    paddingHorizontal: 4,
  },
  entryText: {
    color: palette.plum,
    fontSize: 15,
    fontFamily: fonts.serif,
    lineHeight: 22,
  },

  emptyWrap: { paddingHorizontal: 8, paddingVertical: spacing.lg },
  emptyTitle: {
    fontFamily: fonts.serif,
    fontSize: 18,
    color: palette.plum,
    fontWeight: "700",
  },
  emptyBody: { color: palette.plumSoft, fontSize: 14, marginTop: 4 },
});
