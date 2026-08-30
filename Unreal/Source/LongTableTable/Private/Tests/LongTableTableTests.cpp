// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
/**
 * Loopback automation for the authority client: hello/welcome, intent
 * serialization, duplicate suppression, stale-version resync, reconnect with
 * resume and replay, and fail-closed handling of a non-schema frame.
 */
#include "Misc/AutomationTest.h"
#include "Misc/FileHelper.h"
#include "Misc/Paths.h"
#include "LongTableAuthorityClient.h"
#include "LongTableCommitMachine.h"
#include "LongTableJson.h"
#include "LongTableTableSubsystem.h"
#include "LongTableTransport.h"

#if WITH_DEV_AUTOMATION_TESTS

namespace LongTableTableTests
{
	FString FixtureDir()
	{
		return FPaths::ConvertRelativePathToFull(FPaths::Combine(FPaths::ProjectDir(), TEXT(".."), TEXT("fixtures"), TEXT("protocol")));
	}

	TSharedPtr<FJsonObject> LoadFixtureObject(FAutomationTestBase& Test, const TCHAR* Name)
	{
		FString Text;
		const FString Path = FPaths::Combine(FixtureDir(), Name);
		if (!FFileHelper::LoadFileToString(Text, *Path))
		{
			Test.AddError(FString::Printf(TEXT("fixture missing: %s"), *Path));
			return nullptr;
		}
		const TSharedPtr<FJsonValue> Value = FLongTableProtocolCodec::ParseText(Text);
		return Value.IsValid() && Value->Type == EJson::Object ? Value->AsObject() : nullptr;
	}

	/** The player welcome is the first authority-messages.json example. */
	FString WelcomeText(FAutomationTestBase& Test)
	{
		const TSharedPtr<FJsonObject> Fixture = LoadFixtureObject(Test, TEXT("authority-messages.json"));
		return Fixture.IsValid() ? Fixture->GetArrayField(TEXT("canonical"))[0]->AsString() : FString();
	}

	bool LoadPlayerProjection(FAutomationTestBase& Test, FLongTablePlayerProjection& Out)
	{
		const TSharedPtr<FJsonObject> Fixture = LoadFixtureObject(Test, TEXT("player-projection.json"));
		if (!Fixture.IsValid()) { return false; }
		FLongTableSchemaRejection Rejection;
		return FLongTableProtocolCodec::DecodePlayerProjection(Fixture->TryGetField(TEXT("value")), TEXT("player"), Out, Rejection);
	}

	FString ProjectionMessage(const FLongTablePlayerProjection& Base, int32 Version)
	{
		FLongTableAuthorityMessage Message;
		Message.Type = ELongTableAuthorityMessageType::Projection;
		Message.Projection.TableId = Base.TableId;
		Message.Projection.Version = Version;
		Message.Projection.Projection.Role = ELongTableRole::Player;
		Message.Projection.Projection.Player = Base;
		Message.Projection.Projection.Player.Version = Version;
		return FLongTableProtocolCodec::EncodeAuthorityMessage(Message);
	}

	FString ReceiptMessage(const FString& TableId, const FString& IntentId, ELongTableIntentKind Kind, ELongTableOutcome Outcome, bool bHasCode, ELongTableRejectionCode Code, bool bCommitted, int32 Version)
	{
		FLongTableAuthorityMessage Message;
		Message.Type = ELongTableAuthorityMessageType::Receipt;
		Message.Receipt.TableId = TableId;
		Message.Receipt.Receipt.IntentId = IntentId;
		Message.Receipt.Receipt.IntentKind = Kind;
		Message.Receipt.Receipt.Outcome = Outcome;
		Message.Receipt.Receipt.bHasCode = bHasCode;
		Message.Receipt.Receipt.Code = Code;
		Message.Receipt.Receipt.Message = bHasCode ? TEXT("rejected") : TEXT("");
		Message.Receipt.Receipt.bCommitted = bCommitted;
		Message.Receipt.Receipt.Version = Version;
		return FLongTableProtocolCodec::EncodeAuthorityMessage(Message);
	}

