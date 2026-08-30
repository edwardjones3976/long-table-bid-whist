// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
/**
 * Headless automation over the shared golden fixtures in fixtures/protocol.
 *
 *   UnrealEditor-Cmd LongTable.uproject -ExecCmds="Automation RunTests LongTable.Protocol; Quit" -nullrhi -unattended
 */
#include "Misc/AutomationTest.h"
#include "Misc/FileHelper.h"
#include "Misc/Paths.h"
#include "UObject/UnrealType.h"
#include "LongTableJson.h"
#include "LongTableVocabulary.h"

#if WITH_DEV_AUTOMATION_TESTS

namespace LongTableProtocolTests
{
	FString FixtureDir()
	{
		return FPaths::ConvertRelativePathToFull(FPaths::Combine(FPaths::ProjectDir(), TEXT(".."), TEXT("fixtures"), TEXT("protocol")));
	}

	TSharedPtr<FJsonValue> LoadFixture(FAutomationTestBase& Test, const TCHAR* Name)
	{
		const FString Path = FPaths::Combine(FixtureDir(), Name);
		FString Text;
		if (!FFileHelper::LoadFileToString(Text, *Path))
		{
			Test.AddError(FString::Printf(TEXT("fixture missing: %s"), *Path));
			return nullptr;
		}
		const TSharedPtr<FJsonValue> Value = FLongTableProtocolCodec::ParseText(Text);
		if (!Value.IsValid())
		{
			Test.AddError(FString::Printf(TEXT("fixture is not JSON: %s"), *Path));
		}
		return Value;
	}

	TSharedPtr<FJsonObject> LoadFixtureObject(FAutomationTestBase& Test, const TCHAR* Name)
	{
		const TSharedPtr<FJsonValue> Value = LoadFixture(Test, Name);
		if (!Value.IsValid() || Value->Type != EJson::Object)
		{
			if (Value.IsValid()) { Test.AddError(FString::Printf(TEXT("fixture is not an object: %s"), Name)); }
			return nullptr;
		}
		return Value->AsObject();
	}

	/** Decodes `value`, re-encodes it, and requires byte-identical canonical text. */
	template <typename StructType, typename DecodeFn, typename EncodeFn>
	void CheckRoundTrip(FAutomationTestBase& Test, const FString& What, const TSharedPtr<FJsonValue>& Value, const FString& Canonical, const FString& Label, DecodeFn Decode, EncodeFn Encode)
	{
		StructType Decoded;
		FLongTableSchemaRejection Rejection;
		if (!Test.TestTrue(FString::Printf(TEXT("%s decodes (%s)"), *What, *Rejection.ToString()), Decode(Value, Label, Decoded, Rejection)))
		{
			Test.AddError(FString::Printf(TEXT("%s rejected: %s"), *What, *Rejection.ToString()));
			return;
		}
		const FString Encoded = Encode(Decoded);
		if (!FLongTableProtocolCodec::Utf8BytesEqual(Encoded, Canonical))
		{
			Test.AddError(FString::Printf(TEXT("%s canonical mismatch\n expected: %s\n actual:   %s"), *What, *Canonical, *Encoded));
		}
	}
}

