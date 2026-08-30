// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001-R1 | BEGIN]]
/**
 * Loopback automation for the authority client: hello/welcome, intent
 * serialization, duplicate suppression, stale-version resync, reconnect with
 * resume and replay, fail-closed handling of a non-schema frame, authority
 * context isolation, coherence rejection and original-version retry.
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
	const TCHAR* const FixtureTableId = TEXT("table-fixture-1");

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

	bool LoadHostProjection(FAutomationTestBase& Test, FLongTableHostProjection& Out)
	{
		const TSharedPtr<FJsonObject> Fixture = LoadFixtureObject(Test, TEXT("host-projection.json"));
		if (!Fixture.IsValid()) { return false; }
		FLongTableSchemaRejection Rejection;
		return FLongTableProtocolCodec::DecodeHostProjection(Fixture->TryGetField(TEXT("value")), TEXT("host"), Out, Rejection);
	}

	FString ProjectionMessage(FLongTablePlayerProjection Base, int32 EnvelopeVersion, int32 InnerVersion, const FString& EnvelopeTableId = FixtureTableId)
	{
		FLongTableAuthorityMessage Message;
		Message.Type = ELongTableAuthorityMessageType::Projection;
		Message.Projection.TableId = EnvelopeTableId;
		Message.Projection.Version = EnvelopeVersion;
		Base.Version = InnerVersion;
		return FLongTableProtocolCodec::EncodeAuthorityMessage(Message, { FLongTableProtocolCodec::EncodePlayerProjection(Base) });
	}

	FString ProjectionMessage(const FLongTablePlayerProjection& Base, int32 Version)
	{
		return ProjectionMessage(Base, Version, Version);
	}

	FString HostProjectionMessage(FLongTableHostProjection Base, int32 Version)
	{
		FLongTableAuthorityMessage Message;
		Message.Type = ELongTableAuthorityMessageType::Projection;
		Message.Projection.TableId = Base.TableId;
		Message.Projection.Version = Version;
		Base.Version = Version;
		return FLongTableProtocolCodec::EncodeAuthorityMessage(Message, { FLongTableProtocolCodec::EncodeHostProjection(Base) });
	}

	FString PlayerWelcomeText(FLongTablePlayerProjection Base, int32 Version, bool bHasSeat = true, ELongTableSeat WelcomeSeat = ELongTableSeat::South, const FString& TableId = FixtureTableId)
	{
		FLongTableAuthorityMessage Message;
		Message.Type = ELongTableAuthorityMessageType::Welcome;
		Message.Welcome.SessionId = TEXT("session-crafted");
		Message.Welcome.Role = ELongTableRole::Player;
		Message.Welcome.bHasSeat = bHasSeat;
		Message.Welcome.Seat = WelcomeSeat;
		Message.Welcome.TableId = TableId;
		Message.Welcome.Version = Version;
		Message.Welcome.bHasProjection = true;
		Base.Version = Version;
		Base.TableId = TableId;
		return FLongTableProtocolCodec::EncodeAuthorityMessage(Message, { FLongTableProtocolCodec::EncodePlayerProjection(Base) });
	}

	FString HostWelcomeText(FLongTableHostProjection Base, int32 Version, const FString& TableId = FixtureTableId)
	{
		FLongTableAuthorityMessage Message;
		Message.Type = ELongTableAuthorityMessageType::Welcome;
		Message.Welcome.SessionId = TEXT("session-host");
		Message.Welcome.Role = ELongTableRole::Host;
		Message.Welcome.bHasSeat = false;
		Message.Welcome.TableId = TableId;
		Message.Welcome.Version = Version;
		Message.Welcome.bHasProjection = true;
		Base.Version = Version;
		Base.TableId = TableId;
		return FLongTableProtocolCodec::EncodeAuthorityMessage(Message, { FLongTableProtocolCodec::EncodeHostProjection(Base) });
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
		return FLongTableProtocolCodec::EncodeAuthorityMessage(Message, {});
	}

	FLongTableClientConfig PlayerConfig()
	{
		FLongTableClientConfig Config;
		Config.AuthorityUrl = TEXT("ws://127.0.0.1:1");
		Config.Token = TEXT("fixture-token-south");
		Config.Role = ELongTableRole::Player;
		Config.TableId = FixtureTableId;
		Config.DisplayName = TEXT("Ada");
		return Config;
	}

	// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-FINAL-001 | BEGIN]]
	FLongTableClientConfig DealerConfig()
	{
		FLongTableClientConfig Config;
		Config.AuthorityUrl = TEXT("ws://127.0.0.1:1");
		Config.Token = TEXT("fixture-token-dealer");
		Config.Role = ELongTableRole::Dealer;
		Config.TableId = FixtureTableId;
		return Config;
	}

	FString DealerWelcomeText(int32 Version, bool bHasSeat = false, const TCHAR* ProjectionText = nullptr, const FString& TableId = FixtureTableId)
	{
		FLongTableAuthorityMessage Message;
		Message.Type = ELongTableAuthorityMessageType::Welcome;
		Message.Welcome.SessionId = TEXT("session-dealer");
		Message.Welcome.Role = ELongTableRole::Dealer;
		Message.Welcome.bHasSeat = bHasSeat;
		Message.Welcome.Seat = ELongTableSeat::West;
		Message.Welcome.TableId = TableId;
		Message.Welcome.Version = Version;
		Message.Welcome.bHasProjection = ProjectionText != nullptr;
		TArray<FString> Texts;
		if (ProjectionText) { Texts.Add(ProjectionText); }
		return FLongTableProtocolCodec::EncodeAuthorityMessage(Message, Texts);
	}

	FString HostWelcomeWithSeatText(FLongTableHostProjection Base, int32 Version)
	{
		FLongTableAuthorityMessage Message;
		Message.Type = ELongTableAuthorityMessageType::Welcome;
		Message.Welcome.SessionId = TEXT("session-host");
		Message.Welcome.Role = ELongTableRole::Host;
		Message.Welcome.bHasSeat = true;
		Message.Welcome.Seat = ELongTableSeat::South;
		Message.Welcome.TableId = FixtureTableId;
		Message.Welcome.Version = Version;
		Message.Welcome.bHasProjection = true;
		Base.Version = Version;
		Base.TableId = FixtureTableId;
		return FLongTableProtocolCodec::EncodeAuthorityMessage(Message, { FLongTableProtocolCodec::EncodeHostProjection(Base) });
	}

	FString DealerCueText(const FLongTableDealerCueFrame& Frame, const FString& EnvelopeTableId)
	{
		FLongTableAuthorityMessage Message;
		Message.Type = ELongTableAuthorityMessageType::DealerCue;
		Message.DealerCue.TableId = EnvelopeTableId;
		Message.DealerCue.Frame = Frame;
		return FLongTableProtocolCodec::EncodeAuthorityMessage(Message, {});
	}

	FString ReplayText(const FLongTablePlayerProjection& Base, int32 FromVersion, int32 ToVersion, const TArray<int32>& FrameVersions, bool bTruncated = false, const FString& TableId = FixtureTableId)
	{
		FLongTableAuthorityMessage Message;
		Message.Type = ELongTableAuthorityMessageType::Replay;
		Message.Replay.TableId = TableId;
		Message.Replay.FromVersion = FromVersion;
		Message.Replay.ToVersion = ToVersion;
		Message.Replay.bTruncated = bTruncated;
		Message.Replay.FrameVersions = FrameVersions;
		TArray<FString> Texts;
		for (const int32 FrameVersion : FrameVersions)
		{
			FLongTablePlayerProjection Frame = Base;
			Frame.Version = FrameVersion;
			Texts.Add(FLongTableProtocolCodec::EncodePlayerProjection(Frame));
		}
		return FLongTableProtocolCodec::EncodeAuthorityMessage(Message, Texts);
	}
	// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-FINAL-001 | END]]

	struct FClientHarness
	{
		ULongTableAuthorityClient* Client = nullptr;
		TSharedPtr<FLongTableLoopbackTransport> Transport;
		FLongTableClientConfig Config;

		explicit FClientHarness(const FLongTableClientConfig& InConfig = PlayerConfig())
			: Config(InConfig)
		{
			Client = NewObject<ULongTableAuthorityClient>();
			Client->AddToRoot();
			Transport = MakeShared<FLongTableLoopbackTransport>();
			Client->Configure(Config, Transport);
			Client->SetIdentityNonceForTests(TEXT("test-nonce"));
		}

		~FClientHarness()
		{
			Client->RemoveFromRoot();
		}

		/** Rebinds a fresh transport under `NewConfig`; the client decides whether the context changed. */
		void Reconfigure(const FLongTableClientConfig& NewConfig)
		{
			Config = NewConfig;
			Transport = MakeShared<FLongTableLoopbackTransport>();
			Client->Configure(Config, Transport);
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
	TestEqual(TEXT("original expected version kept"), Machine.InFlightVersion(), 3);

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
	Machine.Reset();
	TestFalse(TEXT("reset clears in-flight"), Machine.HasInFlight());
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
	TestEqual(TEXT("hello table"), Hello.Hello.TableId, FString(FixtureTableId));
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
	TestTrue(TEXT("uncommitted revision tracked"), Harness.Client->GetLastUncommittedRevision() >= 0);
	TestTrue(TEXT("host projection is empty for a player client"), Harness.Client->GetHostProjection().TableId.IsEmpty());
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

	// A player-local preview is acknowledged at the same shared version.
	Harness.Transport->Inject(ReceiptMessage(Harness.Config.TableId, IntentId, ELongTableIntentKind::Preview, ELongTableOutcome::Accepted, false, ELongTableRejectionCode::EngineRejected, false, Version));
	TestFalse(TEXT("receipt clears in-flight"), Harness.Client->HasIntentInFlight());
	TestTrue(TEXT("local preview held"), Harness.Client->HasLocalPreview());
	TestEqual(TEXT("last receipt outcome"), Harness.Client->GetLastReceipt().Outcome, ELongTableOutcome::Accepted);

	// The seat's own projection arrives at the same version with a higher uncommitted revision and is applied.
	FLongTablePlayerProjection Base;
	if (!LoadPlayerProjection(*this, Base)) { return false; }
	Base.UncommittedRevision = Harness.Client->GetLastUncommittedRevision() + 1;
	Base.bHasPreviewLabel = true;
	Base.PreviewLabel = TEXT("Pass");
	const int32 Applied = Harness.Client->AppliedFrameCount();
	Harness.Transport->Inject(ProjectionMessage(Base, Version));
	TestEqual(TEXT("same-version player-local projection applied"), Harness.Client->AppliedFrameCount(), Applied + 1);
	TestTrue(TEXT("preview label reached the cache"), Harness.Client->PlayerProjection().bHasPreviewLabel);
	Harness.Transport->Inject(ProjectionMessage(Base, Version));
	TestEqual(TEXT("replayed same revision ignored"), Harness.Client->AppliedFrameCount(), Applied + 1);

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
	TestEqual(TEXT("resent expected version is the original"), Resent.Intent.ExpectedVersion, Version);

	FLongTableAuthorityMessage Replay;
	Replay.Type = ELongTableAuthorityMessageType::Replay;
	Replay.Replay.TableId = Harness.Config.TableId;
	Replay.Replay.FromVersion = Version;
	Replay.Replay.ToVersion = Version + 2;
	TArray<FString> Texts;
	for (int32 Offset = 1; Offset <= 2; ++Offset)
	{
		Replay.Replay.FrameVersions.Add(Version + Offset);
		FLongTablePlayerProjection Frame = Base;
		Frame.Version = Version + Offset;
		Texts.Add(FLongTableProtocolCodec::EncodePlayerProjection(Frame));
	}
	const int32 Applied = Harness.Client->AppliedFrameCount();
	Harness.Transport->Inject(FLongTableProtocolCodec::EncodeAuthorityMessage(Replay, Texts));
	TestEqual(TEXT("replay frames applied in order"), Harness.Client->AppliedFrameCount(), Applied + 2);
	TestEqual(TEXT("replay advanced the version"), Harness.Client->GetLastAppliedVersion(), Version + 2);
	TestEqual(TEXT("projection carries the replayed version"), Harness.Client->PlayerProjection().Version, Version + 2);
	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FLongTableClientRetryOriginalVersionTest, "LongTable.Table.Client.RetryUsesOriginalExpectedVersion", EAutomationTestFlags_ApplicationContextMask | EAutomationTestFlags::ProductFilter)
