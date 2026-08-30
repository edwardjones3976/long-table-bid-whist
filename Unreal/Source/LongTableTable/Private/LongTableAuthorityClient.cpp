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

FString ULongTableAuthorityClient::ContextKeyFor(const FLongTableClientConfig& InConfig)
{
	// In-memory identity of the authenticated context; never logged.
	return FString::Printf(TEXT("%s|%s|%s|%s"), *InConfig.AuthorityUrl, *InConfig.Token, *TLongTableWire<ELongTableRole>::ToWire(InConfig.Role), *InConfig.TableId);
}

void ULongTableAuthorityClient::ResetContext()
{
	PlayerCache = FLongTablePlayerProjection();
	HostCache = FLongTableHostProjection();
	PublicCache = FLongTablePublicProjection();
	LastReceipt = FLongTableIntentReceipt();
	SessionId.Reset();
	bHasSeat = false;
	Seat = ELongTableSeat::South;
	LastAppliedVersion = -1;
	LastUncommittedRevision = -1;
	bEverWelcomed = false;
	AppliedFrames = 0;
	Commit.Reset();
	Identity = FLongTableIntentIdentity();
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
	const FString NextContext = ContextKeyFor(InConfig);
	if (NextContext != ActiveContext)
	{
		ResetContext();
		ActiveContext = NextContext;
	}
	Config = InConfig;
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
		OnConnectionState.Broadcast(State);
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
	if (State != ELongTableConnectionState::Ready || !Commit.CanSubmit())
	{
		return FString();
	}
	const FString IntentId = Identity.Next();
	if (!Commit.Begin(IntentId, Intent, LastAppliedVersion))
	{
		return FString();
	}
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
	SetState(ELongTableConnectionState::Resyncing);
	Commit.ClearResync();
	SendClientMessage(Message);
}

bool ULongTableAuthorityClient::Fault(ELongTableFrameFault InFault, const FString& Detail)
{
	UE_LOG(LogLongTableTable, Warning, TEXT("authority frame rejected: %s"), *Detail);
	OnFrameRejected.Broadcast(InFault, Detail);
	return false;
}

bool ULongTableAuthorityClient::ShouldApply(int32 Version, int32 Revision) const
{
	if (Version > LastAppliedVersion) { return true; }
	return Version == LastAppliedVersion && Revision > LastUncommittedRevision;
}

