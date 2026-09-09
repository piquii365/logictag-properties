import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Image,
  ImageSourcePropType,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C } from "@/lib/data";

export type Icon = keyof typeof Ionicons.glyphMap;

/** Navy app bar. Back chevron falls back to the dashboard when the stack is empty. */
export function Header({
  title,
  back = true,
  right,
  onRight,
  badge,
}: {
  title: string;
  back?: boolean;
  right?: Icon;
  onRight?: () => void;
  badge?: boolean;
}) {
  const { top } = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: top + 8 }} className="bg-[#0F2C4A] px-4 pb-4">
      <View className="flex-row items-center">
        {back ? (
          <Pressable
            hitSlop={12}
            onPress={() =>
              router.canGoBack()
                ? router.back()
                : router.replace("/(tabs)/dashboard")
            }
            className="mr-3"
          >
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </Pressable>
        ) : null}
        <Text
          className="flex-1 text-white text-lg font-semibold"
          numberOfLines={1}
        >
          {title}
        </Text>
        {right ? (
          <Pressable hitSlop={12} onPress={onRight}>
            <Ionicons name={right} size={22} color="#fff" />
            {badge ? (
              <View className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[#F96B1F] border border-[#0F2C4A]" />
            ) : null}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/**
 * Scrollable body on the app background. `bg` is set via `style` rather than a
 * class so a screen-specific background beats the default deterministically.
 */
export function Screen({
  children,
  scroll = true,
  bg = "#F4F6F9",
}: {
  children: React.ReactNode;
  scroll?: boolean;
  bg?: string;
}) {
  const { bottom } = useSafeAreaInsets();
  if (!scroll)
    return (
      <View className="flex-1" style={{ backgroundColor: bg }}>
        {children}
      </View>
    );
  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: bottom + 32 }}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

export function Card({
  className = "",
  children,
  ...rest
}: ViewProps & { className?: string }) {
  return (
    <View
      className={`bg-white rounded-2xl border border-[#E5E9F0] p-4 ${className}`}
      {...rest}
    >
      {children}
    </View>
  );
}

export function Btn({
  label,
  onPress,
  variant = "primary",
  icon,
  className = "",
  disabled,
}: {
  label: string;
  onPress?: () => void;
  variant?: "primary" | "outline" | "ghost" | "dark" | "light";
  /** Ionicons name, or a require()'d image for brand marks Ionicons has no color version of. */
  icon?: Icon | ImageSourcePropType;
  className?: string;
  disabled?: boolean;
}) {
  const bg = {
    primary: "bg-[#F96B1F]",
    outline: "bg-white border border-[#CBD5E1]",
    ghost: "bg-transparent",
    dark: "bg-[#0F2C4A]",
    light: "bg-transparent border border-white",
  }[variant];
  // "light" is the on-navy outline button, so it takes the white foreground too.
  const solid =
    variant === "primary" || variant === "dark" || variant === "light";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`will-change-pressable flex-row items-center justify-center rounded-xl py-3.5 px-4 transition-transform duration-100 ease-out ${bg} ${
        disabled ? "opacity-50" : "active:scale-[0.97]"
      } ${className}`}
    >
      {typeof icon === "string" ? (
        <Ionicons
          name={icon}
          size={18}
          color={solid ? "#fff" : C.navy}
          style={{ marginRight: 8 }}
        />
      ) : icon ? (
        <Image
          source={icon}
          style={{ width: 18, height: 18, marginRight: 8 }}
        />
      ) : null}
      <Text
        className={`font-semibold text-base ${solid ? "text-white" : "text-[#0F2C4A]"}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Field({
  label,
  hint,
  right,
  onRight,
  ...rest
}: TextInputProps & {
  label?: string;
  hint?: string;
  right?: Icon;
  onRight?: () => void;
}) {
  return (
    <View className="mb-4">
      {label ? (
        <Text className="text-[13px] text-[#6B7280] mb-1.5">{label}</Text>
      ) : null}
      <View className="flex-row items-center bg-white border border-[#E5E9F0] rounded-xl px-3.5">
        <TextInput
          className="flex-1 py-3.5 text-[15px] text-[#0F2C4A]"
          placeholderTextColor="#9CA3AF"
          {...rest}
        />
        {right ? (
          <Pressable hitSlop={10} onPress={onRight}>
            <Ionicons name={right} size={20} color="#9CA3AF" />
          </Pressable>
        ) : null}
      </View>
      {hint ? (
        <Text className="text-xs text-[#6B7280] mt-1">{hint}</Text>
      ) : null}
    </View>
  );
}

const TONES = {
  green: ["bg-[#DCFCE7]", "text-[#16A34A]"],
  red: ["bg-[#FEE2E2]", "text-[#DC2626]"],
  amber: ["bg-[#FEF3C7]", "text-[#B45309]"],
  navy: ["bg-[#E2E8F0]", "text-[#0F2C4A]"],
  muted: ["bg-[#F1F5F9]", "text-[#6B7280]"],
} as const;

/** Pill badge. Reserve for the one dominant status of a screen (e.g. a unit's Occupied/Vacant state) — a list of these reads as noise. */
export function Badge({
  text,
  tone = "muted",
}: {
  text: string;
  tone?: keyof typeof TONES;
}) {
  const [bg, fg] = TONES[tone];
  return (
    <View className={`${bg} rounded-full px-2.5 py-1`}>
      <Text className={`${fg} text-[11px] font-semibold`}>{text}</Text>
    </View>
  );
}

/** Colored status word, no pill. The default for status inside a dense list or a KV row. */
export function StatusText({
  text,
  tone = "muted",
}: {
  text: string;
  tone?: keyof typeof TONES;
}) {
  const [, fg] = TONES[tone];
  return <Text className={`${fg} text-[12px] font-semibold`}>{text}</Text>;
}

const DOT_COLOR: Record<keyof typeof TONES, string> = {
  green: "#16A34A",
  red: "#DC2626",
  amber: "#B45309",
  navy: "#0F2C4A",
  muted: "#94A3B8",
};

/** Small status dot + label, for scanning a list without a wall of pills. */
export function StatusDot({
  text,
  tone = "muted",
}: {
  text: string;
  tone?: keyof typeof TONES;
}) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View
        style={{ backgroundColor: DOT_COLOR[tone] }}
        className="h-1.5 w-1.5 rounded-full"
      />
      <Text className="text-[12px] font-medium text-[#6B7280]">{text}</Text>
    </View>
  );
}

/** Segmented filter chips, controlled by the caller. */
export function Pills({
  options,
  value,
  onChange,
}: {
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View className="flex-row gap-2">
      {options.map((o) => (
        <Pressable
          key={o}
          onPress={() => onChange(o)}
          className={`rounded-full px-4 py-2 border transition-transform duration-100 ease-out active:scale-95 ${
            value === o
              ? "bg-[#0F2C4A] border-[#0F2C4A]"
              : "bg-white border-[#E5E9F0]"
          }`}
        >
          <Text
            className={`text-[13px] font-medium ${value === o ? "text-white" : "text-[#6B7280]"}`}
          >
            {o}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

/** Tappable list row: leading icon, title, subtitle, trailing node and/or chevron. */
export function Row({
  icon,
  iconTint = C.navy,
  title,
  sub,
  onPress,
  right,
  chevron = true,
}: {
  icon?: Icon;
  iconTint?: string;
  title: string;
  sub?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  chevron?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center py-3.5 px-4 bg-white transition-transform duration-100 ease-out active:scale-[0.98] active:bg-[#F8FAFC]"
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={20}
          color={iconTint}
          style={{ marginRight: 12 }}
        />
      ) : null}
      <View className="flex-1">
        <Text className="text-[15px] text-[#0F2C4A] font-medium">{title}</Text>
        {sub ? (
          <Text className="text-[12px] text-[#6B7280] mt-0.5">{sub}</Text>
        ) : null}
      </View>
      {right}
      {chevron ? (
        <Ionicons
          name="chevron-forward"
          size={18}
          color="#CBD5E1"
          style={{ marginLeft: 8 }}
        />
      ) : null}
    </Pressable>
  );
}

export function SearchBar(props: TextInputProps) {
  return (
    <View className="flex-row items-center bg-white border border-[#E5E9F0] rounded-xl px-3 mb-3">
      <Ionicons name="search" size={18} color="#9CA3AF" />
      <TextInput
        className="flex-1 py-3 px-2 text-[15px] text-[#0F2C4A]"
        placeholderTextColor="#9CA3AF"
        {...props}
      />
    </View>
  );
}

/** Horizontal percentage bar. `pct` is 0-100 and is clamped. */
export function Bar({
  pct,
  color = C.orange,
}: {
  pct: number;
  color?: string;
}) {
  const w = Math.max(0, Math.min(100, pct));
  return (
    <View className="h-2 rounded-full bg-[#E5E9F0] overflow-hidden">
      <View
        style={{ width: `${w}%`, backgroundColor: color }}
        className="h-2 rounded-full"
      />
    </View>
  );
}

export function KV({
  k,
  v,
  tone = "#0F2C4A",
}: {
  k: string;
  v: string;
  tone?: string;
}) {
  return (
    <View className="flex-row items-center justify-between py-2.5">
      <Text className="text-[13px] text-[#6B7280]">{k}</Text>
      <Text className="text-[14px] font-semibold" style={{ color: tone }}>
        {v}
      </Text>
    </View>
  );
}

export function Divider() {
  return <View className="h-px bg-[#E5E9F0]" />;
}

export function SectionTitle({
  children,
  right,
}: {
  children: string;
  right?: React.ReactNode;
}) {
  return (
    <View className="flex-row items-center justify-between mb-2 mt-5">
      <Text className="text-[15px] font-semibold text-[#0F2C4A]">
        {children}
      </Text>
      {right}
    </View>
  );
}

/** Floating "+" button pinned bottom-right. */
export function Fab({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="absolute right-5 bottom-5 h-14 w-14 rounded-full bg-[#F96B1F] items-center justify-center transition-transform duration-100 ease-out active:scale-[0.93]"
      style={{
        elevation: 4,
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
      }}
    >
      <Ionicons name="add" size={28} color="#fff" />
    </Pressable>
  );
}

export function Avatar({
  initials,
  size = 44,
  tint = C.navy,
}: {
  initials: string;
  size?: number;
  tint?: string;
}) {
  return (
    <View
      style={{
        height: size,
        width: size,
        borderRadius: size / 2,
        backgroundColor: tint,
      }}
      className="items-center justify-center"
    >
      <Text
        style={{ fontSize: size * 0.36 }}
        className="text-white font-semibold"
      >
        {initials}
      </Text>
    </View>
  );
}

/** Centered spinner for a screen's data-loading state. */
export function LoadingView() {
  return (
    <View className="flex-1 items-center justify-center py-20">
      <ActivityIndicator color={C.navy} />
    </View>
  );
}

/** Centered "couldn't load this" state, with an optional retry button. */
export function ErrorView({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <View className="items-center py-16 px-6">
      <Ionicons name="cloud-offline-outline" size={36} color="#94A3B8" />
      <Text className="text-[13px] text-[#6B7280] text-center mt-3 mb-4">
        {message}
      </Text>
      {onRetry ? (
        <Btn label="Retry" variant="outline" onPress={onRetry} />
      ) : null}
    </View>
  );
}

/** Big centred status icon used by the verified / success screens. */
export function StatusIcon({
  icon,
  tint = C.green,
}: {
  icon: Icon;
  tint?: string;
}) {
  return (
    <View
      className="items-center justify-center self-center h-24 w-24 rounded-full"
      style={{ backgroundColor: `${tint}1A` }}
    >
      <View
        className="h-16 w-16 rounded-full items-center justify-center"
        style={{ backgroundColor: tint }}
      >
        <Ionicons name={icon} size={36} color="#fff" />
      </View>
    </View>
  );
}
