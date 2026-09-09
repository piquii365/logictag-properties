import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  Btn,
  Divider,
  Group,
  Header,
  KV,
  Screen,
  StatusIcon,
} from "@/components/ui";
import { apiErrorMessage } from "@/lib/api";
import { uploadPaymentProof } from "@/lib/queries";

export default function PaymentRecorded() {
  const { paymentId, amount, reference, date, tenantName } =
    useLocalSearchParams<{
      paymentId?: string;
      amount?: string;
      reference?: string;
      date?: string;
      tenantName?: string;
    }>();

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState(false);

  async function uploadProof() {
    if (!paymentId) return;
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Photo library access is needed to upload proof.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setUploading(true);
    try {
      await uploadPaymentProof(paymentId, {
        uri: asset.uri,
        name: asset.fileName ?? "proof.jpg",
        type: asset.mimeType ?? "image/jpeg",
      });
      setUploaded(true);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  return (
    <View className="flex-1 bg-[#F4F6F9]">
      <Header title="" back={false} />
      <Screen>
        <View className="mt-6 mb-6">
          <StatusIcon icon="checkmark" />
        </View>

        <Text className="text-[24px] font-bold text-[#0F2C4A] text-center">
          Payment Recorded Successfully!
        </Text>
        <Text className="text-[30px] font-bold text-[#16A34A] text-center mt-4">
          ${amount ?? "0.00"}{" "}
          <Text className="text-[16px] text-[#6B7280]">USD</Text>
        </Text>
        {tenantName ? (
          <Text className="text-[13px] text-[#6B7280] text-center mt-2 mb-8">
            has been recorded for{" "}
            <Text className="font-semibold text-[#0F2C4A]">{tenantName}</Text>
          </Text>
        ) : (
          <View className="mb-8" />
        )}

        <Group>
          <View className="px-4">
            <KV k="Reference" v={reference ?? "—"} />
          </View>
          <Divider />
          <View className="px-4">
            <KV k="Date" v={date ?? "—"} />
          </View>
        </Group>

        {paymentId ? (
          <View className="mt-5">
            {error ? (
              <Text className="text-[13px] text-[#DC2626] text-center mb-3">
                {error}
              </Text>
            ) : null}
            {uploaded ? (
              <View className="flex-row items-center justify-center rounded-lg border border-[#E5E9F0] px-4 py-3">
                <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                <Text className="text-[14px] font-medium text-[#16A34A] ml-2">
                  Proof of payment uploaded
                </Text>
              </View>
            ) : (
              <Btn
                label={uploading ? "Uploading..." : "Upload proof of payment"}
                variant="outline"
                disabled={uploading}
                onPress={uploadProof}
              />
            )}
          </View>
        ) : null}

        <Btn
          label="Back to Payments"
          className="mt-6"
          onPress={() => router.replace("/(tabs)/payments")}
        />
        <Pressable
          className="mt-5"
          onPress={() => router.replace("/(tabs)/payments/record")}
        >
          <Text className="text-[14px] text-[#F96B1F] font-semibold text-center">
            Record Another Payment
          </Text>
        </Pressable>
      </Screen>
    </View>
  );
}