bool FLongTableClientRetryOriginalVersionTest::RunTest(const FString& Parameters)
{
	FClientHarness Harness;
	Harness.Client->Connect();
	Harness.Transport->Inject(WelcomeText(*this));
	const int32 Version = Harness.Client->GetLastAppliedVersion();
	FLongTablePlayerProjection Base;
	if (!LoadPlayerProjection(*this, Base)) { return false; }

	const FString InFlight = Harness.Client->SubmitIntent(PassPreview());
	TestEqual(TEXT("in-flight expected version recorded"), Harness.Client->InFlightExpectedVersion(), Version);
	Harness.Transport->Inject(ProjectionMessage(Base, Version + 3));
	TestEqual(TEXT("table moved on"), Harness.Client->GetLastAppliedVersion(), Version + 3);

	Harness.Transport->Drop();
	Harness.Client->Connect();
	Harness.Transport->Inject(PlayerWelcomeText(Base, Version + 7));
	TestEqual(TEXT("welcomed at the newer version"), Harness.Client->GetLastAppliedVersion(), Version + 7);
	FLongTableClientMessage Resent;
	if (!TestTrue(TEXT("in-flight intent resent"), Harness.DecodeLastSent(Resent))) { return false; }
	TestEqual(TEXT("resent id unchanged"), Resent.Intent.IntentId, InFlight);
	TestEqual(TEXT("retry carries the original expected version, not the current one"), Resent.Intent.ExpectedVersion, Version);
	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FLongTableClientContextIsolationTest, "LongTable.Table.Client.ContextIsolation", EAutomationTestFlags_ApplicationContextMask | EAutomationTestFlags::ProductFilter)