	struct FClientHarness
	{
		ULongTableAuthorityClient* Client = nullptr;
		TSharedPtr<FLongTableLoopbackTransport> Transport;
		FLongTableClientConfig Config;

		explicit FClientHarness(ELongTableRole Role = ELongTableRole::Player)
		{
			Client = NewObject<ULongTableAuthorityClient>();
			Client->AddToRoot();
			Client->SetIdentityNonceForTests(TEXT("test-nonce"));
			Transport = MakeShared<FLongTableLoopbackTransport>();
			Config.AuthorityUrl = TEXT("ws://127.0.0.1:1");
			Config.Token = TEXT("fixture-token-south");
			Config.Role = Role;
			Config.TableId = TEXT("table-fixture-1");
			Config.DisplayName = TEXT("Ada");
			Client->Configure(Config, Transport);
		}

		~FClientHarness()
		{
			Client->RemoveFromRoot();
		}

		bool DecodeSent(int32 Index, FLongTableClientMessage& Out) const
		{
			FLongTableSchemaRejection Rejection;
			return Transport->Sent.IsValidIndex(Index) && FLongTableProtocolCodec::DecodeClientMessageText(Transport->Sent[Index], Out, Rejection);
		}

		bool DecodeLastSent(FLongTableClientMessage& Out) const
		{
			return DecodeSent(Transport->Sent.Num() - 1, Out);
		}
	};

	FLongTableIntent PassPreview()
	{
		FLongTableIntent Intent;
		Intent.Kind = ELongTableIntentKind::Preview;
		Intent.Selection.Type = ELongTableSelectionType::Pass;
		return Intent;
	}

	FLongTableIntent ConfirmIntent()
	{
		FLongTableIntent Intent;
		Intent.Kind = ELongTableIntentKind::Confirm;
		return Intent;
	}
}

using namespace LongTableTableTests;

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FLongTableIntentIdentityTest, "LongTable.Table.IntentIdentity", EAutomationTestFlags_ApplicationContextMask | EAutomationTestFlags::ProductFilter)
bool FLongTableIntentIdentityTest::RunTest(const FString& Parameters)
{
	FLongTableIntentIdentity Fixed(TEXT("nonce"));
	TestEqual(TEXT("first id"), Fixed.Next(), FString(TEXT("nonce:1")));
	TestEqual(TEXT("second id"), Fixed.Next(), FString(TEXT("nonce:2")));

	FLongTableIntentIdentity Random;
	const FString First = Random.Next();
	const FString Second = Random.Next();
	TestNotEqual(TEXT("ids differ"), First, Second);
	TestTrue(TEXT("id within wire bound"), First.Len() <= 64);
	TestEqual(TEXT("nonce length"), Random.GetNonce().Len(), 32);

	FLongTableIntentIdentity Other;
	TestNotEqual(TEXT("nonces differ across sessions"), Random.GetNonce(), Other.GetNonce());
	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FLongTableCommitMachineTest, "LongTable.Table.CommitMachine", EAutomationTestFlags_ApplicationContextMask | EAutomationTestFlags::ProductFilter)
