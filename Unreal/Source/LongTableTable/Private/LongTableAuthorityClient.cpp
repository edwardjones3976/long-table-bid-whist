// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
#include "LongTableAuthorityClient.h"
#include "LongTableJson.h"
#include "LongTableTableModule.h"

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
	// Same intent id: the authority answers `duplicate` if it already applied it.
	FLongTableClientMessage Message;
	Message.Type = ELongTableClientMessageType::Intent;
	Message.Intent.TableId = Config.TableId;
	Message.Intent.IntentId = Commit.InFlightId();
	Message.Intent.ExpectedVersion = LastAppliedVersion;
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

void ULongTableAuthorityClient::ApplyRoleProjection(const FLongTableRoleProjection& Projection)
{
	switch (Projection.Role)
	{
	case ELongTableRole::Player:
		Player = Projection.Player;
		OnPlayerProjection.Broadcast(Player);
		break;
	case ELongTableRole::Host:
		Host = Projection.Host;
		OnHostProjection.Broadcast(Host);
		break;
	default:
		Public = Projection.Public;
		OnPublicProjection.Broadcast(Public);
		break;
	}
	++AppliedFrames;
}

void ULongTableAuthorityClient::HandleMessage(const FString& Text)
{
	FLongTableAuthorityMessage Message;
	FLongTableSchemaRejection Rejection;
	if (!FLongTableProtocolCodec::DecodeAuthorityMessageText(Text, Message, Rejection))
	{
		// Fail closed: nothing from a frame outside the schema is applied.
		UE_LOG(LogLongTableTable, Warning, TEXT("authority frame rejected: %s"), *Rejection.ToString());
		OnWireError.Broadcast(ELongTableWireError::SchemaRejected, Rejection.ToString());
		return;
	}

	switch (Message.Type)
	{
	case ELongTableAuthorityMessageType::Welcome:
		SessionId = Message.Welcome.SessionId;
		bHasSeat = Message.Welcome.bHasSeat;
		Seat = Message.Welcome.Seat;
		LastAppliedVersion = Message.Welcome.Version;
		bEverWelcomed = true;
		if (Message.Welcome.bHasProjection)
		{
			ApplyRoleProjection(Message.Welcome.Projection);
		}
		SetState(ELongTableConnectionState::Ready);
		ResendInFlight();
		break;

	case ELongTableAuthorityMessageType::Projection:
		if (Message.Projection.Version > LastAppliedVersion)
		{
			LastAppliedVersion = Message.Projection.Version;
			ApplyRoleProjection(Message.Projection.Projection);
		}
		if (State == ELongTableConnectionState::Resyncing)
		{
			SetState(ELongTableConnectionState::Ready);
		}
		break;

	case ELongTableAuthorityMessageType::Receipt:
		LastReceipt = Message.Receipt.Receipt;
		Commit.OnReceipt(LastReceipt);
		OnReceipt.Broadcast(LastReceipt);
		if (Commit.NeedsResync())
		{
			RequestResync();
		}
		break;

	case ELongTableAuthorityMessageType::Replay:
		for (const FLongTableReplayFrame& Frame : Message.Replay.Frames)
		{
			if (Frame.Version > LastAppliedVersion)
			{
				LastAppliedVersion = Frame.Version;
				ApplyRoleProjection(Frame.Projection);
			}
		}
		if (State == ELongTableConnectionState::Resyncing)
		{
			SetState(ELongTableConnectionState::Ready);
		}
		break;

	case ELongTableAuthorityMessageType::DealerCue:
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
	// The in-flight intent is kept for resend after the next welcome.
	SetState(ELongTableConnectionState::Disconnected);
}

void ULongTableAuthorityClient::HandleError(const FString& Error)
{
	UE_LOG(LogLongTableTable, Warning, TEXT("authority transport error: %s"), *Error);
	SetState(ELongTableConnectionState::Disconnected);
}
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