bool FLongTableClientContextIsolationTest::RunTest(const FString& Parameters)
{
	FClientHarness Harness;
	Harness.Client->Connect();
	Harness.Transport->Inject(WelcomeText(*this));
	const int32 Version = Harness.Client->GetLastAppliedVersion();
	const FString InFlight = Harness.Client->SubmitIntent(PassPreview());
	TestTrue(TEXT("intent in flight before the context change"), Harness.Client->HasIntentInFlight());
	TestTrue(TEXT("player projection cached"), Harness.Client->PlayerProjection().Hand.Num() > 0);
	FLongTableHostProjection HostBase;
	if (!LoadHostProjection(*this, HostBase)) { return false; }

	// A different token and role on the same table is a different authority context.
	FLongTableClientConfig HostConfig = PlayerConfig();
	HostConfig.Token = TEXT("fixture-token-host");
	HostConfig.Role = ELongTableRole::Host;
	HostConfig.DisplayName.Reset();
	Harness.Reconfigure(HostConfig);
	TestEqual(TEXT("disconnected after reconfigure"), Harness.Client->GetState(), ELongTableConnectionState::Disconnected);
	TestEqual(TEXT("version reset"), Harness.Client->GetLastAppliedVersion(), -1);
	TestFalse(TEXT("in-flight intent dropped"), Harness.Client->HasIntentInFlight());
	TestFalse(TEXT("resume marker cleared"), Harness.Client->IsWelcomed());
	TestTrue(TEXT("session cleared"), Harness.Client->GetSessionId().IsEmpty());
	TestFalse(TEXT("seat cleared"), Harness.Client->HasSeat());
	TestEqual(TEXT("player projection cleared"), Harness.Client->GetPlayerProjection().Hand.Num(), 0);
	TestEqual(TEXT("player projection version cleared"), Harness.Client->GetPlayerProjection().Version, 0);
	TestEqual(TEXT("applied frames reset"), Harness.Client->AppliedFrameCount(), 0);
	TestNotEqual(TEXT("intent identity renewed"), Harness.Client->IdentityNonce(), FString(TEXT("test-nonce")));

	Harness.Client->Connect();
	FLongTableClientMessage Hello;
	if (!TestTrue(TEXT("hello sent"), Harness.DecodeLastSent(Hello))) { return false; }
	TestEqual(TEXT("hello role is host"), Hello.Hello.Role, ELongTableRole::Host);
	TestFalse(TEXT("no cross-context resume"), Hello.Hello.bResume);
	Harness.Transport->Inject(HostWelcomeText(HostBase, 9));
	TestEqual(TEXT("host welcomed"), Harness.Client->GetState(), ELongTableConnectionState::Ready);
	TestEqual(TEXT("host version"), Harness.Client->GetLastAppliedVersion(), 9);
	TestEqual(TEXT("host projection cached"), Harness.Client->GetHostProjection().Version, 9);
	TestEqual(TEXT("no player projection for a host client"), Harness.Client->GetPlayerProjection().Version, 0);
	TestEqual(TEXT("no cross-context in-flight replay"), Harness.Transport->Sent.Num(), 1);

	// The same context on a fresh transport keeps its state and resumes.
	Harness.Reconfigure(HostConfig);
	TestEqual(TEXT("same context keeps the version"), Harness.Client->GetLastAppliedVersion(), 9);
	TestTrue(TEXT("same context keeps the resume marker"), Harness.Client->IsWelcomed());
	Harness.Client->Connect();
	if (!TestTrue(TEXT("resume hello sent"), Harness.DecodeLastSent(Hello))) { return false; }
	TestTrue(TEXT("same context resumes"), Hello.Hello.bResume);
	TestEqual(TEXT("resume version"), Hello.Hello.LastVersion, 9);

	// A different table is a different context even with the same token and role.
	FLongTableClientConfig OtherTable = HostConfig;
	OtherTable.TableId = TEXT("table-other");
	Harness.Reconfigure(OtherTable);
	TestEqual(TEXT("other table resets the version"), Harness.Client->GetLastAppliedVersion(), -1);
	TestEqual(TEXT("other table clears the host cache"), Harness.Client->GetHostProjection().Version, 0);
	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FLongTableClientIncoherentFramesTest, "LongTable.Table.Client.RejectsIncoherentFrames", EAutomationTestFlags_ApplicationContextMask | EAutomationTestFlags::ProductFilter)