bool FLongTableCommitMachineTest::RunTest(const FString& Parameters)
{
	FLongTableCommitMachine Machine;
	TestTrue(TEXT("idle can submit"), Machine.CanSubmit());
	TestTrue(TEXT("begin preview"), Machine.Begin(TEXT("a:1"), PassPreview(), 3));
	TestFalse(TEXT("second intent refused while in flight"), Machine.Begin(TEXT("a:2"), ConfirmIntent(), 3));
	TestTrue(TEXT("in flight"), Machine.HasInFlight());

	FLongTableIntentReceipt Unrelated;
	Unrelated.IntentId = TEXT("someone-else");
	TestFalse(TEXT("unrelated receipt ignored"), Machine.OnReceipt(Unrelated));
	TestTrue(TEXT("still in flight"), Machine.HasInFlight());

	FLongTableIntentReceipt Accepted;
	Accepted.IntentId = TEXT("a:1");
	Accepted.IntentKind = ELongTableIntentKind::Preview;
	Accepted.Outcome = ELongTableOutcome::Accepted;
	TestTrue(TEXT("matching receipt consumed"), Machine.OnReceipt(Accepted));
	TestTrue(TEXT("idle again"), Machine.CanSubmit());
	TestTrue(TEXT("local preview held"), Machine.HasLocalPreview());

	TestTrue(TEXT("begin confirm"), Machine.Begin(TEXT("a:2"), ConfirmIntent(), 4));
	FLongTableIntentReceipt Stale;
	Stale.IntentId = TEXT("a:2");
	Stale.IntentKind = ELongTableIntentKind::Confirm;
	Stale.Outcome = ELongTableOutcome::Rejected;
	Stale.bHasCode = true;
	Stale.Code = ELongTableRejectionCode::StaleVersion;
	Machine.OnReceipt(Stale);
	TestTrue(TEXT("stale receipt requests resync"), Machine.NeedsResync());
	TestTrue(TEXT("preview survives a rejection"), Machine.HasLocalPreview());

	TestTrue(TEXT("begin confirm again"), Machine.Begin(TEXT("a:3"), ConfirmIntent(), 5));
	FLongTableIntentReceipt Committed;
	Committed.IntentId = TEXT("a:3");
	Committed.IntentKind = ELongTableIntentKind::Confirm;
	Committed.Outcome = ELongTableOutcome::Accepted;
	Committed.bCommitted = true;
	Machine.OnReceipt(Committed);
	TestFalse(TEXT("commit clears the local preview"), Machine.HasLocalPreview());
	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FLongTableClientHelloTest, "LongTable.Table.Client.HelloAndWelcome", EAutomationTestFlags_ApplicationContextMask | EAutomationTestFlags::ProductFilter)
bool FLongTableClientHelloTest::RunTest(const FString& Parameters)
{
	FClientHarness Harness;
	TestEqual(TEXT("starts disconnected"), Harness.Client->GetState(), ELongTableConnectionState::Disconnected);
	Harness.Client->Connect();
	TestEqual(TEXT("awaiting welcome"), Harness.Client->GetState(), ELongTableConnectionState::AwaitingWelcome);
	TestEqual(TEXT("url"), Harness.Transport->LastUrl, Harness.Config.AuthorityUrl);

	FLongTableClientMessage Hello;
	if (!TestTrue(TEXT("hello sent and decodes"), Harness.DecodeSent(0, Hello))) { return false; }
	TestEqual(TEXT("hello type"), Hello.Type, ELongTableClientMessageType::Hello);
	TestEqual(TEXT("hello role"), Hello.Hello.Role, ELongTableRole::Player);
	TestEqual(TEXT("hello table"), Hello.Hello.TableId, FString(TEXT("table-fixture-1")));
	TestEqual(TEXT("hello display name"), Hello.Hello.DisplayName, FString(TEXT("Ada")));
	TestFalse(TEXT("fresh hello does not resume"), Hello.Hello.bResume);
	TestEqual(TEXT("fresh hello canonical form"), Harness.Transport->Sent[0],
		FString(TEXT("{\"type\":\"hello\",\"protocolVersion\":\"long-table-protocol/1\",\"token\":\"fixture-token-south\",\"role\":\"player\",\"tableId\":\"table-fixture-1\",\"displayName\":\"Ada\",\"lastVersion\":null}")));

	const FString Welcome = WelcomeText(*this);
	if (Welcome.IsEmpty()) { return false; }
	Harness.Transport->Inject(Welcome);
	TestEqual(TEXT("ready after welcome"), Harness.Client->GetState(), ELongTableConnectionState::Ready);
	TestTrue(TEXT("version applied"), Harness.Client->GetLastAppliedVersion() >= 1);
	TestTrue(TEXT("seat bound"), Harness.Client->HasSeat());
	TestEqual(TEXT("seat south"), Harness.Client->GetSeat(), ELongTableSeat::South);
	TestEqual(TEXT("one frame applied"), Harness.Client->AppliedFrameCount(), 1);
	TestEqual(TEXT("player projection role seat"), Harness.Client->PlayerProjection().Seat, ELongTableSeat::South);
	TestTrue(TEXT("player projection version matches"), Harness.Client->PlayerProjection().Version == Harness.Client->GetLastAppliedVersion());
	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FLongTableClientIntentTest, "LongTable.Table.Client.IntentSerialization", EAutomationTestFlags_ApplicationContextMask | EAutomationTestFlags::ProductFilter)
