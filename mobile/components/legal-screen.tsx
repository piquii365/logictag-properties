import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { Card, Divider, Header, Screen, SectionTitle } from "@/components/ui";
import { LEGAL_ENTITY, type LegalDocument } from "@/lib/legal";

/**
 * Renders a legal document (Terms of Service / Privacy Policy) from the
 * structured copy in `lib/legal.ts`. Shared by both legal screens so the two
 * stay visually identical.
 */
export function LegalScreen({ doc }: { doc: LegalDocument }) {
  return (
    <View className="flex-1 bg-[#F4F6F9]">
      <Header title={doc.title} />
      <Screen>
        <Text className="text-[24px] font-bold text-[#0F2C4A]">
          {doc.title}
        </Text>
        <Text className="text-[12px] text-[#6B7280] mt-1">{doc.updated}</Text>

        <Card className="mt-4 flex-row">
          <Ionicons
            name="information-circle-outline"
            size={18}
            color="#0F2C4A"
            style={{ marginTop: 1 }}
          />
          <Text className="ml-2 flex-1 text-[13px] leading-5 text-[#0F2C4A]">
            {doc.summary}
          </Text>
        </Card>

        {doc.sections.map((section) => (
          <View key={section.heading}>
            <SectionTitle>{section.heading}</SectionTitle>
            {section.body.map((paragraph) => (
              <Text
                key={paragraph}
                className="text-[13px] leading-6 text-[#374151] mb-3"
              >
                {paragraph}
              </Text>
            ))}
            {section.bullets ? (
              <View className="mb-1">
                {section.bullets.map((bullet) => (
                  <View key={bullet} className="flex-row mb-2">
                    <Text className="text-[13px] leading-6 text-[#F96B1F] mr-2">
                      •
                    </Text>
                    <Text className="flex-1 text-[13px] leading-6 text-[#374151]">
                      {bullet}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ))}

        <Divider />

        <Text className="text-[12px] text-[#6B7280] mt-4 leading-5">
          {LEGAL_ENTITY.company} · {LEGAL_ENTITY.address}
        </Text>
        <Text className="text-[12px] text-[#6B7280] mt-1 leading-5">
          {LEGAL_ENTITY.email}
        </Text>
      </Screen>
    </View>
  );
}