bool FLongTableClientIncoherentFramesTest::RunTest(const FString& Parameters)
{
	FClientHarness Harness;
	Harness.Client->Connect();
	Harness.Transport->Inject(WelcomeText(*this));
	const int32 Version = Harness.Client->GetLastAppliedVersion();
	const int32 Applied = Harness.Client->AppliedFrameCount();
	const FString Session = Harness.Client->GetSessionId();
	FLongTablePlayerProjection Base;
	FLongTableHostProjection HostBase;
	if (!LoadPlayerProjection(*this, Base) || !LoadHostProjection(*this, HostBase)) { return false; }

	auto Unchanged = [&](const TCHAR* What)
	{
		TestEqual(FString::Printf(TEXT("%s: version unchanged"), What), Harness.Client->GetLastAppliedVersion(), Version);
		TestEqual(FString::Printf(TEXT("%s: nothing applied"), What), Harness.Client->AppliedFrameCount(), Applied);
		TestEqual(FString::Printf(TEXT("%s: session unchanged"), What), Harness.Client->GetSessionId(), Session);
		TestEqual(FString::Printf(TEXT("%s: still ready"), What), Harness.Client->GetState(), ELongTableConnectionState::Ready);
		TestEqual(FString::Printf(TEXT("%s: no host cache"), What), Harness.Client->GetHostProjection().Version, 0);
	};

	Harness.Transport->Inject(HostWelcomeText(HostBase, Version + 1));
	Unchanged(TEXT("welcome for another role"));

	Harness.Transport->Inject(PlayerWelcomeText(Base, Version + 1, true, ELongTableSeat::South, TEXT("table-other")));
	Unchanged(TEXT("welcome for another table"));

	Harness.Transport->Inject(PlayerWelcomeText(Base, Version + 1, false));
	Unchanged(TEXT("player welcome without a seat"));

	Harness.Transport->Inject(PlayerWelcomeText(Base, Version + 1, true, ELongTableSeat::West));
	Unchanged(TEXT("welcome whose projection seat differs from the welcomed seat"));

	Harness.Transport->Inject(ProjectionMessage(Base, Version + 5, Version + 5, TEXT("table-other")));
	Unchanged(TEXT("projection for another table"));

	Harness.Transport->Inject(ProjectionMessage(Base, Version + 5, Version + 4));
	Unchanged(TEXT("envelope version differs from projection version"));

	HostBase.TableId = FixtureTableId;
	Harness.Transport->Inject(HostProjectionMessage(HostBase, Version + 5));
	Unchanged(TEXT("host payload on a player connection"));

	FLongTablePlayerProjection WestBase = Base;
	WestBase.Seat = ELongTableSeat::West;
	Harness.Transport->Inject(ProjectionMessage(WestBase, Version + 5));
	Unchanged(TEXT("projection for another seat"));

	FLongTableAuthorityMessage Replay;
	Replay.Type = ELongTableAuthorityMessageType::Replay;
	Replay.Replay.TableId = FixtureTableId;
	Replay.Replay.FromVersion = Version;
	Replay.Replay.ToVersion = Version + 2;
	Replay.Replay.FrameVersions = { Version + 1, Version + 2 };
	FLongTablePlayerProjection Good = Base;
	Good.Version = Version + 1;
	FLongTablePlayerProjection Bad = Base;
	Bad.Version = Version + 9;
	Harness.Transport->Inject(FLongTableProtocolCodec::EncodeAuthorityMessage(Replay, { FLongTableProtocolCodec::EncodePlayerProjection(Good), FLongTableProtocolCodec::EncodePlayerProjection(Bad) }));
	Unchanged(TEXT("replay with one incoherent frame applies nothing"));

	// A coherent frame still applies afterwards, proving the client was not wedged.
	Harness.Transport->Inject(ProjectionMessage(Base, Version + 5));
	TestEqual(TEXT("coherent frame applied"), Harness.Client->GetLastAppliedVersion(), Version + 5);
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

	// A projection envelope with an extra member is dropped in full, even though it carries a newer version.
	FString Text = ProjectionMessage(Base, Version + 5);
	Text.InsertAt(Text.Len() - 1, TEXT(",\"kitty\":[]"));
	Harness.Transport->Inject(Text);
	TestEqual(TEXT("version unchanged"), Harness.Client->GetLastAppliedVersion(), Version);
	TestEqual(TEXT("nothing applied"), Harness.Client->AppliedFrameCount(), Applied);
	TestEqual(TEXT("still ready"), Harness.Client->GetState(), ELongTableConnectionState::Ready);

	// A projection payload with an extra member is dropped at extraction, before any state changes.
	FString Inner = FLongTableProtocolCodec::EncodePlayerProjection(Base);
	Inner.InsertAt(Inner.Len() - 1, TEXT(",\"kitty\":[]"));
	FLongTableAuthorityMessage Message;
	Message.Type = ELongTableAuthorityMessageType::Projection;
	Message.Projection.TableId = FixtureTableId;
	Message.Projection.Version = Version + 6;
	Harness.Transport->Inject(FLongTableProtocolCodec::EncodeAuthorityMessage(Message, { Inner }));
	TestEqual(TEXT("payload rejection applies nothing"), Harness.Client->AppliedFrameCount(), Applied);
	TestEqual(TEXT("payload rejection leaves the version"), Harness.Client->GetLastAppliedVersion(), Version);

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

// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-FINAL-001 | BEGIN]]

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FLongTableClientContextCollisionTest, "LongTable.Table.Client.ContextTuplesNeverCollide", EAutomationTestFlags_ApplicationContextMask | EAutomationTestFlags::ProductFilter)
bool FLongTableClientContextCollisionTest::RunTest(const FString& Parameters)
{
	FLongTablePlayerProjection Base;
	if (!LoadPlayerProjection(*this, Base)) { return false; }

	// Two contexts whose old delimiter-joined identity was one identical
	// string: (url "ws://h|tok", token "x") versus (url "ws://h", token
	// "tok|x"). Structural comparison keeps them distinct.
	FLongTableClientConfig ConfigA = PlayerConfig();
	ConfigA.AuthorityUrl = TEXT("ws://h|tok");
	ConfigA.Token = TEXT("x");
	FLongTableClientConfig ConfigB = PlayerConfig();
	ConfigB.AuthorityUrl = TEXT("ws://h");
	ConfigB.Token = TEXT("tok|x");

	FClientHarness Harness(ConfigA);
	Harness.Client->Connect();
	Harness.Transport->Inject(PlayerWelcomeText(Base, 9));
	TestEqual(TEXT("welcomed under context A"), Harness.Client->GetLastAppliedVersion(), 9);
	TestTrue(TEXT("resume marker held under context A"), Harness.Client->IsWelcomed());

	Harness.Reconfigure(ConfigB);
	TestEqual(TEXT("colliding tuple resets the version independently"), Harness.Client->GetLastAppliedVersion(), -1);
	TestFalse(TEXT("colliding tuple clears the resume marker"), Harness.Client->IsWelcomed());
	TestEqual(TEXT("colliding tuple clears the projection cache"), Harness.Client->GetPlayerProjection().Version, 0);
	Harness.Client->Connect();
	FLongTableClientMessage Hello;
	if (!TestTrue(TEXT("hello sent under context B"), Harness.DecodeLastSent(Hello))) { return false; }
	TestFalse(TEXT("no cross-context resume between colliding tuples"), Hello.Hello.bResume);

	// A context differing only by token character case is a different context.
	Harness.Transport->Inject(PlayerWelcomeText(Base, 4));
	TestEqual(TEXT("welcomed under context B"), Harness.Client->GetLastAppliedVersion(), 4);
	FLongTableClientConfig ConfigC = ConfigB;
	ConfigC.Token = TEXT("TOK|X");
	Harness.Reconfigure(ConfigC);
	TestEqual(TEXT("case-differing token resets the context"), Harness.Client->GetLastAppliedVersion(), -1);
	TestFalse(TEXT("case-differing token clears the resume marker"), Harness.Client->IsWelcomed());
	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FLongTableClientReentrantWelcomeTest, "LongTable.Table.Client.ReentrantWelcomeCannotContaminateNewContext", EAutomationTestFlags_ApplicationContextMask | EAutomationTestFlags::ProductFilter)