bool FLongTableClientIntentTest::RunTest(const FString& Parameters)
{
	FClientHarness Harness;
	TestTrue(TEXT("nothing sent before ready"), Harness.Client->SubmitIntent(PassPreview()).IsEmpty());
	Harness.Client->Connect();
	Harness.Transport->Inject(WelcomeText(*this));
	const int32 Version = Harness.Client->GetLastAppliedVersion();

	const FString IntentId = Harness.Client->SubmitIntent(PassPreview());
	TestEqual(TEXT("intent id"), IntentId, FString(TEXT("test-nonce:1")));
	FLongTableClientMessage Sent;
	if (!TestTrue(TEXT("intent decodes"), Harness.DecodeSent(1, Sent))) { return false; }
	TestEqual(TEXT("intent type"), Sent.Type, ELongTableClientMessageType::Intent);
	TestEqual(TEXT("intent id on wire"), Sent.Intent.IntentId, IntentId);
	TestEqual(TEXT("expected version"), Sent.Intent.ExpectedVersion, Version);
	TestEqual(TEXT("intent kind"), Sent.Intent.Intent.Kind, ELongTableIntentKind::Preview);
	TestEqual(TEXT("selection"), Sent.Intent.Intent.Selection.Type, ELongTableSelectionType::Pass);

	// A double-fired confirm produces no second wire intent while one is in flight.
	TestTrue(TEXT("second intent suppressed"), Harness.Client->SubmitIntent(ConfirmIntent()).IsEmpty());
	TestEqual(TEXT("still two frames sent"), Harness.Transport->Sent.Num(), 2);

	Harness.Transport->Inject(ReceiptMessage(Harness.Config.TableId, IntentId, ELongTableIntentKind::Preview, ELongTableOutcome::Accepted, false, ELongTableRejectionCode::EngineRejected, false, Version + 1));
	TestFalse(TEXT("receipt clears in-flight"), Harness.Client->HasIntentInFlight());
	TestTrue(TEXT("local preview held"), Harness.Client->HasLocalPreview());
	TestEqual(TEXT("last receipt outcome"), Harness.Client->GetLastReceipt().Outcome, ELongTableOutcome::Accepted);

	const FString ConfirmId = Harness.Client->SubmitIntent(ConfirmIntent());
	TestEqual(TEXT("confirm id"), ConfirmId, FString(TEXT("test-nonce:2")));
	TestEqual(TEXT("three frames sent"), Harness.Transport->Sent.Num(), 3);
	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FLongTableClientStaleTest, "LongTable.Table.Client.StaleVersionResync", EAutomationTestFlags_ApplicationContextMask | EAutomationTestFlags::ProductFilter)
