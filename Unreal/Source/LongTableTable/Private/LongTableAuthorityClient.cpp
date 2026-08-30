// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001-R1 | BEGIN]]
#include "LongTableAuthorityClient.h"
#include "LongTableJson.h"
#include "LongTableTableModule.h"

namespace
{
	const FLongTablePlayerProjection EmptyPlayer;
	const FLongTableHostProjection EmptyHost;
	const FLongTablePublicProjection EmptyPublic;
}

// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | BEGIN]]
/**
 * Per-listener generation guard. UE5.7's Broadcast() copies the whole
 * invocation list before ordinary invocation, so a reentrant Configure inside
 * listener one cannot prevent listener two from seeing an old-context payload.
 * This adapter copies the invocation list itself (one snapshot per fanout),
 * invokes one copied binding at a time through the matching single dynamic
 * delegate, and re-checks the context generation before each next binding —
 * so the first reentrant context change stops every later sibling.
 */
template <typename MulticastType, typename SingleType, typename... TArgs>
bool ULongTableAuthorityClient::BroadcastGuarded(const MulticastType& Delegate, TArgs&&... Args)
{
	const uint64 Generation = ContextGeneration;
	// A by-value copy of the invocation list: the snapshot the guard walks.
	const auto Snapshot = Delegate.GetInvocationList();
	for (const auto& Binding : Snapshot)
	{
		if (ContextGeneration != Generation)
		{
			return false;
		}
		UObject* Target = Binding.GetUObject();
		if (!Target)
		{
			continue;
		}
		SingleType Single;
		Single.BindUFunction(Target, Binding.GetFunctionName());
		Single.ExecuteIfBound(Args...);
	}
	return ContextGeneration == Generation;
}
// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | END]]

// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-FINAL-001 | BEGIN]]
bool ULongTableAuthorityClient::SameAuthorityContext(const FLongTableClientConfig& A, const FLongTableClientConfig& B)
{
	// Structural, field-by-field, case-sensitive equality. There is no joined
	// key, so no url/token/role/table pair can collide across field
	// boundaries, and contexts differing only by character case stay distinct.
	return A.AuthorityUrl.Equals(B.AuthorityUrl, ESearchCase::CaseSensitive)
		&& A.Token.Equals(B.Token, ESearchCase::CaseSensitive)
		&& A.Role == B.Role
		&& A.TableId.Equals(B.TableId, ESearchCase::CaseSensitive);
}

void ULongTableAuthorityClient::ResetContext()
{
	// A new generation: any continuation still on the stack for the previous
	// context aborts at its next generation check.
	++ContextGeneration;
	PlayerCache = FLongTablePlayerProjection();
	HostCache = FLongTableHostProjection();
	PublicCache = FLongTablePublicProjection();
	LastReceipt = FLongTableIntentReceipt();
	SessionId.Reset();
	bHasSeat = false;
	Seat = ELongTableSeat::South;
	LastAppliedVersion = -1;
	LastUncommittedRevision = -1;
	ResyncBaseVersion = -1;
	bEverWelcomed = false;
	AppliedFrames = 0;
	Commit.Reset();
	Identity.Reset();
}

void ULongTableAuthorityClient::Configure(const FLongTableClientConfig& InConfig, TSharedPtr<ILongTableTransport> InTransport)
{
	if (Transport.IsValid())
	{
		Transport->OnConnected.RemoveAll(this);
		Transport->OnMessage.RemoveAll(this);
		Transport->OnClosed.RemoveAll(this);
		Transport->OnError.RemoveAll(this);
		Transport->Close();
	}
	if (!bHasActiveContext || !SameAuthorityContext(InConfig, ActiveConfig))
	{
		ResetContext();
	}
	ActiveConfig = InConfig;
	bHasActiveContext = true;
	Config = InConfig;
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-FINAL-001 | END]]
	Transport = InTransport;
	if (Transport.IsValid())
	{
		Transport->OnConnected.AddUObject(this, &ULongTableAuthorityClient::HandleConnected);
		Transport->OnMessage.AddUObject(this, &ULongTableAuthorityClient::HandleMessage);
		Transport->OnClosed.AddUObject(this, &ULongTableAuthorityClient::HandleClosed);
		Transport->OnError.AddUObject(this, &ULongTableAuthorityClient::HandleError);
	}
	SetState(ELongTableConnectionState::Disconnected);
}