bool ULongTableAuthorityClient::ApplyPayloads(const FLongTableAuthorityMessage& Message, const FString& EnvelopeTableId, bool bSnapshot)
{
	// Pass 1: decode and validate every payload for this client's role. Nothing is applied if any fails.
	switch (Config.Role)
	{
	case ELongTableRole::Player:
	{
		TArray<FLongTablePlayerProjection> Candidates;
		for (const FLongTableProjectionPayload& Payload : Message.Payloads)
		{
			ELongTableRole Role;
			if (!FLongTableProtocolCodec::PayloadRole(Payload, Role) || Role != ELongTableRole::Player)
			{
				return Fault(ELongTableFrameFault::RoleMismatch, TEXT("projection payload is not a player projection"));
			}
			FLongTableSchemaRejection Rejection;
			FLongTablePlayerProjection& Candidate = Candidates.AddDefaulted_GetRef();
			if (!FLongTableProtocolCodec::ExtractPlayerProjection(Payload, TEXT("projection"), Candidate, Rejection))
			{
				return Fault(ELongTableFrameFault::SchemaRejected, Rejection.ToString());
			}
			if (Candidate.TableId != EnvelopeTableId) { return Fault(ELongTableFrameFault::TableMismatch, TEXT("projection tableId differs from envelope")); }
			if (Candidate.Version != Payload.EnvelopeVersion) { return Fault(ELongTableFrameFault::VersionMismatch, TEXT("projection version differs from envelope")); }
			if (bHasSeat && Candidate.Seat != Seat) { return Fault(ELongTableFrameFault::SeatMismatch, TEXT("projection seat differs from the welcomed seat")); }
		}
		for (const FLongTablePlayerProjection& Candidate : Candidates)
		{
			if (!bSnapshot && !ShouldApply(Candidate.Version, Candidate.UncommittedRevision)) { continue; }
			LastAppliedVersion = Candidate.Version;
			LastUncommittedRevision = Candidate.UncommittedRevision;
			PlayerCache = Candidate;
			++AppliedFrames;
			OnPlayerProjection.Broadcast(PlayerCache);
		}
		return true;
	}
	case ELongTableRole::Host:
	{
		TArray<FLongTableHostProjection> Candidates;
		for (const FLongTableProjectionPayload& Payload : Message.Payloads)
		{
			ELongTableRole Role;
			if (!FLongTableProtocolCodec::PayloadRole(Payload, Role) || Role != ELongTableRole::Host)
			{
				return Fault(ELongTableFrameFault::RoleMismatch, TEXT("projection payload is not a host projection"));
			}
			FLongTableSchemaRejection Rejection;
			FLongTableHostProjection& Candidate = Candidates.AddDefaulted_GetRef();
			if (!FLongTableProtocolCodec::ExtractHostProjection(Payload, TEXT("projection"), Candidate, Rejection))
			{
				return Fault(ELongTableFrameFault::SchemaRejected, Rejection.ToString());
			}
			if (Candidate.TableId != EnvelopeTableId) { return Fault(ELongTableFrameFault::TableMismatch, TEXT("projection tableId differs from envelope")); }
			if (Candidate.Version != Payload.EnvelopeVersion) { return Fault(ELongTableFrameFault::VersionMismatch, TEXT("projection version differs from envelope")); }
		}
		for (const FLongTableHostProjection& Candidate : Candidates)
		{
			if (!bSnapshot && !ShouldApply(Candidate.Version, -1)) { continue; }
			LastAppliedVersion = Candidate.Version;
			HostCache = Candidate;
			++AppliedFrames;
			OnHostProjection.Broadcast(HostCache);
		}
		return true;
	}
	case ELongTableRole::Public:
	{
		TArray<FLongTablePublicProjection> Candidates;
		for (const FLongTableProjectionPayload& Payload : Message.Payloads)
		{
			ELongTableRole Role;
			if (!FLongTableProtocolCodec::PayloadRole(Payload, Role) || Role != ELongTableRole::Public)
			{
				return Fault(ELongTableFrameFault::RoleMismatch, TEXT("projection payload is not a public projection"));
			}
			FLongTableSchemaRejection Rejection;
			FLongTablePublicProjection& Candidate = Candidates.AddDefaulted_GetRef();
			if (!FLongTableProtocolCodec::ExtractPublicProjection(Payload, TEXT("projection"), Candidate, Rejection))
			{
				return Fault(ELongTableFrameFault::SchemaRejected, Rejection.ToString());
			}
			if (Candidate.TableId != EnvelopeTableId) { return Fault(ELongTableFrameFault::TableMismatch, TEXT("projection tableId differs from envelope")); }
			if (Candidate.Version != Payload.EnvelopeVersion) { return Fault(ELongTableFrameFault::VersionMismatch, TEXT("projection version differs from envelope")); }
		}
		for (const FLongTablePublicProjection& Candidate : Candidates)
		{
			if (!bSnapshot && !ShouldApply(Candidate.Version, -1)) { continue; }
			LastAppliedVersion = Candidate.Version;
			PublicCache = Candidate;
			++AppliedFrames;
			OnPublicProjection.Broadcast(PublicCache);
		}
		return true;
	}
	case ELongTableRole::Dealer:
		return Message.Payloads.Num() == 0 || Fault(ELongTableFrameFault::RoleMismatch, TEXT("a dealer connection receives no projection"));
	}
	return false;
}

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
	case ELongTableAuthorityMessageType::Welcome:
	{
		const FLongTableWelcome& Welcome = Message.Welcome;
		if (Welcome.TableId != Config.TableId) { Fault(ELongTableFrameFault::TableMismatch, TEXT("welcome for another table")); return; }
		if (Welcome.Role != Config.Role) { Fault(ELongTableFrameFault::RoleMismatch, TEXT("welcome for another role")); return; }
		if (Config.Role == ELongTableRole::Player && !Welcome.bHasSeat) { Fault(ELongTableFrameFault::SeatMismatch, TEXT("player welcome without a seat")); return; }
		const bool bNeedsProjection = Config.Role != ELongTableRole::Dealer;
		if (bNeedsProjection != Welcome.bHasProjection || Message.Payloads.Num() != (bNeedsProjection ? 1 : 0))
		{
			Fault(ELongTableFrameFault::ProjectionMissing, TEXT("welcome projection presence does not match the role"));
			return;
		}
		// Validate the snapshot against the welcomed seat before adopting it.
		if (Config.Role == ELongTableRole::Player)
		{
			ELongTableRole Role;
			if (!FLongTableProtocolCodec::PayloadRole(Message.Payloads[0], Role) || Role != ELongTableRole::Player)
			{
				Fault(ELongTableFrameFault::RoleMismatch, TEXT("welcome payload is not a player projection"));
				return;
			}
			FLongTableSchemaRejection SnapshotRejection;
			FLongTablePlayerProjection Snapshot;
			if (!FLongTableProtocolCodec::ExtractPlayerProjection(Message.Payloads[0], TEXT("projection"), Snapshot, SnapshotRejection))
			{
				Fault(ELongTableFrameFault::SchemaRejected, SnapshotRejection.ToString());
				return;
			}
			if (Snapshot.Seat != Welcome.Seat) { Fault(ELongTableFrameFault::SeatMismatch, TEXT("welcome projection seat differs from the welcomed seat")); return; }
		}
		const bool bPreviousSeat = bHasSeat;
		const ELongTableSeat PreviousSeat = Seat;
		bHasSeat = Welcome.bHasSeat;
		Seat = Welcome.Seat;
		if (!ApplyPayloads(Message, Welcome.TableId, true))
		{
			bHasSeat = bPreviousSeat;
			Seat = PreviousSeat;
			return;
		}
		SessionId = Welcome.SessionId;
		LastAppliedVersion = Welcome.Version;
		if (Config.Role != ELongTableRole::Player) { LastUncommittedRevision = -1; }
		bEverWelcomed = true;
		SetState(ELongTableConnectionState::Ready);
		ResendInFlight();
		break;
	}

	case ELongTableAuthorityMessageType::Projection:
		if (Message.Projection.TableId != Config.TableId) { Fault(ELongTableFrameFault::TableMismatch, TEXT("projection for another table")); return; }
		if (Config.Role == ELongTableRole::Dealer) { Fault(ELongTableFrameFault::RoleMismatch, TEXT("a dealer connection receives no projection")); return; }
		if (!ApplyPayloads(Message, Message.Projection.TableId, false)) { return; }
		if (State == ELongTableConnectionState::Resyncing)
		{
			SetState(ELongTableConnectionState::Ready);
		}
		break;

	case ELongTableAuthorityMessageType::Receipt:
		if (Message.Receipt.TableId != Config.TableId) { Fault(ELongTableFrameFault::TableMismatch, TEXT("receipt for another table")); return; }
		LastReceipt = Message.Receipt.Receipt;
		Commit.OnReceipt(LastReceipt);
		OnReceipt.Broadcast(LastReceipt);
		if (Commit.NeedsResync())
		{
			RequestResync();
		}
		break;

	case ELongTableAuthorityMessageType::Replay:
		if (Message.Replay.TableId != Config.TableId) { Fault(ELongTableFrameFault::TableMismatch, TEXT("replay for another table")); return; }
		if (Config.Role == ELongTableRole::Dealer) { Fault(ELongTableFrameFault::RoleMismatch, TEXT("a dealer connection receives no replay")); return; }
		if (!ApplyPayloads(Message, Message.Replay.TableId, false)) { return; }
		if (State == ELongTableConnectionState::Resyncing)
		{
			SetState(ELongTableConnectionState::Ready);
		}
		break;

	case ELongTableAuthorityMessageType::DealerCue:
		if (Message.DealerCue.TableId != Config.TableId) { Fault(ELongTableFrameFault::TableMismatch, TEXT("dealer cue for another table")); return; }
		OnDealerCue.Broadcast(Message.DealerCue.Frame);
		break;

	case ELongTableAuthorityMessageType::Error:
		OnWireError.Broadcast(Message.Error.Code, Message.Error.Detail);
		switch (Message.Error.Code)
		{
		case ELongTableWireError::Unauthenticated:
		case ELongTableWireError::RoleUnavailable:
		case ELongTableWireError::UnknownTable:
		case ELongTableWireError::ProtocolVersion:
			Disconnect();
			break;
		default:
			break;
		}
		break;
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