using namespace LongTableProtocolTests;

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FLongTableProtocolVocabularyTest, "LongTable.Protocol.Vocabulary", EAutomationTestFlags_ApplicationContextMask | EAutomationTestFlags::ProductFilter)
bool FLongTableProtocolVocabularyTest::RunTest(const FString& Parameters)
{
	const TSharedPtr<FJsonObject> Manifest = LoadFixtureObject(*this, TEXT("manifest.json"));
	if (!Manifest.IsValid()) { return false; }

	TestEqual(TEXT("protocolVersion"), Manifest->GetStringField(TEXT("protocolVersion")), FString(LongTableProtocol::ProtocolVersion));
	TestEqual(TEXT("manifestId"), Manifest->GetStringField(TEXT("manifestId")), FString(LongTableProtocol::ManifestId));

	const TSharedPtr<FJsonObject>* Vocabulary = nullptr;
	if (!Manifest->TryGetObjectField(TEXT("vocabulary"), Vocabulary))
	{
		AddError(TEXT("manifest.json has no vocabulary"));
		return false;
	}

	for (const FLongTableVocabularyList& List : LongTableProtocol::VocabularyLists())
	{
		const TArray<TSharedPtr<FJsonValue>>* Items = nullptr;
		if (!(*Vocabulary)->TryGetArrayField(List.Name, Items))
		{
			AddError(FString::Printf(TEXT("manifest vocabulary missing %s"), *List.Name));
			continue;
		}
		TestEqual(FString::Printf(TEXT("%s count"), *List.Name), Items->Num(), List.Names.Num());
		for (int32 Index = 0; Index < FMath::Min(Items->Num(), List.Names.Num()); ++Index)
		{
			TestEqual(FString::Printf(TEXT("%s[%d]"), *List.Name, Index), (*Items)[Index]->AsString(), FString(List.Names[Index]));
		}
	}
	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FLongTableProtocolFixturesTest, "LongTable.Protocol.Fixtures", EAutomationTestFlags_ApplicationContextMask | EAutomationTestFlags::ProductFilter)