const FLongTablePlayerProjection& ULongTableAuthorityClient::PlayerProjection() const
{
	return Config.Role == ELongTableRole::Player ? PlayerCache : EmptyPlayer;
}

const FLongTableHostProjection& ULongTableAuthorityClient::HostProjection() const
{
	return Config.Role == ELongTableRole::Host ? HostCache : EmptyHost;
}

const FLongTablePublicProjection& ULongTableAuthorityClient::PublicProjection() const
{
	return Config.Role == ELongTableRole::Public ? PublicCache : EmptyPublic;
}

void ULongTableAuthorityClient::SetState(ELongTableConnectionState NewState)
{
	if (State != NewState)
	{
		State = NewState;
		// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | BEGIN]]
		BroadcastGuarded<FLongTableConnectionStateEvent, FLongTableConnectionStateSingle>(OnConnectionState, State);
		// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | END]]
	}
}

void ULongTableAuthorityClient::Connect()
{
	if (!Transport.IsValid())
	{
		UE_LOG(LogLongTableTable, Error, TEXT("Connect called without a transport"));
		return;
	}
	if (State != ELongTableConnectionState::Disconnected)
	{
		return;
	}
	SetState(ELongTableConnectionState::Connecting);
	Transport->Connect(Config.AuthorityUrl);
}

void ULongTableAuthorityClient::Disconnect()
{
	if (Transport.IsValid())
	{
		Transport->Close();
	}
	SetState(ELongTableConnectionState::Disconnected);
}

void ULongTableAuthorityClient::HandleConnected()
{
	SendHello();
}

void ULongTableAuthorityClient::SendHello()
{
	FLongTableClientMessage Message;
	Message.Type = ELongTableClientMessageType::Hello;
	Message.Hello.Token = Config.Token;
	Message.Hello.Role = Config.Role;
	Message.Hello.TableId = Config.TableId;
	Message.Hello.DisplayName = Config.DisplayName;
	Message.Hello.bResume = bEverWelcomed && LastAppliedVersion >= 0;
	Message.Hello.LastVersion = Message.Hello.bResume ? LastAppliedVersion : 0;
	SetState(ELongTableConnectionState::AwaitingWelcome);
	SendClientMessage(Message);
}

void ULongTableAuthorityClient::SendClientMessage(const FLongTableClientMessage& Message)
{
	if (Transport.IsValid())
	{
		Transport->Send(FLongTableProtocolCodec::EncodeClientMessage(Message));
	}
}

FString ULongTableAuthorityClient::SubmitIntent(const FLongTableIntent& Intent)
{
	// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | BEGIN]]
	// Only an entitled role welcomed with a live grant can form a v2 identity;
	// public and dealer connections hold no lane and never submit.
	if (State != ELongTableConnectionState::Ready || !Commit.CanSubmit() || !Identity.CanIssue())
	{
		return FString();
	}
	const int64 Counter = Identity.PeekNextCounter();
	const FString IntentId = Identity.Issue();
	if (!Commit.Begin(IntentId, Intent, LastAppliedVersion, Counter))
	{
		return FString();
	}
	// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | END]]
	FLongTableClientMessage Message;
	Message.Type = ELongTableClientMessageType::Intent;
	Message.Intent.TableId = Config.TableId;
	Message.Intent.IntentId = IntentId;
	Message.Intent.ExpectedVersion = LastAppliedVersion;
	Message.Intent.Intent = Intent;
	SendClientMessage(Message);
	return IntentId;
}

