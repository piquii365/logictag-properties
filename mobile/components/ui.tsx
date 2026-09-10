import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
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
import { Image as ExpoImage } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C } from "@/lib/data";
import { BASE_URL } from "@/lib/api";

/** Bundled fallback photo used when a property/unit has no uploaded image. */
const FALLBACK_HERO = require("@/assets/images/bg1.jpg");

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
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
                return;
              }
              // Nothing to pop (deep link / guard remount). Return to the root
              // of the *current* stack instead of hard-coding a route: the
              // Header is shared by both the (auth) and (tabs) groups, and
              // whichever group is mounted depends on the signed-in state.
              // Replacing to a route that isn't mounted (e.g. "index" while
              // signed in, or "(tabs)/dashboard" while signed out) throws
              // "action 'REPLACE' ... was not handled by any navigator".
              if (router.canDismiss()) {
                router.dismissAll();
              }
            }}
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

/**
 * Full-bleed photo hero that fills the top of the screen. It breaks out of the
 * parent Screen's 16px padding via negative margins, so it must be the first
 * child of a default-padded `<Screen>`. Falls back to the bundled bg1.jpg when
 * no source is given (e.g. a property with no uploaded image).
 */
export function Hero({
  source,
  height = 260,
}: {
  source?: string | null;
  height?: number;
}) {
  return (
    <ExpoImage
      source={source ? { uri: `${BASE_URL}${source}` } : FALLBACK_HERO}
      contentFit="cover"
      style={{ height, marginHorizontal: -16, marginTop: -16 }}
    />
  );
}

export function Card({
  className = "",
  children,
  ...rest
}: ViewProps & { className?: string }) {
  return (
    <View
      className={`bg-white rounded-lg border border-[#E5E9F0] p-4 ${className}`}
      {...rest}
    >
      {children}
    </View>
  );
}

/**
 * Flat bordered surface for a group of rows/items. Use this instead of a Card
 * when the content is a list of rows separated by dividers — it reads as one
 * structured block rather than a stack of floating boxes.
 */
export function Group({
  className = "",
  children,
  ...rest
}: ViewProps & { className?: string }) {
  return (
    <View
      className={`bg-white rounded-lg border border-[#E5E9F0] overflow-hidden ${className}`}
      {...rest}
    >
      {children}
    </View>
  );
}

/**
 * A headline metric: a dominant value with a quiet label. Renders flat (no box)
 * so the number carries the hierarchy. `tone` colours the value.
 */
export function Metric({
  value,
  label,
  tone = "#0F2C4A",
  size = "lg",
}: {
  value: string;
  label: string;
  tone?: string;
  size?: "lg" | "md";
}) {
  return (
    <View>
      <Text
        className={
          size === "lg" ? "text-[30px] font-bold" : "text-[22px] font-bold"
        }
        style={{ color: tone }}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <Text className="text-[12px] text-[#6B7280] mt-1">{label}</Text>
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
      className={`flex-row items-center justify-center rounded-lg py-3.5 px-4 ${bg} ${
        disabled ? "opacity-50" : ""
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
      <View className="flex-row items-center bg-white border border-[#E5E9F0] rounded-lg px-3.5">
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

/** Inline dropdown/select field. Tap to expand a list of options. */
export function Select({
  label,
  options,
  value,
  onChange,
  placeholder = "Select an option",
  hint,
}: {
  label?: string;
  options: readonly { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <View className="mb-4">
      {label ? (
        <Text className="text-[13px] text-[#6B7280] mb-1.5">{label}</Text>
      ) : null}
      <Pressable
        onPress={() => setOpen((v) => !v)}
        className="flex-row items-center justify-between bg-white border border-[#E5E9F0] rounded-lg px-3.5 py-3.5"
      >
        <Text
          className={`text-[15px] ${selected ? "text-[#0F2C4A]" : "text-[#9CA3AF]"}`}
        >
          {selected?.label ?? placeholder}
        </Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={18}
          color="#9CA3AF"
        />
      </Pressable>
      {open ? (
        <View className="bg-white border border-[#E5E9F0] rounded-lg -mt-1 overflow-hidden">
          {options.map((o) => (
            <Pressable
              key={o.value}
              onPress={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={`px-4 py-3 active:bg-[#F8FAFC] ${
                o.value === value ? "bg-[#F4F6F9]" : ""
              }`}
            >
              <Text
                className={`text-[14px] ${
                  o.value === value
                    ? "font-semibold text-[#0F2C4A]"
                    : "text-[#0F2C4A]"
                }`}
              >
                {o.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
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
          className={`rounded-full px-4 py-2 border ${
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
      className="flex-row items-center py-3.5 px-4 bg-white active:bg-[#F8FAFC]"
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
    <View className="flex-row items-center bg-white border border-[#E5E9F0] rounded-lg px-3 mb-3">
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
      className="absolute right-5 bottom-5 h-14 w-14 rounded-full bg-[#F96B1F] items-center justify-center"
    >
      <Ionicons name="add" size={28} color="#fff" />
    </Pressable>
  );
}

export function Avatar({
  initials,
  size = 44,
  tint = C.navy,
  uri,
}: {
  initials: string;
  size?: number;
  tint?: string;
  /** Optional image source. When provided, the image is shown instead of initials. */
  uri?: string;
}) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ height: size, width: size, borderRadius: size / 2 }}
      />
    );
  }
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