bool FLongTableClientReentrantWelcomeTest::RunTest(const FString& Parameters)
{
	FLongTablePlayerProjection Base;
	if (!LoadPlayerProjection(*this, Base)) { return false; }

	// First: every welcome callback observes one fully committed context.
	{
		FClientHarness Harness;
		ULongTableAuthorityCallbackProbe* Probe = NewObject<ULongTableAuthorityCallbackProbe>();
		Probe->AddToRoot();
		Harness.Client->OnPlayerProjection.AddDynamic(Probe, &ULongTableAuthorityCallbackProbe::HandlePlayerProjection);
		bool bObservedCommitted = false;
		Probe->OnEvent = [&]()
		{
			bObservedCommitted = !Harness.Client->GetSessionId().IsEmpty()
				&& Harness.Client->IsWelcomed()
				&& Harness.Client->GetState() == ELongTableConnectionState::Ready
				&& Harness.Client->GetLastAppliedVersion() == Harness.Client->PlayerProjection().Version;
		};
		Harness.Client->Connect();
		Harness.Transport->Inject(WelcomeText(*this));
		TestEqual(TEXT("welcome projection callback fired once"), Probe->PlayerVersions.Num(), 1);
		TestTrue(TEXT("callback observed a fully committed welcome"), bObservedCommitted);
		Harness.Client->OnPlayerProjection.RemoveAll(Probe);
		Probe->RemoveFromRoot();
	}

	// Second: a handler that reconfigures the client mid-welcome cannot leak
	// the old frame's continuation — the in-flight resend included — into the
	// newly configured context.
	{
		FClientHarness Harness;
		Harness.Client->Connect();
		Harness.Transport->Inject(WelcomeText(*this));
		const FString InFlight = Harness.Client->SubmitIntent(PassPreview());
		TestFalse(TEXT("intent in flight before the drop"), InFlight.IsEmpty());
		Harness.Transport->Drop();
		Harness.Client->Connect();
		const int32 SentOnOldTransport = Harness.Transport->Sent.Num();
		TSharedPtr<FLongTableLoopbackTransport> OldTransport = Harness.Transport;

		FLongTableClientConfig NewContext = PlayerConfig();
		NewContext.Token = TEXT("fixture-token-host");
		NewContext.Role = ELongTableRole::Host;

		ULongTableAuthorityCallbackProbe* Probe = NewObject<ULongTableAuthorityCallbackProbe>();
		Probe->AddToRoot();
		Harness.Client->OnConnectionState.AddDynamic(Probe, &ULongTableAuthorityCallbackProbe::HandleConnectionState);
		bool bReconfigured = false;
		Probe->OnEvent = [&]()
		{
			if (!bReconfigured && Probe->States.Num() > 0 && Probe->States.Last() == ELongTableConnectionState::Ready)
			{
				bReconfigured = true;
				Harness.Reconfigure(NewContext);
			}
		};
		OldTransport->Inject(WelcomeText(*this));
		TestTrue(TEXT("handler reconfigured the client mid-welcome"), bReconfigured);
		// The old frame aborted: nothing was resent on the old transport and
		// nothing at all reached the new context's transport.
		TestEqual(TEXT("no in-flight resend leaked to the old transport"), OldTransport->Sent.Num(), SentOnOldTransport);
		TestEqual(TEXT("nothing reached the new context's transport"), Harness.Transport->Sent.Num(), 0);
		TestEqual(TEXT("new context starts disconnected"), Harness.Client->GetState(), ELongTableConnectionState::Disconnected);
		TestEqual(TEXT("new context holds no version"), Harness.Client->GetLastAppliedVersion(), -1);
		TestFalse(TEXT("new context holds no resume marker"), Harness.Client->IsWelcomed());
		TestFalse(TEXT("old in-flight intent did not survive into the new context"), Harness.Client->HasIntentInFlight());
		Harness.Client->OnConnectionState.RemoveAll(Probe);
		Probe->RemoveFromRoot();
	}
	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FLongTableClientWelcomeMonotonicTest, "LongTable.Table.Client.WelcomeNeverRollsBackwards", EAutomationTestFlags_ApplicationContextMask | EAutomationTestFlags::ProductFilter)