bool FLongTableClientStaleTest::RunTest(const FString& Parameters)
{
	FClientHarness Harness;
	Harness.Client->Connect();
	Harness.Transport->Inject(WelcomeText(*this));
	const int32 Version = Harness.Client->GetLastAppliedVersion();
	FLongTablePlayerProjection Base;
	if (!LoadPlayerProjection(*this, Base)) { return false; }

	const FString IntentId = Harness.Client->SubmitIntent(ConfirmIntent());
	Harness.Transport->Inject(ReceiptMessage(Harness.Config.TableId, IntentId, ELongTableIntentKind::Confirm, ELongTableOutcome::Rejected, true, ELongTableRejectionCode::StaleVersion, false, Version + 3));

	TestEqual(TEXT("resyncing after stale receipt"), Harness.Client->GetState(), ELongTableConnectionState::Resyncing);
	FLongTableClientMessage Resync;
	if (!TestTrue(TEXT("resync sent"), Harness.DecodeLastSent(Resync))) { return false; }
	TestEqual(TEXT("resync type"), Resync.Type, ELongTableClientMessageType::Resync);
	TestEqual(TEXT("resync last version"), Resync.Resync.LastVersion, Version);

	const int32 Applied = Harness.Client->AppliedFrameCount();
	Harness.Transport->Inject(ProjectionMessage(Base, Version + 3));
	TestEqual(TEXT("ready after projection"), Harness.Client->GetState(), ELongTableConnectionState::Ready);
	TestEqual(TEXT("version advanced"), Harness.Client->GetLastAppliedVersion(), Version + 3);
	TestEqual(TEXT("frame applied"), Harness.Client->AppliedFrameCount(), Applied + 1);

	Harness.Transport->Inject(ProjectionMessage(Base, Version + 1));
	TestEqual(TEXT("older projection ignored"), Harness.Client->GetLastAppliedVersion(), Version + 3);
	TestEqual(TEXT("older projection not applied"), Harness.Client->AppliedFrameCount(), Applied + 1);
	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FLongTableClientReconnectTest, "LongTable.Table.Client.ReconnectAndReplay", EAutomationTestFlags_ApplicationContextMask | EAutomationTestFlags::ProductFilter)
bool FLongTableClientReconnectTest::RunTest(const FString& Parameters)
{
	FClientHarness Harness;
	Harness.Client->Connect();
	const FString Welcome = WelcomeText(*this);
	Harness.Transport->Inject(Welcome);
	const int32 Version = Harness.Client->GetLastAppliedVersion();
	FLongTablePlayerProjection Base;
	if (!LoadPlayerProjection(*this, Base)) { return false; }

	const FString InFlight = Harness.Client->SubmitIntent(PassPreview());
	Harness.Transport->Drop();
	TestEqual(TEXT("disconnected after drop"), Harness.Client->GetState(), ELongTableConnectionState::Disconnected);
	TestTrue(TEXT("intent kept in flight"), Harness.Client->HasIntentInFlight());

	Harness.Client->Connect();
	FLongTableClientMessage Hello;
	if (!TestTrue(TEXT("resume hello sent"), Harness.DecodeLastSent(Hello))) { return false; }
	TestEqual(TEXT("hello type"), Hello.Type, ELongTableClientMessageType::Hello);
	TestTrue(TEXT("hello resumes"), Hello.Hello.bResume);
	TestEqual(TEXT("hello last version"), Hello.Hello.LastVersion, Version);

	const int32 SentBefore = Harness.Transport->Sent.Num();
	Harness.Transport->Inject(Welcome);
	TestEqual(TEXT("ready again"), Harness.Client->GetState(), ELongTableConnectionState::Ready);
	FLongTableClientMessage Resent;
	if (!TestTrue(TEXT("in-flight intent resent"), Harness.DecodeLastSent(Resent))) { return false; }
	TestEqual(TEXT("one frame resent"), Harness.Transport->Sent.Num(), SentBefore + 1);
	TestEqual(TEXT("resent id unchanged"), Resent.Intent.IntentId, InFlight);
	TestEqual(TEXT("resent expected version is current"), Resent.Intent.ExpectedVersion, Harness.Client->GetLastAppliedVersion());

	FLongTableAuthorityMessage Replay;
	Replay.Type = ELongTableAuthorityMessageType::Replay;
	Replay.Replay.TableId = Harness.Config.TableId;
	Replay.Replay.FromVersion = Version;
	Replay.Replay.ToVersion = Version + 2;
	for (int32 Offset = 1; Offset <= 2; ++Offset)
	{
		FLongTableReplayFrame& Frame = Replay.Replay.Frames.AddDefaulted_GetRef();
		Frame.Version = Version + Offset;
		Frame.Projection.Role = ELongTableRole::Player;
		Frame.Projection.Player = Base;
		Frame.Projection.Player.Version = Version + Offset;
	}
	const int32 Applied = Harness.Client->AppliedFrameCount();
	Harness.Transport->Inject(FLongTableProtocolCodec::EncodeAuthorityMessage(Replay));
	TestEqual(TEXT("replay frames applied in order"), Harness.Client->AppliedFrameCount(), Applied + 2);
	TestEqual(TEXT("replay advanced the version"), Harness.Client->GetLastAppliedVersion(), Version + 2);
	TestEqual(TEXT("projection carries the replayed version"), Harness.Client->PlayerProjection().Version, Version + 2);
	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FLongTableClientFailClosedTest, "LongTable.Table.Client.FailsClosedOnNonSchemaFrame", EAutomationTestFlags_ApplicationContextMask | EAutomationTestFlags::ProductFilter)
