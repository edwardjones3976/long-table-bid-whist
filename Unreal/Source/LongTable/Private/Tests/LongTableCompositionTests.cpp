// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
#include "Misc/AutomationTest.h"
#include "Misc/ConfigCacheIni.h"
#include "Misc/FileHelper.h"
#include "Misc/Paths.h"
#include "UObject/UnrealType.h"
#include "LongTableBuildIdentity.h"
#include "LongTableJson.h"
#include "LongTableRobotDealerPresenter.h"
#include "LongTableSettings.h"

#if WITH_DEV_AUTOMATION_TESTS

namespace LongTableCompositionTests
{
	TSharedPtr<FJsonObject> LoadManifest(FAutomationTestBase& Test)
	{
		const FString Path = FPaths::ConvertRelativePathToFull(FPaths::Combine(FPaths::ProjectDir(), TEXT(".."), TEXT("fixtures"), TEXT("protocol"), TEXT("manifest.json")));
		FString Text;
		if (!FFileHelper::LoadFileToString(Text, *Path))
		{
			Test.AddError(FString::Printf(TEXT("fixture missing: %s"), *Path));
			return nullptr;
		}
		const TSharedPtr<FJsonValue> Value = FLongTableProtocolCodec::ParseText(Text);
		return Value.IsValid() && Value->Type == EJson::Object ? Value->AsObject() : nullptr;
	}
}

using namespace LongTableCompositionTests;

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FLongTableBuildIdentityTest, "LongTable.Composition.BuildIdentity", EAutomationTestFlags_ApplicationContextMask | EAutomationTestFlags::ProductFilter)
bool FLongTableBuildIdentityTest::RunTest(const FString& Parameters)
{
	const FString Sha = ULongTableBuildIdentity::GetBuildSha();
	TestFalse(TEXT("build sha present"), Sha.IsEmpty());
	if (ULongTableBuildIdentity::IsLocalDevelopmentBuild())
	{
		TestEqual(TEXT("local development label"), ULongTableBuildIdentity::GetBuildShortSha(), FString(TEXT("local-development")));
	}
	else
	{
		TestEqual(TEXT("injected sha is a full commit"), Sha.Len(), 40);
		TestEqual(TEXT("short sha"), ULongTableBuildIdentity::GetBuildShortSha(), Sha.Left(7));
	}
	TestTrue(TEXT("label"), ULongTableBuildIdentity::GetBuildLabel().StartsWith(TEXT("Build ")));

	const TSharedPtr<FJsonObject> Manifest = LoadManifest(*this);
	if (!Manifest.IsValid()) { return false; }
	TestEqual(TEXT("manifest id bound"), ULongTableBuildIdentity::GetManifestId(), Manifest->GetStringField(TEXT("manifestId")));
	TestEqual(TEXT("protocol version bound"), ULongTableBuildIdentity::GetProtocolVersion(), Manifest->GetStringField(TEXT("protocolVersion")));
	TestEqual(TEXT("manifest id literal"), ULongTableBuildIdentity::GetManifestId(), FString(TEXT("RESTRICTED_TABLE_SLICE_0_1")));
	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FLongTableCompositionConfigTest, "LongTable.Composition.Config", EAutomationTestFlags_ApplicationContextMask | EAutomationTestFlags::ProductFilter)