bool FLongTableClientWelcomeMonotonicTest::RunTest(const FString& Parameters)
{
	FLongTablePlayerProjection Base;
	if (!LoadPlayerProjection(*this, Base)) { return false; }
	FClientHarness Harness;
	Harness.Client->Connect();

	FLongTablePlayerProjection Rich = Base;
	Rich.UncommittedRevision = 5;
	Rich.bHasPreviewLabel = true;
	Rich.PreviewLabel = TEXT("Keep Me");
	Harness.Transport->Inject(PlayerWelcomeText(Rich, 9));
	TestEqual(TEXT("welcomed at version 9"), Harness.Client->GetLastAppliedVersion(), 9);
	TestEqual(TEXT("revision committed"), Harness.Client->GetLastUncommittedRevision(), 5);
	const int32 Applied = Harness.Client->AppliedFrameCount();

	// An older welcome in the same context cannot roll anything backwards.
	Harness.Transport->Inject(PlayerWelcomeText(Base, 4));
	TestEqual(TEXT("older welcome leaves the version"), Harness.Client->GetLastAppliedVersion(), 9);
	TestEqual(TEXT("older welcome applies nothing"), Harness.Client->AppliedFrameCount(), Applied);
	TestTrue(TEXT("older welcome leaves the cached preview"), Harness.Client->PlayerProjection().bHasPreviewLabel);
	TestEqual(TEXT("older welcome leaves the revision"), Harness.Client->GetLastUncommittedRevision(), 5);

	// An equal-version welcome with an older snapshot revision commits the
	// session but leaves the newer cached projection in place.
	FLongTablePlayerProjection Stale = Base;
	Stale.UncommittedRevision = 3;
	Stale.bHasPreviewLabel = false;
	Harness.Transport->Inject(PlayerWelcomeText(Stale, 9));
	TestEqual(TEXT("equal-version welcome keeps the version"), Harness.Client->GetLastAppliedVersion(), 9);
	TestEqual(TEXT("equal-version welcome cannot reduce the revision"), Harness.Client->GetLastUncommittedRevision(), 5);
	TestTrue(TEXT("equal-version welcome cannot roll the projection back"), Harness.Client->PlayerProjection().bHasPreviewLabel);
	TestEqual(TEXT("still ready"), Harness.Client->GetState(), ELongTableConnectionState::Ready);

	// The resume position never goes backwards either.
	Harness.Transport->Drop();
	Harness.Client->Connect();
	FLongTableClientMessage Hello;
	if (!TestTrue(TEXT("resume hello sent"), Harness.DecodeLastSent(Hello))) { return false; }
	TestTrue(TEXT("hello resumes"), Hello.Hello.bResume);
	TestEqual(TEXT("resume position is the newest applied version"), Hello.Hello.LastVersion, 9);
	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FLongTableClientResyncCoherenceTest, "LongTable.Table.Client.ResyncFailsClosedUntilCoherentNewerState", EAutomationTestFlags_ApplicationContextMask | EAutomationTestFlags::ProductFilter)