bool FLongTableClientFailClosedTest::RunTest(const FString& Parameters)
{
	FClientHarness Harness;
	Harness.Client->Connect();
	Harness.Transport->Inject(WelcomeText(*this));
	const int32 Version = Harness.Client->GetLastAppliedVersion();
	const int32 Applied = Harness.Client->AppliedFrameCount();
	FLongTablePlayerProjection Base;
	if (!LoadPlayerProjection(*this, Base)) { return false; }

	// A projection frame with an extra member is dropped in full, even though it carries a newer version.
	FString Text = ProjectionMessage(Base, Version + 5);
	Text.InsertAt(Text.Len() - 1, TEXT(",\"kitty\":[]"));
	Harness.Transport->Inject(Text);
	TestEqual(TEXT("version unchanged"), Harness.Client->GetLastAppliedVersion(), Version);
	TestEqual(TEXT("nothing applied"), Harness.Client->AppliedFrameCount(), Applied);
	TestEqual(TEXT("still ready"), Harness.Client->GetState(), ELongTableConnectionState::Ready);

	Harness.Transport->Inject(TEXT("{not json"));
	TestEqual(TEXT("malformed text ignored"), Harness.Client->AppliedFrameCount(), Applied);
	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FLongTableLocalConfirmGateTest, "LongTable.Table.LocalConfirmGate", EAutomationTestFlags_ApplicationContextMask | EAutomationTestFlags::ProductFilter)
bool FLongTableLocalConfirmGateTest::RunTest(const FString& Parameters)
{
	FLongTablePlayerProjection Projection;
	if (!LoadPlayerProjection(*this, Projection)) { return false; }
	Projection.Seat = ELongTableSeat::South;
	Projection.Turn = ELongTableSeat::South;
	Projection.Phase = ELongTablePhase::Play;
	Projection.bPaused = false;
	Projection.bHasPreviewLabel = false;
	TestFalse(TEXT("no preview, no confirm"), ULongTableTableSubsystem::LocalConfirmGate(Projection, false));
	Projection.bHasPreviewLabel = true;
	TestTrue(TEXT("preview enables confirm"), ULongTableTableSubsystem::LocalConfirmGate(Projection, false));
	TestFalse(TEXT("in-flight intent blocks confirm"), ULongTableTableSubsystem::LocalConfirmGate(Projection, true));
	Projection.Turn = ELongTableSeat::West;
	TestFalse(TEXT("not on turn"), ULongTableTableSubsystem::LocalConfirmGate(Projection, false));
	Projection.Turn = ELongTableSeat::South;
	Projection.Phase = ELongTablePhase::Kitty;
	Projection.DiscardPicked = 5;
	Projection.DiscardTarget = 6;
	TestFalse(TEXT("five picks cannot confirm"), ULongTableTableSubsystem::LocalConfirmGate(Projection, false));
	Projection.DiscardPicked = 6;
	TestTrue(TEXT("six picks can confirm"), ULongTableTableSubsystem::LocalConfirmGate(Projection, false));
	Projection.bPaused = true;
	TestFalse(TEXT("paused blocks confirm"), ULongTableTableSubsystem::LocalConfirmGate(Projection, false));
	return true;
}

#endif // WITH_DEV_AUTOMATION_TESTS
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