bool FLongTableProtocolFixturesTest::RunTest(const FString& Parameters)
{
	if (const TSharedPtr<FJsonObject> Fixture = LoadFixtureObject(*this, TEXT("player-projection.json")))
	{
		CheckRoundTrip<FLongTablePlayerProjection>(*this, TEXT("player-projection"), Fixture->TryGetField(TEXT("value")), Fixture->GetStringField(TEXT("canonical")), TEXT("player"),
			&FLongTableProtocolCodec::DecodePlayerProjection, &FLongTableProtocolCodec::EncodePlayerProjection);
		FLongTablePlayerProjection Player;
		FLongTableSchemaRejection Rejection;
		if (FLongTableProtocolCodec::DecodePlayerProjection(Fixture->TryGetField(TEXT("value")), TEXT("player"), Player, Rejection))
		{
			TestEqual(TEXT("player seat"), Player.Seat, ELongTableSeat::South);
			TestTrue(TEXT("player holds cards"), Player.Hand.Num() > 0);
			TestEqual(TEXT("four seats"), Player.Seats.Num(), 4);
			TestEqual(TEXT("two withheld notices"), Player.DisabledNotices.Num(), 2);
		}
	}
	if (const TSharedPtr<FJsonObject> Fixture = LoadFixtureObject(*this, TEXT("host-projection.json")))
	{
		CheckRoundTrip<FLongTableHostProjection>(*this, TEXT("host-projection"), Fixture->TryGetField(TEXT("value")), Fixture->GetStringField(TEXT("canonical")), TEXT("host"),
			&FLongTableProtocolCodec::DecodeHostProjection, &FLongTableProtocolCodec::EncodeHostProjection);
	}
	if (const TSharedPtr<FJsonObject> Fixture = LoadFixtureObject(*this, TEXT("public-projection.json")))
	{
		CheckRoundTrip<FLongTablePublicProjection>(*this, TEXT("public-projection"), Fixture->TryGetField(TEXT("value")), Fixture->GetStringField(TEXT("canonical")), TEXT("public"),
			&FLongTableProtocolCodec::DecodePublicProjection, &FLongTableProtocolCodec::EncodePublicProjection);
	}
	if (const TSharedPtr<FJsonObject> Fixture = LoadFixtureObject(*this, TEXT("dealer-cues.json")))
	{
		const TArray<TSharedPtr<FJsonValue>>& Frames = Fixture->GetArrayField(TEXT("frames"));
		const TArray<TSharedPtr<FJsonValue>>& Canonical = Fixture->GetArrayField(TEXT("canonical"));
		TestTrue(TEXT("dealer cues present"), Frames.Num() > 0);
		TestEqual(TEXT("dealer cue canonical count"), Canonical.Num(), Frames.Num());
		for (int32 Index = 0; Index < FMath::Min(Frames.Num(), Canonical.Num()); ++Index)
		{
			CheckRoundTrip<FLongTableDealerCueFrame>(*this, FString::Printf(TEXT("dealer-cue[%d]"), Index), Frames[Index], Canonical[Index]->AsString(), TEXT("cue"),
				&FLongTableProtocolCodec::DecodeDealerCueFrame, &FLongTableProtocolCodec::EncodeDealerCueFrame);
		}
	}
	if (const TSharedPtr<FJsonObject> Fixture = LoadFixtureObject(*this, TEXT("receipts.json")))
	{
		for (const TPair<FString, TSharedPtr<FJsonValue>>& Pair : Fixture->Values)
		{
			const TSharedPtr<FJsonObject> Entry = Pair.Value->AsObject();
			CheckRoundTrip<FLongTableIntentReceipt>(*this, FString::Printf(TEXT("receipt %s"), *Pair.Key), Entry->TryGetField(TEXT("value")), Entry->GetStringField(TEXT("canonical")), TEXT("receipt"),
				&FLongTableProtocolCodec::DecodeIntentReceipt, &FLongTableProtocolCodec::EncodeIntentReceipt);
		}
	}
	if (const TSharedPtr<FJsonObject> Fixture = LoadFixtureObject(*this, TEXT("client-messages.json")))
	{
		const TArray<TSharedPtr<FJsonValue>>& Messages = Fixture->GetArrayField(TEXT("messages"));
		const TArray<TSharedPtr<FJsonValue>>& Canonical = Fixture->GetArrayField(TEXT("canonical"));
		TestTrue(TEXT("client examples cover every intent kind"), Messages.Num() >= 21);
		for (int32 Index = 0; Index < FMath::Min(Messages.Num(), Canonical.Num()); ++Index)
		{
			CheckRoundTrip<FLongTableClientMessage>(*this, FString::Printf(TEXT("client-message[%d]"), Index), Messages[Index], Canonical[Index]->AsString(), TEXT("client"),
				&FLongTableProtocolCodec::DecodeClientMessage, &FLongTableProtocolCodec::EncodeClientMessage);
		}
	}
	if (const TSharedPtr<FJsonObject> Fixture = LoadFixtureObject(*this, TEXT("authority-messages.json")))
	{
		const TArray<TSharedPtr<FJsonValue>>& Messages = Fixture->GetArrayField(TEXT("messages"));
		const TArray<TSharedPtr<FJsonValue>>& Canonical = Fixture->GetArrayField(TEXT("canonical"));
		TestTrue(TEXT("authority examples cover every message type"), Messages.Num() >= 9);
		for (int32 Index = 0; Index < FMath::Min(Messages.Num(), Canonical.Num()); ++Index)
		{
			CheckRoundTrip<FLongTableAuthorityMessage>(*this, FString::Printf(TEXT("authority-message[%d]"), Index), Messages[Index], Canonical[Index]->AsString(), TEXT("authority"),
				&FLongTableProtocolCodec::DecodeAuthorityMessage, &FLongTableProtocolCodec::EncodeAuthorityMessage);
		}
	}
	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FLongTableProtocolRejectionsTest, "LongTable.Protocol.Rejections", EAutomationTestFlags_ApplicationContextMask | EAutomationTestFlags::ProductFilter)