bool FLongTableClientResyncCoherenceTest::RunTest(const FString& Parameters)
{
	FLongTablePlayerProjection Base;
	if (!LoadPlayerProjection(*this, Base)) { return false; }
	FClientHarness Harness;
	Harness.Client->Connect();
	Harness.Transport->Inject(WelcomeText(*this));
	const int32 Version = Harness.Client->GetLastAppliedVersion();

	const FString IntentId = Harness.Client->SubmitIntent(ConfirmIntent());
	Harness.Transport->Inject(ReceiptMessage(Harness.Config.TableId, IntentId, ELongTableIntentKind::Confirm, ELongTableOutcome::Rejected, true, ELongTableRejectionCode::StaleVersion, false, Version + 4));
	TestEqual(TEXT("resyncing after the stale receipt"), Harness.Client->GetState(), ELongTableConnectionState::Resyncing);
	const int32 Applied = Harness.Client->AppliedFrameCount();

	auto StillResyncing = [&](const TCHAR* What)
	{
		TestEqual(FString::Printf(TEXT("%s: still resyncing"), What), Harness.Client->GetState(), ELongTableConnectionState::Resyncing);
		TestEqual(FString::Printf(TEXT("%s: version unchanged"), What), Harness.Client->GetLastAppliedVersion(), Version);
		TestEqual(FString::Printf(TEXT("%s: nothing applied"), What), Harness.Client->AppliedFrameCount(), Applied);
	};

	// Empty coverage: nothing newer than the resync base.
	Harness.Transport->Inject(ReplayText(Base, Version, Version, {}));
	StillResyncing(TEXT("empty replay"));

	// Stale coverage that ends at or before the applied version.
	Harness.Transport->Inject(ReplayText(Base, Version - 1, Version, { Version }));
	StillResyncing(TEXT("stale replay"));

	// A range that starts beyond the applied version would skip versions.
	Harness.Transport->Inject(ReplayText(Base, Version + 2, Version + 4, { Version + 3, Version + 4 }));
	StillResyncing(TEXT("gapped range"));

	// Frames that do not cover the declared range.
	Harness.Transport->Inject(ReplayText(Base, Version, Version + 3, { Version + 1, Version + 2 }));
	StillResyncing(TEXT("incomplete coverage"));

	// Disordered frames.
	Harness.Transport->Inject(ReplayText(Base, Version, Version + 2, { Version + 2, Version + 1 }));
	StillResyncing(TEXT("disordered frames"));

	// A truncated replay never substitutes for coherent coverage.
	Harness.Transport->Inject(ReplayText(Base, Version, Version + 2, { Version + 1, Version + 2 }, true));
	StillResyncing(TEXT("truncated replay"));

	// Only coherent newer coverage exits Resyncing.
	Harness.Transport->Inject(ReplayText(Base, Version, Version + 2, { Version + 1, Version + 2 }));
	TestEqual(TEXT("coherent replay exits resyncing"), Harness.Client->GetState(), ELongTableConnectionState::Ready);
	TestEqual(TEXT("coherent replay advanced the version"), Harness.Client->GetLastAppliedVersion(), Version + 2);
	TestEqual(TEXT("coherent replay applied both frames"), Harness.Client->AppliedFrameCount(), Applied + 2);
	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FLongTableClientWelcomeCrossoverTest, "LongTable.Table.Client.WelcomeCrossoversFailClosed", EAutomationTestFlags_ApplicationContextMask | EAutomationTestFlags::ProductFilter)
bool FLongTableClientWelcomeCrossoverTest::RunTest(const FString& Parameters)
{
	FLongTablePlayerProjection Base;
	FLongTableHostProjection HostBase;
	if (!LoadPlayerProjection(*this, Base) || !LoadHostProjection(*this, HostBase)) { return false; }

	// Decode-level: every seat/projection crossover is rejected with the exact
	// TypeScript code and path before any envelope is produced.
	{
		FLongTableAuthorityMessage Out;
		FLongTableSchemaRejection Rejection;
		TestFalse(TEXT("host welcome with a seat rejected at decode"), FLongTableProtocolCodec::DecodeAuthorityMessageText(HostWelcomeWithSeatText(HostBase, 3), Out, Rejection));
		TestEqual(TEXT("host welcome with a seat code"), Rejection.Code, FString(TEXT("value-out-of-range")));
		TestEqual(TEXT("host welcome with a seat path"), Rejection.Path, FString(TEXT("authority.seat")));

		TestFalse(TEXT("player welcome without a seat rejected at decode"), FLongTableProtocolCodec::DecodeAuthorityMessageText(PlayerWelcomeText(Base, 3, false), Out, Rejection));
		TestEqual(TEXT("player welcome without a seat code"), Rejection.Code, FString(TEXT("type-mismatch")));
		TestEqual(TEXT("player welcome without a seat path"), Rejection.Path, FString(TEXT("authority.seat")));

		FLongTablePlayerProjection Crafted = Base;
		Crafted.Version = 3;
		Crafted.TableId = FixtureTableId;
		TestFalse(TEXT("dealer welcome with a projection rejected at decode"), FLongTableProtocolCodec::DecodeAuthorityMessageText(DealerWelcomeText(3, false, *FLongTableProtocolCodec::EncodePlayerProjection(Crafted)), Out, Rejection));
		TestEqual(TEXT("dealer welcome with a projection code"), Rejection.Code, FString(TEXT("value-out-of-range")));
		TestEqual(TEXT("dealer welcome with a projection path"), Rejection.Path, FString(TEXT("authority.projection")));
	}

	// Client-level: the crafted frames change no client-visible state.
	FClientHarness Harness;
	Harness.Client->Connect();
	Harness.Transport->Inject(WelcomeText(*this));
	const int32 Version = Harness.Client->GetLastAppliedVersion();
	const int32 Applied = Harness.Client->AppliedFrameCount();
	const FString Session = Harness.Client->GetSessionId();

	for (const FString& Crafted : {
		HostWelcomeWithSeatText(HostBase, Version + 1),
		PlayerWelcomeText(Base, Version + 1, false),
		DealerWelcomeText(Version + 1) })
	{
		Harness.Transport->Inject(Crafted);
		TestEqual(TEXT("crossover: version unchanged"), Harness.Client->GetLastAppliedVersion(), Version);
		TestEqual(TEXT("crossover: nothing applied"), Harness.Client->AppliedFrameCount(), Applied);
		TestEqual(TEXT("crossover: session unchanged"), Harness.Client->GetSessionId(), Session);
		TestEqual(TEXT("crossover: still ready"), Harness.Client->GetState(), ELongTableConnectionState::Ready);
	}
	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FLongTableClientDealerCueTableTest, "LongTable.Table.Client.DealerCueTableCoherence", EAutomationTestFlags_ApplicationContextMask | EAutomationTestFlags::ProductFilter)
