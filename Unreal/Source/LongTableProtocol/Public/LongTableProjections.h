// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
/**
 * Closed projection types mirroring packages/protocol/src/{views,intents,
 * receipts,dealer,projections}.ts. A nullable wire member is a `bHas…` flag
 * plus a value. `FLongTableHostProjection`, `FLongTablePublicProjection`,
 * `FLongTableDealerCueFrame` and `FLongTableIntentReceipt` declare exactly
 * the inventory of their schema and nothing else; LongTable.Protocol.ClosedTypes
 * compares the reflected property lists against explicit inventories and the
 * wire key lists against fixtures/protocol/manifest.json. There is no shared
 * container that embeds a player projection beside a host or public one.
 */
#pragma once

#include "CoreMinimal.h"
#include "LongTableVocabulary.h"
#include "LongTableProjections.generated.h"

USTRUCT(BlueprintType)
struct LONGTABLEPROTOCOL_API FLongTableBidView
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Long Table") int32 Level = 3;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") ELongTableContractMode Mode = ELongTableContractMode::High;
};

USTRUCT(BlueprintType)
struct LONGTABLEPROTOCOL_API FLongTableAuctionEntryView
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Long Table") ELongTableSeat Seat = ELongTableSeat::South;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") bool bHasBid = false;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FLongTableBidView Bid;
};

USTRUCT(BlueprintType)
struct LONGTABLEPROTOCOL_API FLongTableContractView
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Long Table") int32 Level = 3;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") ELongTableContractMode Mode = ELongTableContractMode::High;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FString ModeLabel;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") bool bHasTrump = false;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") ELongTableSuit Trump = ELongTableSuit::Clubs;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FString TrumpLabel;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") ELongTableSeat Bidder = ELongTableSeat::South;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FString BidderLabel;
};

/** A card face-up on the table: public to every seat by the rules of the game. */
USTRUCT(BlueprintType)
struct LONGTABLEPROTOCOL_API FLongTablePublicTrickCard
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Long Table") ELongTableSeat Seat = ELongTableSeat::South;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FString SeatLabel;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FString CardId;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FString Label;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FString Glyph;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FString RankText;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") bool bRed = false;
};

USTRUCT(BlueprintType)
struct LONGTABLEPROTOCOL_API FLongTableCompletedTrickView
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Long Table") int32 Number = 1;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") ELongTableSeat Lead = ELongTableSeat::South;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") ELongTableSeat Winner = ELongTableSeat::South;
};

USTRUCT(BlueprintType)
struct LONGTABLEPROTOCOL_API FLongTableSeatOccupancyView
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Long Table") ELongTableSeat Seat = ELongTableSeat::South;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FString SeatLabel;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") ELongTableOccupant Occupant = ELongTableOccupant::Open;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FString DisplayName;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") bool bConnected = false;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") int32 CardCount = 0;
};

/** A card in the local player's own hand. Exists only on FLongTablePlayerProjection. */
USTRUCT(BlueprintType)
struct LONGTABLEPROTOCOL_API FLongTablePlayerCardView
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FString CardId;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FString Label;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FString Glyph;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FString RankText;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") bool bRed = false;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") bool bLegal = false;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") bool bSelectedForDiscard = false;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") bool bPreviewed = false;
};

USTRUCT(BlueprintType)
struct LONGTABLEPROTOCOL_API FLongTableDisabledNoticeView
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FString Id;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FString Label;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FString Explanation;
};

/** What the player is pointing at. A selection is never itself a commit. */
USTRUCT(BlueprintType)
struct LONGTABLEPROTOCOL_API FLongTableSelection
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadWrite, Category = "Long Table") ELongTableSelectionType Type = ELongTableSelectionType::Pass;
	/** Valid when Type is Bid. */
	UPROPERTY(BlueprintReadWrite, Category = "Long Table") FLongTableBidView Bid;
	/** Valid when Type is Declaration: true declares no trump suit. */
	UPROPERTY(BlueprintReadWrite, Category = "Long Table") bool bNoTrump = false;
	UPROPERTY(BlueprintReadWrite, Category = "Long Table") ELongTableSuit Trump = ELongTableSuit::Clubs;
	/** Valid when Type is Play. */
	UPROPERTY(BlueprintReadWrite, Category = "Long Table") FString CardId;
};

