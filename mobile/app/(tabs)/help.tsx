import { Linking, Text, View } from "react-native";
import {
  Divider,
  Group,
  Header,
  Row,
  Screen,
  SectionTitle,
} from "@/components/ui";

const FAQS = [
  {
    q: "How do I record a payment from a tenant?",
    a: "Go to Payments → Record Payment, pick the tenant (or start from their outstanding balance), and enter the amount and method.",
  },
  {
    q: "How does a tenant pay rent from the app?",
    a: "From Payments → Pay Rent, a tenant sees their outstanding balance and can pay via mobile money, card, or bank transfer.",
  },
  {
    q: "How do I report a maintenance issue?",
    a: "Go to Maintenance and tap the + button. Pick the affected unit, describe the issue, and set a priority.",
  },
  {
    q: "Why can't I see a tenant's payment history?",
    a: "Payment and rent-charge history only appears once a lease has been set up for that unit — ask your property manager if one hasn't been created yet.",
  },
];

export default function Help() {
  return (
    <View className="flex-1 bg-[#F4F6F9]">
      <Header title="Help & Support" />
      <Screen>
        <SectionTitle>Contact us</SectionTitle>
        <Group>
          <Row
            icon="mail-outline"
            title="Email support"
            sub="properties@logictag.co.zw"
            onPress={() => Linking.openURL("mailto:properties@logictag.co.zw")}
          />
          <Divider />
          <Row
            icon="call-outline"
            title="Call us"
            sub="+263 78 024 9841"
            onPress={() => Linking.openURL("tel:+263780249841")}
          />
        </Group>

        <SectionTitle>Frequently asked questions</SectionTitle>
        <Group>
          {FAQS.map((f, i) => (
            <View key={f.q}>
              {i > 0 ? <Divider /> : null}
              <View className="px-4 py-3.5">
                <Text className="text-[14px] font-semibold text-[#0F2C4A]">
                  {f.q}
                </Text>
                <Text className="text-[13px] text-[#6B7280] mt-1 leading-5">
                  {f.a}
                </Text>
              </View>
            </View>
          ))}
        </Group>
      </Screen>
    </View>
  );
}