bool FLongTableClientDealerCueTableTest::RunTest(const FString& Parameters)
{
	const TSharedPtr<FJsonObject> Fixture = LoadFixtureObject(*this, TEXT("dealer-cues.json"));
	if (!Fixture.IsValid()) { return false; }
	FLongTableDealerCueFrame Frame;
	FLongTableSchemaRejection Rejection;
	if (!TestTrue(TEXT("fixture cue decodes"), FLongTableProtocolCodec::DecodeDealerCueFrame(Fixture->GetArrayField(TEXT("frames"))[0], TEXT("cue"), Frame, Rejection))) { return false; }

	FClientHarness Harness{ DealerConfig() };
	ULongTableAuthorityCallbackProbe* Probe = NewObject<ULongTableAuthorityCallbackProbe>();
	Probe->AddToRoot();
	Harness.Client->OnDealerCue.AddDynamic(Probe, &ULongTableAuthorityCallbackProbe::HandleDealerCue);
	Harness.Client->Connect();
	Harness.Transport->Inject(DealerWelcomeText(3));
	TestEqual(TEXT("dealer welcomed"), Harness.Client->GetState(), ELongTableConnectionState::Ready);

	// Coherent: inner frame table equals the envelope table and the configured table.
	Harness.Transport->Inject(DealerCueText(Frame, FixtureTableId));
	TestEqual(TEXT("coherent cue broadcast"), Probe->CueTableIds.Num(), 1);

	// A decode-level rejection: the inner frame's table differs from the envelope's.
	FLongTableDealerCueFrame Foreign = Frame;
	Foreign.TableId = TEXT("table-elsewhere");
	FLongTableAuthorityMessage Out;
	TestFalse(TEXT("mismatched inner table rejected at decode"), FLongTableProtocolCodec::DecodeAuthorityMessageText(DealerCueText(Foreign, FixtureTableId), Out, Rejection));
	TestEqual(TEXT("mismatched inner table code"), Rejection.Code, FString(TEXT("value-out-of-range")));
	TestEqual(TEXT("mismatched inner table path"), Rejection.Path, FString(TEXT("authority.frame.tableId")));
	Harness.Transport->Inject(DealerCueText(Foreign, FixtureTableId));
	TestEqual(TEXT("mismatched inner table never broadcast"), Probe->CueTableIds.Num(), 1);

	// Coherent with each other but for another table entirely: dropped by the client.
	Harness.Transport->Inject(DealerCueText(Foreign, TEXT("table-elsewhere")));
	TestEqual(TEXT("foreign table cue never broadcast"), Probe->CueTableIds.Num(), 1);

	Harness.Client->OnDealerCue.RemoveAll(Probe);
	Probe->RemoveFromRoot();
	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FLongTablePlayerCounterfactualTest, "LongTable.Table.PlayerCounterfactual", EAutomationTestFlags_ApplicationContextMask | EAutomationTestFlags::ProductFilter)
bool FLongTablePlayerCounterfactualTest::RunTest(const FString& Parameters)
{
	const TSharedPtr<FJsonObject> Fixture = LoadFixtureObject(*this, TEXT("counterfactual.json"));
	if (!Fixture.IsValid()) { return false; }

	// Non-vacuity first: the fixture's concealed source inputs really differ
	// between the live state and each counterfactual, and the entitled hand
	// really was retained.
	const TSharedPtr<FJsonObject> SourceDigests = Fixture->GetObjectField(TEXT("concealedSourceDigests"));
	const FString Actual = SourceDigests->GetStringField(TEXT("actual"));
	TestNotEqual(TEXT("all-hands counterfactual inputs differ"), SourceDigests->GetStringField(TEXT("allHandsCounterfactual")), Actual);
	TestNotEqual(TEXT("entitled counterfactual inputs differ"), SourceDigests->GetStringField(TEXT("entitledCounterfactual")), Actual);
	const TSharedPtr<FJsonObject> HandDigests = Fixture->GetObjectField(TEXT("entitledHandDigests"));
	TestEqual(TEXT("entitled hand retained"), HandDigests->GetStringField(TEXT("entitledCounterfactual")), HandDigests->GetStringField(TEXT("actual")));

	const TSharedPtr<FJsonObject> PlayerPair = Fixture->GetObjectField(TEXT("player"));
	TestEqual(TEXT("entitled seat"), PlayerPair->GetStringField(TEXT("seat")), FString(TEXT("south")));
	FLongTablePlayerProjection PlayerActual, PlayerCounterfactual;
	FLongTableSchemaRejection Rejection;
	TestTrue(TEXT("player actual decodes"), FLongTableProtocolCodec::DecodePlayerProjection(PlayerPair->TryGetField(TEXT("actual")), TEXT("player"), PlayerActual, Rejection));
	TestTrue(TEXT("player counterfactual decodes"), FLongTableProtocolCodec::DecodePlayerProjection(PlayerPair->TryGetField(TEXT("counterfactual")), TEXT("player"), PlayerCounterfactual, Rejection));
	TestTrue(TEXT("entitled projection byte-identical when every non-entitled hand and concealed input changes"),
		FLongTableProtocolCodec::Utf8BytesEqual(FLongTableProtocolCodec::EncodePlayerProjection(PlayerActual), FLongTableProtocolCodec::EncodePlayerProjection(PlayerCounterfactual)));
	return true;
}

// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-FINAL-001 | END]]

#endif // WITH_DEV_AUTOMATION_TESTS
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001-R1 | END]]
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