void ULongTableAuthorityClient::ResendInFlight()
{
	if (!Commit.HasInFlight())
	{
		return;
	}
	// Same intent id and the ORIGINAL expected version: the authority answers
	// `duplicate` if it already applied it and `stale-version` if the table
	// moved, so a retry can never be applied against a view the client never held.
	FLongTableClientMessage Message;
	Message.Type = ELongTableClientMessageType::Intent;
	Message.Intent.TableId = Config.TableId;
	Message.Intent.IntentId = Commit.InFlightId();
	Message.Intent.ExpectedVersion = Commit.InFlightVersion();
	Message.Intent.Intent = Commit.InFlight();
	SendClientMessage(Message);
}

void ULongTableAuthorityClient::RequestResync()
{
	if (State != ELongTableConnectionState::Ready && State != ELongTableConnectionState::Resyncing)
	{
		return;
	}
	FLongTableClientMessage Message;
	Message.Type = ELongTableClientMessageType::Resync;
	Message.Resync.TableId = Config.TableId;
	Message.Resync.LastVersion = FMath::Max(0, LastAppliedVersion);
	// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-FINAL-001 | BEGIN]]
	// Resyncing exits to Ready only after coherent state NEWER than this base
	// was applied; a stale, empty or incoherent answer is rejected loudly.
	ResyncBaseVersion = LastAppliedVersion;
	// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-FINAL-001 | END]]
	SetState(ELongTableConnectionState::Resyncing);
	Commit.ClearResync();
	SendClientMessage(Message);
}

bool ULongTableAuthorityClient::Fault(ELongTableFrameFault InFault, const FString& Detail)
{
	UE_LOG(LogLongTableTable, Warning, TEXT("authority frame rejected: %s"), *Detail);
	// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | BEGIN]]
	BroadcastGuarded<FLongTableFrameRejectedEvent, FLongTableFrameRejectedSingle>(OnFrameRejected, InFault, Detail);
	// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | END]]
	return false;
}

bool ULongTableAuthorityClient::ShouldApply(int32 Version, int32 Revision) const
{
	if (Version > LastAppliedVersion) { return true; }
	return Version == LastAppliedVersion && Revision > LastUncommittedRevision;
}

// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-FINAL-001 | BEGIN]]
bool ULongTableAuthorityClient::StagePayloads(const FLongTableAuthorityMessage& Message, const FString& EnvelopeTableId, bool bExpectSeat, ELongTableSeat ExpectedSeat, FStagedPayloads& OutStaged)
{
	// Pass 1: decode and validate every payload for this client's role.
	// Nothing is staged — and nothing will be applied — if any check fails.
	switch (Config.Role)
	{
	case ELongTableRole::Player:
	{
		for (const FLongTableProjectionPayload& Payload : Message.Payloads)
		{
			ELongTableRole Role;
			if (!FLongTableProtocolCodec::PayloadRole(Payload, Role) || Role != ELongTableRole::Player)
			{
				return Fault(ELongTableFrameFault::RoleMismatch, TEXT("projection payload is not a player projection"));
			}
			FLongTableSchemaRejection Rejection;
			FLongTablePlayerProjection& Candidate = OutStaged.Player.AddDefaulted_GetRef();
			if (!FLongTableProtocolCodec::ExtractPlayerProjection(Payload, TEXT("projection"), Candidate, Rejection))
			{
				return Fault(ELongTableFrameFault::SchemaRejected, Rejection.ToString());
			}
			if (!Candidate.TableId.Equals(EnvelopeTableId, ESearchCase::CaseSensitive)) { return Fault(ELongTableFrameFault::TableMismatch, TEXT("projection tableId differs from envelope")); }
			if (Candidate.Version != Payload.EnvelopeVersion) { return Fault(ELongTableFrameFault::VersionMismatch, TEXT("projection version differs from envelope")); }
			if (bExpectSeat && Candidate.Seat != ExpectedSeat) { return Fault(ELongTableFrameFault::SeatMismatch, TEXT("projection seat differs from the welcomed seat")); }
		}
		return true;
	}
	case ELongTableRole::Host:
	{
		for (const FLongTableProjectionPayload& Payload : Message.Payloads)
		{
			ELongTableRole Role;
			if (!FLongTableProtocolCodec::PayloadRole(Payload, Role) || Role != ELongTableRole::Host)
			{
				return Fault(ELongTableFrameFault::RoleMismatch, TEXT("projection payload is not a host projection"));
			}
			FLongTableSchemaRejection Rejection;
			FLongTableHostProjection& Candidate = OutStaged.Host.AddDefaulted_GetRef();
			if (!FLongTableProtocolCodec::ExtractHostProjection(Payload, TEXT("projection"), Candidate, Rejection))
			{
				return Fault(ELongTableFrameFault::SchemaRejected, Rejection.ToString());
			}
			if (!Candidate.TableId.Equals(EnvelopeTableId, ESearchCase::CaseSensitive)) { return Fault(ELongTableFrameFault::TableMismatch, TEXT("projection tableId differs from envelope")); }
			if (Candidate.Version != Payload.EnvelopeVersion) { return Fault(ELongTableFrameFault::VersionMismatch, TEXT("projection version differs from envelope")); }
		}
		return true;
	}
	case ELongTableRole::Public:
	{
		for (const FLongTableProjectionPayload& Payload : Message.Payloads)
		{
			ELongTableRole Role;
			if (!FLongTableProtocolCodec::PayloadRole(Payload, Role) || Role != ELongTableRole::Public)
			{
				return Fault(ELongTableFrameFault::RoleMismatch, TEXT("projection payload is not a public projection"));
			}
			FLongTableSchemaRejection Rejection;
			FLongTablePublicProjection& Candidate = OutStaged.Public.AddDefaulted_GetRef();
			if (!FLongTableProtocolCodec::ExtractPublicProjection(Payload, TEXT("projection"), Candidate, Rejection))
			{
				return Fault(ELongTableFrameFault::SchemaRejected, Rejection.ToString());
			}
			if (!Candidate.TableId.Equals(EnvelopeTableId, ESearchCase::CaseSensitive)) { return Fault(ELongTableFrameFault::TableMismatch, TEXT("projection tableId differs from envelope")); }
			if (Candidate.Version != Payload.EnvelopeVersion) { return Fault(ELongTableFrameFault::VersionMismatch, TEXT("projection version differs from envelope")); }
		}
		return true;
	}
	case ELongTableRole::Dealer:
		return Message.Payloads.Num() == 0 || Fault(ELongTableFrameFault::RoleMismatch, TEXT("a dealer connection receives no projection"));
	}
	return false;
}

