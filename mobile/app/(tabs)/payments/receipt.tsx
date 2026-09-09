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

export default function Receipt() {
  const {
    paymentId,
    amount = "0.00",
    reference,
    date,
  } = useLocalSearchParams<{
    paymentId?: string;
    amount?: string;
    reference?: string;
    date?: string;
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
      <Header title="Payment Successful" back={false} />
      <Screen>
        <View className="mt-10 mb-6">
          <StatusIcon icon="checkmark" />
        </View>

        <Text className="text-[22px] font-bold text-[#0F2C4A] text-center">
          Payment Successful!
        </Text>
        <Text className="text-[13px] text-[#6B7280] text-center mt-2 mb-8">
          Your payment has been confirmed.
        </Text>

        <Group>
          <View className="px-4">
            <KV k="Amount Paid" v={`$${amount} USD`} tone="#16A34A" />
          </View>
          <Divider />
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
          label="View Statement"
          className="mt-8"
          onPress={() => router.replace("/(tabs)/payments")}
        />
        <Pressable
          className="mt-5"
          onPress={() => router.replace("/(tabs)/dashboard")}
        >
          <Text className="text-[14px] text-[#F96B1F] font-semibold text-center">
            Back to Home
          </Text>
        </Pressable>
      </Screen>
    </View>
  );
}