bool FLongTableCompositionConfigTest::RunTest(const FString& Parameters)
{
	FString GameInstanceClass;
	GConfig->GetString(TEXT("/Script/EngineSettings.GameMapsSettings"), TEXT("GameInstanceClass"), GameInstanceClass, GEngineIni);
	TestEqual(TEXT("game instance is the composition root"), GameInstanceClass, FString(TEXT("/Script/LongTable.LongTableGameInstance")));

	FString GameMode;
	GConfig->GetString(TEXT("/Script/EngineSettings.GameMapsSettings"), TEXT("GlobalDefaultGameMode"), GameMode, GEngineIni);
	TestEqual(TEXT("default game mode"), GameMode, FString(TEXT("/Script/LongTable.LongTableGameMode")));

	const ULongTableSettings* Settings = GetDefault<ULongTableSettings>();
	TestNotNull(TEXT("settings"), Settings);
	if (Settings)
	{
		AddInfo(FString::Printf(TEXT("AuthorityUrl='%s' DefaultTableId='%s' ConnectTimeoutSeconds=%.1f (config %s)"),
			*Settings->AuthorityUrl, *Settings->DefaultTableId, Settings->ConnectTimeoutSeconds, *Settings->GetDefaultConfigFilename()));
		TestTrue(TEXT("authority url is a websocket url"), Settings->AuthorityUrl.StartsWith(TEXT("ws://")) || Settings->AuthorityUrl.StartsWith(TEXT("wss://")));
		TestTrue(TEXT("authority url is loopback by default"), Settings->AuthorityUrl.Contains(TEXT("127.0.0.1")));
		TestFalse(TEXT("default table id"), Settings->DefaultTableId.IsEmpty());
	}
	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FLongTableRobotDealerPresenterTest, "LongTable.Composition.RobotDealerPresenter", EAutomationTestFlags_ApplicationContextMask | EAutomationTestFlags::ProductFilter)
bool FLongTableRobotDealerPresenterTest::RunTest(const FString& Parameters)
{
	const TSharedPtr<FJsonObject> Manifest = LoadManifest(*this);
	if (!Manifest.IsValid()) { return false; }
	TArray<FString> Concealed;
	for (const TSharedPtr<FJsonValue>& Key : Manifest->GetArrayField(TEXT("concealedKeys")))
	{
		Concealed.Add(Key->AsString());
	}

	const UScriptStruct* ProjectionTypes[] =
	{
		FLongTablePlayerProjection::StaticStruct(),
		FLongTableHostProjection::StaticStruct(),
		FLongTablePublicProjection::StaticStruct(),
		FLongTableRoleProjection::StaticStruct(),
		FLongTablePublicCore::StaticStruct(),
	};
	for (TFieldIterator<FProperty> It(ULongTableRobotDealerPresenter::StaticClass()); It; ++It)
	{
		FString Name = It->GetName();
		if (It->IsA<FBoolProperty>() && Name.StartsWith(TEXT("b"))) { Name.RightChopInline(1); }
		for (const FString& Key : Concealed)
		{
			TestFalse(FString::Printf(TEXT("presenter declares concealed member %s"), *Key), Name.Equals(Key, ESearchCase::IgnoreCase));
		}
		if (const FStructProperty* StructProperty = CastField<FStructProperty>(*It))
		{
			for (const UScriptStruct* Projection : ProjectionTypes)
			{
				TestFalse(FString::Printf(TEXT("presenter holds a %s"), *Projection->GetName()), StructProperty->Struct == Projection);
			}
		}
	}

	ULongTableRobotDealerPresenter* Presenter = NewObject<ULongTableRobotDealerPresenter>();
	Presenter->AddToRoot();
	FLongTableDealerCueFrame Frame;
	Frame.TableId = TEXT("table-fixture-1");
	Frame.Version = 9;
	Frame.Cue = ELongTableDealerCue::TrickTaken;
	Frame.bHasSeat = true;
	Frame.Seat = ELongTableSeat::North;
	Frame.bHasSeatLabel = true;
	Frame.SeatLabel = TEXT("North");
	Presenter->ReceiveCue(Frame);
	TestTrue(TEXT("cue presented"), Presenter->bHasLastCue);
	TestEqual(TEXT("cue count"), Presenter->CuesPresented, 1);
	TestEqual(TEXT("cue kept"), Presenter->LastCue.Cue, ELongTableDealerCue::TrickTaken);
	Presenter->RemoveFromRoot();
	return true;
}

#endif // WITH_DEV_AUTOMATION_TESTS
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