bool ULongTableAuthorityClient::ApplyStaged(const FStagedPayloads& Staged)
{
	// Pass 2: per candidate, the full commit precedes its broadcast, so every
	// callback observes committed state; after every synchronous callback the
	// old frame's continuation aborts when the context generation changed.
	const uint64 Generation = ContextGeneration;
	for (const FLongTablePlayerProjection& Candidate : Staged.Player)
	{
		if (!ShouldApply(Candidate.Version, Candidate.UncommittedRevision)) { continue; }
		LastAppliedVersion = Candidate.Version;
		LastUncommittedRevision = Candidate.UncommittedRevision;
		PlayerCache = Candidate;
		++AppliedFrames;
		if (!BroadcastGuarded<FLongTablePlayerProjectionEvent, FLongTablePlayerProjectionSingle>(OnPlayerProjection, PlayerCache)) { return false; }
		if (ContextGeneration != Generation) { return false; }
	}
	for (const FLongTableHostProjection& Candidate : Staged.Host)
	{
		if (!ShouldApply(Candidate.Version, -1)) { continue; }
		LastAppliedVersion = Candidate.Version;
		HostCache = Candidate;
		++AppliedFrames;
		if (!BroadcastGuarded<FLongTableHostProjectionEvent, FLongTableHostProjectionSingle>(OnHostProjection, HostCache)) { return false; }
		if (ContextGeneration != Generation) { return false; }
	}
	for (const FLongTablePublicProjection& Candidate : Staged.Public)
	{
		if (!ShouldApply(Candidate.Version, -1)) { continue; }
		LastAppliedVersion = Candidate.Version;
		PublicCache = Candidate;
		++AppliedFrames;
		if (!BroadcastGuarded<FLongTablePublicProjectionEvent, FLongTablePublicProjectionSingle>(OnPublicProjection, PublicCache)) { return false; }
		if (ContextGeneration != Generation) { return false; }
	}
	return true;
}
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-FINAL-001 | END]]