/** Typed intent. Only the authority decides whether it commits anything. */
USTRUCT(BlueprintType)
struct LONGTABLEPROTOCOL_API FLongTableIntent
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadWrite, Category = "Long Table") ELongTableIntentKind Kind = ELongTableIntentKind::Cancel;
	/** Preview only. */
	UPROPERTY(BlueprintReadWrite, Category = "Long Table") FLongTableSelection Selection;
	/** ToggleDiscard only. */
	UPROPERTY(BlueprintReadWrite, Category = "Long Table") FString CardId;
	/** HostAnnounce only. */
	UPROPERTY(BlueprintReadWrite, Category = "Long Table") ELongTableHostAnnouncement Cue = ELongTableHostAnnouncement::Welcome;
	/** HostSubstitute only. */
	UPROPERTY(BlueprintReadWrite, Category = "Long Table") ELongTableSeat Seat = ELongTableSeat::South;
	/** HostTransfer only. */
	UPROPERTY(BlueprintReadWrite, Category = "Long Table") FString ParticipantId;
};

USTRUCT(BlueprintType)
struct LONGTABLEPROTOCOL_API FLongTableLegalChoice
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FString TargetId;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") ELongTableChoiceKind Kind = ELongTableChoiceKind::Pass;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FString Label;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FLongTableIntent Intent;
};

/** Facts that are public at the table by the rules of the game. */
USTRUCT(BlueprintType)
struct LONGTABLEPROTOCOL_API FLongTablePublicCore
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FString TableId;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") int32 Version = 0;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") int32 HandNumber = 1;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") ELongTablePhase Phase = ELongTablePhase::Auction;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") ELongTableSeat Turn = ELongTableSeat::South;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FString TurnLabel;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") ELongTableSeat Dealer = ELongTableSeat::East;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FString DealerLabel;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") bool bHasContract = false;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FLongTableContractView Contract;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") TArray<FLongTableAuctionEntryView> Auction;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") TArray<FLongTablePublicTrickCard> PublicTrick;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") TArray<FLongTableCompletedTrickView> CompletedTricks;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") int32 BooksNorthSouth = 0;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") int32 BooksEastWest = 0;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") int32 ScoreNorthSouth = 0;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") int32 ScoreEastWest = 0;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") TArray<FLongTableSeatOccupancyView> Seats;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FString StatusLine;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") bool bHasSummaryLine = false;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FString SummaryLine;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") bool bPaused = false;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") bool bEventEnded = false;
};

USTRUCT(BlueprintType)
struct LONGTABLEPROTOCOL_API FLongTablePlayerProjection : public FLongTablePublicCore
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Long Table") ELongTableSeat Seat = ELongTableSeat::South;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") TArray<FLongTablePlayerCardView> Hand;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") TArray<FLongTableLegalChoice> LegalChoices;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") bool bHasPreviewLabel = false;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FString PreviewLabel;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") int32 DiscardPicked = 0;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") int32 DiscardTarget = 6;
	/** Per-seat counter for player-local changes; the shared Version does not move for them. */
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") int32 UncommittedRevision = 0;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") bool bHasFeedbackCode = false;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") ELongTableRejectionCode FeedbackCode = ELongTableRejectionCode::EngineRejected;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") bool bHasFeedbackLine = false;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FString FeedbackLine;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") TArray<FLongTableDisabledNoticeView> DisabledNotices;
};

USTRUCT(BlueprintType)
struct LONGTABLEPROTOCOL_API FLongTableHostProjection : public FLongTablePublicCore
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Long Table") bool bBetweenHands = false;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") TArray<ELongTableHostControl> HostControls;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") bool bHasLastAnnouncement = false;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") ELongTableHostAnnouncement LastAnnouncement = ELongTableHostAnnouncement::Welcome;
};

USTRUCT(BlueprintType)
struct LONGTABLEPROTOCOL_API FLongTablePublicProjection : public FLongTablePublicCore
{
	GENERATED_BODY()
};

/** The only input the robot dealer presenter receives. Carries no card member. */
USTRUCT(BlueprintType)
struct LONGTABLEPROTOCOL_API FLongTableDealerCueFrame
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FString TableId;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") int32 Version = 0;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") int32 HandNumber = 1;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") ELongTablePhase Phase = ELongTablePhase::Auction;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") ELongTableDealerCue Cue = ELongTableDealerCue::HandOpens;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") bool bHasSeat = false;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") ELongTableSeat Seat = ELongTableSeat::South;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") bool bHasSeatLabel = false;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FString SeatLabel;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") bool bHasAnnouncement = false;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") ELongTableHostAnnouncement Announcement = ELongTableHostAnnouncement::Welcome;
};

USTRUCT(BlueprintType)
struct LONGTABLEPROTOCOL_API FLongTableIntentReceipt
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FString IntentId;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") ELongTableIntentKind IntentKind = ELongTableIntentKind::Cancel;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") ELongTableOutcome Outcome = ELongTableOutcome::Rejected;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") bool bHasCode = false;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") ELongTableRejectionCode Code = ELongTableRejectionCode::EngineRejected;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FString Message;
	/** True only when the authority advanced committed table state. */
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") bool bCommitted = false;
	/** The table version after this intent was handled. */
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") int32 Version = 0;
};
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
