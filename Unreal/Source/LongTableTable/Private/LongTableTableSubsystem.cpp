// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
#include "LongTableTableSubsystem.h"
#include "LongTableTableModule.h"

void ULongTableTableSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
	Super::Initialize(Collection);
	Client = NewObject<ULongTableAuthorityClient>(this, TEXT("AuthorityClient"));
}

void ULongTableTableSubsystem::Deinitialize()
{
	if (Client)
	{
		Client->Disconnect();
	}
	Super::Deinitialize();
}

void ULongTableTableSubsystem::ConnectToTable(const FLongTableClientConfig& Config)
{
	ConnectWithTransport(Config, MakeShared<FLongTableWebSocketTransport>());
}

void ULongTableTableSubsystem::ConnectWithTransport(const FLongTableClientConfig& Config, TSharedPtr<ILongTableTransport> Transport)
{
	if (!Client)
	{
		Client = NewObject<ULongTableAuthorityClient>(this, TEXT("AuthorityClient"));
	}
	Client->Configure(Config, Transport);
	Client->Connect();
}

void ULongTableTableSubsystem::Disconnect()
{
	if (Client)
	{
		Client->Disconnect();
	}
}

bool ULongTableTableSubsystem::IsReady() const
{
	return Client && Client->GetState() == ELongTableConnectionState::Ready;
}

FString ULongTableTableSubsystem::Submit(const FLongTableIntent& Intent)
{
	return Client ? Client->SubmitIntent(Intent) : FString();
}

FString ULongTableTableSubsystem::PreviewPass()
{
	FLongTableIntent Intent;
	Intent.Kind = ELongTableIntentKind::Preview;
	Intent.Selection.Type = ELongTableSelectionType::Pass;
	return Submit(Intent);
}

FString ULongTableTableSubsystem::PreviewBid(int32 Level, ELongTableContractMode Mode)
{
	FLongTableIntent Intent;
	Intent.Kind = ELongTableIntentKind::Preview;
	Intent.Selection.Type = ELongTableSelectionType::Bid;
	Intent.Selection.Bid.Level = Level;
	Intent.Selection.Bid.Mode = Mode;
	return Submit(Intent);
}

FString ULongTableTableSubsystem::PreviewDeclaration(bool bNoTrump, ELongTableSuit Trump)
{
	FLongTableIntent Intent;
	Intent.Kind = ELongTableIntentKind::Preview;
	Intent.Selection.Type = ELongTableSelectionType::Declaration;
	Intent.Selection.bNoTrump = bNoTrump;
	Intent.Selection.Trump = Trump;
	return Submit(Intent);
}

FString ULongTableTableSubsystem::PreviewPlay(const FString& CardId)
{
	FLongTableIntent Intent;
	Intent.Kind = ELongTableIntentKind::Preview;
	Intent.Selection.Type = ELongTableSelectionType::Play;
	Intent.Selection.CardId = CardId;
	return Submit(Intent);
}

FString ULongTableTableSubsystem::ToggleDiscard(const FString& CardId)
{
	FLongTableIntent Intent;
	Intent.Kind = ELongTableIntentKind::ToggleDiscard;
	Intent.CardId = CardId;
	return Submit(Intent);
}

FString ULongTableTableSubsystem::Cancel()
{
	FLongTableIntent Intent;
	Intent.Kind = ELongTableIntentKind::Cancel;
	return Submit(Intent);
}

FString ULongTableTableSubsystem::Confirm()
{
	FLongTableIntent Intent;
	Intent.Kind = ELongTableIntentKind::Confirm;
	return Submit(Intent);
}

FString ULongTableTableSubsystem::NextHand()
{
	FLongTableIntent Intent;
	Intent.Kind = ELongTableIntentKind::NextHand;
	return Submit(Intent);
}

FString ULongTableTableSubsystem::SubmitLegalChoice(const FLongTableLegalChoice& Choice)
{
	return Submit(Choice.Intent);
}

FString ULongTableTableSubsystem::HostPause()
{
	FLongTableIntent Intent;
	Intent.Kind = ELongTableIntentKind::HostPause;
	return Submit(Intent);
}

FString ULongTableTableSubsystem::HostResume()
{
	FLongTableIntent Intent;
	Intent.Kind = ELongTableIntentKind::HostResume;
	return Submit(Intent);
}

FString ULongTableTableSubsystem::HostAnnounce(ELongTableHostAnnouncement Cue)
{
	FLongTableIntent Intent;
	Intent.Kind = ELongTableIntentKind::HostAnnounce;
	Intent.Cue = Cue;
	return Submit(Intent);
}

FString ULongTableTableSubsystem::HostSubstitute(ELongTableSeat Seat)
{
	FLongTableIntent Intent;
	Intent.Kind = ELongTableIntentKind::HostSubstitute;
	Intent.Seat = Seat;
	return Submit(Intent);
}

FString ULongTableTableSubsystem::HostTransfer(const FString& ParticipantId)
{
	FLongTableIntent Intent;
	Intent.Kind = ELongTableIntentKind::HostTransfer;
	Intent.ParticipantId = ParticipantId;
	return Submit(Intent);
}

FString ULongTableTableSubsystem::HostEndEvent()
{
	FLongTableIntent Intent;
	Intent.Kind = ELongTableIntentKind::HostEndEvent;
	return Submit(Intent);
}

bool ULongTableTableSubsystem::LocalConfirmGate(const FLongTablePlayerProjection& Projection, bool bIntentInFlight)
{
	if (bIntentInFlight || Projection.bPaused || Projection.bEventEnded || Projection.Turn != Projection.Seat)
	{
		return false;
	}
	if (Projection.Phase == ELongTablePhase::Summary)
	{
		return false;
	}
	if (Projection.Phase == ELongTablePhase::Kitty)
	{
		return Projection.DiscardPicked == Projection.DiscardTarget;
	}
	return Projection.bHasPreviewLabel;
}

bool ULongTableTableSubsystem::CanConfirmLocally() const
{
	// Only a player-role client holds a player projection; any other role gates to false.
	return IsReady() && Client->GetRole() == ELongTableRole::Player && LocalConfirmGate(Client->PlayerProjection(), Client->HasIntentInFlight());
}
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