bool FLongTableProtocolRejectionsTest::RunTest(const FString& Parameters)
{
	const TSharedPtr<FJsonValue> Fixture = LoadFixture(*this, TEXT("rejections.json"));
	if (!Fixture.IsValid() || Fixture->Type != EJson::Array)
	{
		AddError(TEXT("rejections.json is not an array"));
		return false;
	}
	int32 Checked = 0;
	for (const TSharedPtr<FJsonValue>& Item : Fixture->AsArray())
	{
		const TSharedPtr<FJsonObject> Example = Item->AsObject();
		const FString Name = Example->GetStringField(TEXT("name"));
		const FString Schema = Example->GetStringField(TEXT("schema"));
		const FString ExpectedCode = Example->GetStringField(TEXT("code"));
		const FString ExpectedPath = Example->GetStringField(TEXT("path"));
		const TSharedPtr<FJsonValue> Payload = Example->TryGetField(TEXT("payload"));

		FLongTableSchemaRejection Rejection;
		bool bDecoded = true;
		if (Schema == TEXT("player-projection")) { FLongTablePlayerProjection Out; bDecoded = FLongTableProtocolCodec::DecodePlayerProjection(Payload, TEXT("player"), Out, Rejection); }
		else if (Schema == TEXT("host-projection")) { FLongTableHostProjection Out; bDecoded = FLongTableProtocolCodec::DecodeHostProjection(Payload, TEXT("host"), Out, Rejection); }
		else if (Schema == TEXT("public-projection")) { FLongTablePublicProjection Out; bDecoded = FLongTableProtocolCodec::DecodePublicProjection(Payload, TEXT("public"), Out, Rejection); }
		else if (Schema == TEXT("client-message")) { FLongTableClientMessage Out; bDecoded = FLongTableProtocolCodec::DecodeClientMessage(Payload, TEXT("client"), Out, Rejection); }
		else if (Schema == TEXT("authority-message")) { FLongTableAuthorityMessage Out; bDecoded = FLongTableProtocolCodec::DecodeAuthorityMessage(Payload, TEXT("authority"), Out, Rejection); }
		else if (Schema == TEXT("dealer-cue")) { FLongTableDealerCueFrame Out; bDecoded = FLongTableProtocolCodec::DecodeDealerCueFrame(Payload, TEXT("cue"), Out, Rejection); }
		else if (Schema == TEXT("receipt")) { FLongTableIntentReceipt Out; bDecoded = FLongTableProtocolCodec::DecodeIntentReceipt(Payload, TEXT("receipt"), Out, Rejection); }
		else { AddError(FString::Printf(TEXT("unknown schema %s in %s"), *Schema, *Name)); continue; }

		TestFalse(FString::Printf(TEXT("%s is rejected"), *Name), bDecoded);
		TestEqual(FString::Printf(TEXT("%s code"), *Name), Rejection.Code, ExpectedCode);
		TestEqual(FString::Printf(TEXT("%s path"), *Name), Rejection.Path, ExpectedPath);
		++Checked;
	}
	TestTrue(TEXT("rejection examples present"), Checked > 10);
	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FLongTableProtocolCounterfactualTest, "LongTable.Protocol.Counterfactual", EAutomationTestFlags_ApplicationContextMask | EAutomationTestFlags::ProductFilter)
