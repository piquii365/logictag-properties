import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import {
  Divider,
  ErrorView,
  Header,
  LoadingView,
  Screen,
} from "@/components/ui";
import { getNotifications, markNotificationRead } from "@/lib/queries";
import { useFetch } from "@/lib/useFetch";

export default function Notifications() {
  const notifications = useFetch(getNotifications);

  async function read(id: string) {
    await markNotificationRead(id);
    notifications.refetch();
  }

  return (
    <View className="flex-1 bg-[#F4F6F9]">
      <Header title="Notifications" />
      <Screen>
        {notifications.loading ? (
          <LoadingView />
        ) : notifications.error ? (
          <ErrorView
            message={notifications.error}
            onRetry={notifications.refetch}
          />
        ) : (notifications.data ?? []).length === 0 ? (
          <Text className="text-center text-[13px] text-[#6B7280] mt-10">
            You are all caught up.
          </Text>
        ) : (
          <View className="rounded-2xl border border-[#E5E9F0] overflow-hidden">
            {(notifications.data ?? []).map((notification, i) => (
              <View key={notification.id}>
                {i ? <Divider /> : null}
                <Pressable
                  onPress={() =>
                    notification.read ? undefined : read(notification.id)
                  }
                  className="flex-row items-start bg-white px-4 py-4 active:bg-[#F8FAFC]"
                >
                  <Ionicons
                    name={
                      notification.read
                        ? "notifications-outline"
                        : "notifications"
                    }
                    size={20}
                    color={notification.read ? "#94A3B8" : "#F96B1F"}
                  />
                  <View className="ml-3 flex-1">
                    <Text
                      className={`text-[15px] font-semibold ${notification.read ? "text-[#6B7280]" : "text-[#0F2C4A]"}`}
                    >
                      {notification.subject}
                    </Text>
                    <Text className="text-[13px] text-[#6B7280] mt-1">
                      {notification.body}
                    </Text>
                    <Text className="text-[11px] text-[#94A3B8] mt-1">
                      {new Date(notification.createdAt).toLocaleString()}
                    </Text>
                  </View>
                  {!notification.read ? (
                    <View className="h-2 w-2 rounded-full bg-[#F96B1F] mt-1" />
                  ) : null}
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </Screen>
    </View>
  );
}