void ULongTableAuthorityClient::HandleMessage(const FString& Text)
{
	FLongTableAuthorityMessage Message;
	FLongTableSchemaRejection Rejection;
	if (!FLongTableProtocolCodec::DecodeAuthorityMessageText(Text, Message, Rejection))
	{
		// Fail closed: nothing from a frame outside the schema is applied.
		Fault(ELongTableFrameFault::SchemaRejected, Rejection.ToString());
		OnWireError.Broadcast(ELongTableWireError::SchemaRejected, Rejection.ToString());
		return;
	}

	switch (Message.Type)
	{
	// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-FINAL-001 | BEGIN]]
	case ELongTableAuthorityMessageType::Welcome:
	{
		const FLongTableWelcome& Welcome = Message.Welcome;
		if (!Welcome.TableId.Equals(Config.TableId, ESearchCase::CaseSensitive)) { Fault(ELongTableFrameFault::TableMismatch, TEXT("welcome for another table")); return; }
		if (Welcome.Role != Config.Role) { Fault(ELongTableFrameFault::RoleMismatch, TEXT("welcome for another role")); return; }
		// The decoder already fails every role/seat crossover closed; these
		// checks keep the client fail-closed even against its own decoder.
		if (Config.Role == ELongTableRole::Player && !Welcome.bHasSeat) { Fault(ELongTableFrameFault::SeatMismatch, TEXT("player welcome without a seat")); return; }
		if (Config.Role != ELongTableRole::Player && Welcome.bHasSeat) { Fault(ELongTableFrameFault::SeatMismatch, TEXT("non-player welcome carries a seat")); return; }
		const bool bNeedsProjection = Config.Role != ELongTableRole::Dealer;
		if (bNeedsProjection != Welcome.bHasProjection || Message.Payloads.Num() != (bNeedsProjection ? 1 : 0))
		{
			Fault(ELongTableFrameFault::ProjectionMissing, TEXT("welcome projection presence does not match the role"));
			return;
		}
		// A welcome in the same authenticated context can never reduce the
		// applied version, the cached projection or the resume position.
		if (bEverWelcomed && Welcome.Version < LastAppliedVersion)
		{
			Fault(ELongTableFrameFault::VersionMismatch, TEXT("welcome would roll the applied version back"));
			return;
		}
		// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | BEGIN]]
		// v2 grant/counter coherence. Under the SAME grant the counter never
		// rolls backwards and an exhausted domain never revives; a DIFFERENT
		// grant is a rotation and discards the old in-flight intent below.
		const bool bEntitledRole = Config.Role == ELongTableRole::Player || Config.Role == ELongTableRole::Host;
		const bool bSameGrant = bEntitledRole && Identity.IsBound() && Identity.GetGrant().Equals(Welcome.SessionId, ESearchCase::CaseSensitive);
		if (bSameGrant)
		{
			if (Identity.IsExhausted() && Welcome.bHasNextIntentCounter)
			{
				Fault(ELongTableFrameFault::VersionMismatch, TEXT("welcome would revive an exhausted counter domain"));
				return;
			}
			if (Welcome.bHasNextIntentCounter && Welcome.NextIntentCounter <= Identity.HighestConsumed())
			{
				Fault(ELongTableFrameFault::VersionMismatch, TEXT("welcome would roll the intent counter backwards"));
				return;
			}
		}
		// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | END]]
		// Stage the complete welcome — snapshot decoded and validated against
		// the welcomed seat — before one field of client state changes.
		FStagedPayloads Staged;
		if (!StagePayloads(Message, Welcome.TableId, Welcome.bHasSeat, Welcome.Seat, Staged)) { return; }
		bool bApplyCache = bNeedsProjection;
		if (Config.Role == ELongTableRole::Player)
		{
			if (Staged.Player.Num() != 1) { Fault(ELongTableFrameFault::ProjectionMissing, TEXT("welcome projection presence does not match the role")); return; }
			// At an unchanged version, an older snapshot revision must not roll
			// the cached projection back; the session still commits.
			bApplyCache = Welcome.Version > LastAppliedVersion
				|| !bEverWelcomed
				|| Staged.Player[0].UncommittedRevision >= LastUncommittedRevision;
		}

		// ---- Atomic commit: every field below is in place before any callback runs. ----
		// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | BEGIN]]
		if (bEntitledRole)
		{
			if (!bSameGrant)
			{
				// A changed authenticated grant discards the old in-flight
				// intent; a retry survives only under the same grant.
				Commit.AbandonInFlight();
			}
			Identity.Adopt(Welcome.SessionId, Welcome.bHasNextIntentCounter, Welcome.NextIntentCounter);
		}
		// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | END]]
		SessionId = Welcome.SessionId;
		bHasSeat = Welcome.bHasSeat;
		Seat = Welcome.Seat;
		if (bApplyCache)
		{
			switch (Config.Role)
			{
			case ELongTableRole::Player:
				PlayerCache = Staged.Player[0];
				LastUncommittedRevision = PlayerCache.UncommittedRevision;
				++AppliedFrames;
				break;
			case ELongTableRole::Host:
				HostCache = Staged.Host[0];
				LastUncommittedRevision = -1;
				++AppliedFrames;
				break;
			case ELongTableRole::Public:
				PublicCache = Staged.Public[0];
				LastUncommittedRevision = -1;
				++AppliedFrames;
				break;
			case ELongTableRole::Dealer:
				break;
			}
		}
		if (Config.Role == ELongTableRole::Dealer) { LastUncommittedRevision = -1; }
		LastAppliedVersion = FMath::Max(LastAppliedVersion, Welcome.Version);
		ResyncBaseVersion = -1;
		bEverWelcomed = true;

		// ---- Broadcasts: after every synchronous callback, abort this frame's
		// continuation — including the in-flight resend — when the context
		// generation changed underneath it. ----
		const uint64 Generation = ContextGeneration;
		SetState(ELongTableConnectionState::Ready);
		if (ContextGeneration != Generation) { return; }
		if (bApplyCache)
		{
			// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | BEGIN]]
			switch (Config.Role)
			{
			case ELongTableRole::Player: BroadcastGuarded<FLongTablePlayerProjectionEvent, FLongTablePlayerProjectionSingle>(OnPlayerProjection, PlayerCache); break;
			case ELongTableRole::Host: BroadcastGuarded<FLongTableHostProjectionEvent, FLongTableHostProjectionSingle>(OnHostProjection, HostCache); break;
			case ELongTableRole::Public: BroadcastGuarded<FLongTablePublicProjectionEvent, FLongTablePublicProjectionSingle>(OnPublicProjection, PublicCache); break;
			case ELongTableRole::Dealer: break;
			}
			// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | END]]
			if (ContextGeneration != Generation) { return; }
		}
		ResendInFlight();
		break;
	}

	case ELongTableAuthorityMessageType::Projection:
	{
		if (Message.Projection.TableId != Config.TableId) { Fault(ELongTableFrameFault::TableMismatch, TEXT("projection for another table")); return; }
		if (Config.Role == ELongTableRole::Dealer) { Fault(ELongTableFrameFault::RoleMismatch, TEXT("a dealer connection receives no projection")); return; }
		FStagedPayloads Staged;
		if (!StagePayloads(Message, Message.Projection.TableId, bHasSeat, Seat, Staged)) { return; }
		if (!ApplyStaged(Staged)) { return; }
		if (State == ELongTableConnectionState::Resyncing)
		{
			// Ready only after coherent state newer than the resync base was
			// applied; anything else is rejected loudly, never a silent Ready.
			if (LastAppliedVersion > ResyncBaseVersion)
			{
				ResyncBaseVersion = -1;
				SetState(ELongTableConnectionState::Ready);
			}
			else
			{
				Fault(ELongTableFrameFault::VersionMismatch, TEXT("resync answer did not advance past the resync base"));
			}
		}
		break;
	}

	case ELongTableAuthorityMessageType::Receipt:
	{
		if (Message.Receipt.TableId != Config.TableId) { Fault(ELongTableFrameFault::TableMismatch, TEXT("receipt for another table")); return; }
		LastReceipt = Message.Receipt.Receipt;
		// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | BEGIN]]
		// Any receipt outcome — accepted, duplicate or rejected — proves the
		// authority consumed (or had already consumed) the in-flight counter
		// under the current grant; the client's counter never rolls backwards.
		const int64 AnsweredCounter = Commit.InFlightCounter();
		const bool bAnswered = Commit.OnReceipt(LastReceipt);
		if (bAnswered && AnsweredCounter > 0)
		{
			Identity.MarkConsumed(AnsweredCounter);
		}
		if (!BroadcastGuarded<FLongTableReceiptEvent, FLongTableReceiptSingle>(OnReceipt, LastReceipt)) { return; }
		// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | END]]
		if (Commit.NeedsResync())
		{
			RequestResync();
		}
		break;
	}

	case ELongTableAuthorityMessageType::Replay:
	{
		const FLongTableReplayMessage& Replay = Message.Replay;
		if (Replay.TableId != Config.TableId) { Fault(ELongTableFrameFault::TableMismatch, TEXT("replay for another table")); return; }
		if (Config.Role == ELongTableRole::Dealer) { Fault(ELongTableFrameFault::RoleMismatch, TEXT("a dealer connection receives no replay")); return; }
		// Coverage coherence before anything is staged or applied: the range
		// must be well-formed and untruncated, the frames must cover exactly
		// FromVersion+1..ToVersion in order with no gap, disorder or excess,
		// and the range must start at or before the applied version.
		if (Replay.ToVersion < Replay.FromVersion) { Fault(ELongTableFrameFault::VersionMismatch, TEXT("replay range is incoherent")); return; }
		if (Replay.bTruncated) { Fault(ELongTableFrameFault::VersionMismatch, TEXT("truncated replay rejected; the authoritative snapshot governs")); return; }
		if (Replay.FrameVersions.Num() != Replay.ToVersion - Replay.FromVersion) { Fault(ELongTableFrameFault::VersionMismatch, TEXT("replay frames do not cover the declared range")); return; }
		for (int32 Index = 0; Index < Replay.FrameVersions.Num(); ++Index)
		{
			if (Replay.FrameVersions[Index] != Replay.FromVersion + 1 + Index)
			{
				Fault(ELongTableFrameFault::VersionMismatch, TEXT("replay frames are gapped or disordered"));
				return;
			}
		}
		if (Replay.FromVersion > LastAppliedVersion) { Fault(ELongTableFrameFault::VersionMismatch, TEXT("replay leaves a gap after the applied version")); return; }
		if (State == ELongTableConnectionState::Resyncing && Replay.ToVersion <= LastAppliedVersion)
		{
			// Stale or empty resync coverage: nothing newer to apply. Rejected
			// loudly so the client is never silently left stale.
			Fault(ELongTableFrameFault::VersionMismatch, TEXT("stale or empty resync replay rejected"));
			return;
		}
		FStagedPayloads Staged;
		if (!StagePayloads(Message, Replay.TableId, bHasSeat, Seat, Staged)) { return; }
		if (!ApplyStaged(Staged)) { return; }
		if (State == ELongTableConnectionState::Resyncing)
		{
			if (LastAppliedVersion > ResyncBaseVersion)
			{
				ResyncBaseVersion = -1;
				SetState(ELongTableConnectionState::Ready);
			}
			else
			{
				Fault(ELongTableFrameFault::VersionMismatch, TEXT("resync answer did not advance past the resync base"));
			}
		}
		break;
	}

	case ELongTableAuthorityMessageType::DealerCue:
		if (!Message.DealerCue.TableId.Equals(Config.TableId, ESearchCase::CaseSensitive)) { Fault(ELongTableFrameFault::TableMismatch, TEXT("dealer cue for another table")); return; }
		// The decoder already requires the inner frame's table to equal the
		// envelope's; re-checked here, with the configured table, fail-closed.
		if (!Message.DealerCue.Frame.TableId.Equals(Message.DealerCue.TableId, ESearchCase::CaseSensitive)
			|| !Message.DealerCue.Frame.TableId.Equals(Config.TableId, ESearchCase::CaseSensitive))
		{
			Fault(ELongTableFrameFault::TableMismatch, TEXT("dealer cue inner frame is for another table"));
			return;
		}
		// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | BEGIN]]
		BroadcastGuarded<FLongTableDealerCueEvent, FLongTableDealerCueSingle>(OnDealerCue, Message.DealerCue.Frame);
		// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | END]]
		break;
	// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-FINAL-001 | END]]

	case ELongTableAuthorityMessageType::Error:
		// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | BEGIN]]
		if (!BroadcastGuarded<FLongTableWireErrorEvent, FLongTableWireErrorSingle>(OnWireError, Message.Error.Code, Message.Error.Detail)) { return; }
		switch (Message.Error.Code)
		{
		case ELongTableWireError::Unauthenticated:
		case ELongTableWireError::RoleUnavailable:
		case ELongTableWireError::UnknownTable:
		case ELongTableWireError::ProtocolVersion:
			Disconnect();
			break;
		case ELongTableWireError::IntentIdentity:
			// The authority refused the identity without consuming a counter;
			// the retry is abandoned and the next welcome resupplies the
			// lane's current grant and exact next counter.
			Commit.AbandonInFlight();
			break;
		case ELongTableWireError::IntentExhausted:
			// The table incarnation is exhausted: nothing further can be
			// submitted under any grant of this incarnation.
			Identity.MarkExhausted();
			Commit.AbandonInFlight();
			break;
		default:
			break;
		}
		break;
		// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | END]]
	}
}

void ULongTableAuthorityClient::HandleClosed(int32 Code, const FString& Reason, bool bClean)
{
	UE_LOG(LogLongTableTable, Log, TEXT("authority connection closed (%d, clean=%s)"), Code, bClean ? TEXT("true") : TEXT("false"));
	// The in-flight intent is kept for a same-context resend after the next welcome.
	SetState(ELongTableConnectionState::Disconnected);
}

void ULongTableAuthorityClient::HandleError(const FString& Error)
{
	UE_LOG(LogLongTableTable, Warning, TEXT("authority transport error: %s"), *Error);
	SetState(ELongTableConnectionState::Disconnected);
}
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001-R1 | END]]
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