bool FLongTableProtocolCounterfactualTest::RunTest(const FString& Parameters)
{
	const TSharedPtr<FJsonObject> Fixture = LoadFixtureObject(*this, TEXT("counterfactual.json"));
	if (!Fixture.IsValid()) { return false; }

	const TSharedPtr<FJsonObject> HostPair = Fixture->GetObjectField(TEXT("host"));
	FLongTableHostProjection HostActual, HostCounterfactual;
	FLongTableSchemaRejection Rejection;
	TestTrue(TEXT("host actual decodes"), FLongTableProtocolCodec::DecodeHostProjection(HostPair->TryGetField(TEXT("actual")), TEXT("host"), HostActual, Rejection));
	TestTrue(TEXT("host counterfactual decodes"), FLongTableProtocolCodec::DecodeHostProjection(HostPair->TryGetField(TEXT("counterfactual")), TEXT("host"), HostCounterfactual, Rejection));
	const FString HostA = FLongTableProtocolCodec::EncodeHostProjection(HostActual);
	const FString HostB = FLongTableProtocolCodec::EncodeHostProjection(HostCounterfactual);
	TestTrue(TEXT("host projections byte-identical under concealed counterfactual"), FLongTableProtocolCodec::Utf8BytesEqual(HostA, HostB));
	TestFalse(TEXT("host projection carries no ghost card"), HostB.Contains(TEXT("GHOSTCARD")));
	TestFalse(TEXT("host projection carries no seed"), HostB.Contains(TEXT("counterfactual-seed")));

	const TSharedPtr<FJsonObject> PublicPair = Fixture->GetObjectField(TEXT("public"));
	FLongTablePublicProjection PublicActual, PublicCounterfactual;
	TestTrue(TEXT("public actual decodes"), FLongTableProtocolCodec::DecodePublicProjection(PublicPair->TryGetField(TEXT("actual")), TEXT("public"), PublicActual, Rejection));
	TestTrue(TEXT("public counterfactual decodes"), FLongTableProtocolCodec::DecodePublicProjection(PublicPair->TryGetField(TEXT("counterfactual")), TEXT("public"), PublicCounterfactual, Rejection));
	TestTrue(TEXT("public projections byte-identical under concealed counterfactual"),
		FLongTableProtocolCodec::Utf8BytesEqual(FLongTableProtocolCodec::EncodePublicProjection(PublicActual), FLongTableProtocolCodec::EncodePublicProjection(PublicCounterfactual)));
	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FLongTableProtocolClosedTypesTest, "LongTable.Protocol.ClosedTypes", EAutomationTestFlags_ApplicationContextMask | EAutomationTestFlags::ProductFilter)
bool FLongTableProtocolClosedTypesTest::RunTest(const FString& Parameters)
{
	const TSharedPtr<FJsonObject> Manifest = LoadFixtureObject(*this, TEXT("manifest.json"));
	if (!Manifest.IsValid()) { return false; }
	TArray<FString> Concealed;
	for (const TSharedPtr<FJsonValue>& Key : Manifest->GetArrayField(TEXT("concealedKeys")))
	{
		Concealed.Add(Key->AsString());
	}
	TestTrue(TEXT("concealed key list present"), Concealed.Num() > 5);

	const UScriptStruct* NonPlayerTypes[] =
	{
		FLongTableHostProjection::StaticStruct(),
		FLongTablePublicProjection::StaticStruct(),
		FLongTableDealerCueFrame::StaticStruct(),
		FLongTableIntentReceipt::StaticStruct(),
		FLongTableErrorMessage::StaticStruct(),
		FLongTableWelcome::StaticStruct(),
	};
	for (const UScriptStruct* Struct : NonPlayerTypes)
	{
		for (TFieldIterator<FProperty> It(Struct); It; ++It)
		{
			FString Name = It->GetName();
			if (It->IsA<FBoolProperty>() && Name.StartsWith(TEXT("b"))) { Name.RightChopInline(1); }
			for (const FString& Key : Concealed)
			{
				TestFalse(FString::Printf(TEXT("%s declares concealed member %s"), *Struct->GetName(), *Key), Name.Equals(Key, ESearchCase::IgnoreCase));
			}
			// A welcome may carry a projection, but never a player projection member of its own.
			if (const FStructProperty* StructProperty = CastField<FStructProperty>(*It))
			{
				TestFalse(FString::Printf(TEXT("%s embeds a player projection"), *Struct->GetName()), StructProperty->Struct == FLongTablePlayerProjection::StaticStruct());
			}
		}
	}

	bool bPlayerHasHand = false;
	for (TFieldIterator<FProperty> It(FLongTablePlayerProjection::StaticStruct()); It; ++It)
	{
		if (It->GetName() == TEXT("Hand")) { bPlayerHasHand = true; }
	}
	TestTrue(TEXT("player projection declares its own hand (check is not vacuous)"), bPlayerHasHand);
	return true;
}

#endif // WITH_DEV_AUTOMATION_TESTS
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
