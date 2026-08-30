// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
/**
 * Closed wire vocabulary, mirroring packages/protocol/src/vocabulary.ts and
 * the enumerations declared beside each schema. Enumerator order is wire
 * order; LongTable.Protocol.Vocabulary compares every list against
 * fixtures/protocol/manifest.json.
 */
#pragma once

#include "CoreMinimal.h"
#include "Containers/ArrayView.h"
#include "LongTableVocabulary.generated.h"

UENUM(BlueprintType)
enum class ELongTableSeat : uint8 { South, West, North, East };

UENUM(BlueprintType)
enum class ELongTableSuit : uint8 { Clubs, Diamonds, Hearts, Spades };

UENUM(BlueprintType)
enum class ELongTableContractMode : uint8 { High, Low, NoTrumpHigh, NoTrumpLow };

UENUM(BlueprintType)
enum class ELongTablePhase : uint8 { Auction, Declaration, Kitty, Play, Summary };

/** Connection roles. AI seats never connect; their view is authority-internal. */
UENUM(BlueprintType)
enum class ELongTableRole : uint8 { Player, Host, Public, Dealer };

UENUM(BlueprintType)
enum class ELongTableOccupant : uint8 { Human, Ai, Open };

UENUM(BlueprintType)
enum class ELongTableChoiceKind : uint8 { Pass, Bid, Declare, Discard, Play, NextHand };

UENUM(BlueprintType)
enum class ELongTableSelectionType : uint8 { Pass, Bid, Declaration, Play };

UENUM(BlueprintType)
enum class ELongTableIntentKind : uint8
{
	Preview,
	ToggleDiscard,
	Cancel,
	Confirm,
	NextHand,
	HostPause,
	HostResume,
	HostAnnounce,
	HostSubstitute,
	HostTransfer,
	HostEndEvent
};

UENUM(BlueprintType)
enum class ELongTableHostControl : uint8
{
	NextHand,
	HostPause,
	HostResume,
	HostAnnounce,
	HostSubstitute,
	HostTransfer,
	HostEndEvent
};

UENUM(BlueprintType)
enum class ELongTableHostAnnouncement : uint8 { Welcome, HandStarting, PauseShortly, Resuming, LastHand, Thanks };

UENUM(BlueprintType)
enum class ELongTableOutcome : uint8 { Accepted, Duplicate, Rejected };

UENUM(BlueprintType)
enum class ELongTableRejectionCode : uint8
{
	DuplicateInputId,
	TablePaused,
	NotYourTurn,
	WrongPhase,
	BidOutsideManifest,
	IllegalBid,
	IllegalDeclaration,
	IllegalCard,
	CardNotInHand,
	DiscardLimitReached,
	DiscardIncomplete,
	NothingToConfirm,
	EngineRejected,
	StaleVersion,
	UnauthorizedRole,
	SeatNotBound,
	UnknownTable,
	NotBetweenHands,
	SeatNotSubstitutable,
	UnknownParticipant,
	EventEnded
};

UENUM(BlueprintType)
enum class ELongTableDealerCue : uint8
{
	HandOpens,
	AuctionTurn,
	ContractSet,
	KittyTaken,
	PlayOpens,
	TrickTaken,
	HandScored,
	TablePaused,
	TableResumed,
	SeatSubstituted,
	HostAnnouncement,
	NextHandReady,
	EventEnded
};

// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | BEGIN]]
UENUM(BlueprintType)
enum class ELongTableWireError : uint8
{
	SchemaRejected,
	ProtocolVersion,
	Unauthenticated,
	NotWelcomed,
	UnknownTable,
	RoleUnavailable,
	/** The intent identity was not the lane's current grant and exact next counter (malformed, foreign grant or forward gap). */
	IntentIdentity,
	/** The table incarnation consumed its maximum counter; every new intent is refused. */
	IntentExhausted
};
// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | END]]

UENUM(BlueprintType)
enum class ELongTableClientMessageType : uint8 { Hello, Intent, Resync };

UENUM(BlueprintType)
enum class ELongTableAuthorityMessageType : uint8 { Welcome, Projection, Receipt, Replay, DealerCue, Error };

/** Wire spelling of each enumeration, in enumerator order. Specialised per enum in LongTableVocabulary.cpp. */
template <typename EnumType>
struct TLongTableWire;

#define LONGTABLE_DECLARE_WIRE_ENUM(EnumType) \
	template <> \
	struct LONGTABLEPROTOCOL_API TLongTableWire<EnumType> \
	{ \
		static TArrayView<const TCHAR* const> Names(); \
		static FString ToWire(EnumType Value) { return FString(Names()[static_cast<int32>(Value)]); } \
		static bool FromWire(const FString& Text, EnumType& OutValue) \
		{ \
			const TArrayView<const TCHAR* const> List = Names(); \
			for (int32 Index = 0; Index < List.Num(); ++Index) \
			{ \
				if (Text.Equals(List[Index], ESearchCase::CaseSensitive)) \
				{ \
					OutValue = static_cast<EnumType>(Index); \
					return true; \
				} \
			} \
			return false; \
		} \
	};

LONGTABLE_DECLARE_WIRE_ENUM(ELongTableSeat)
LONGTABLE_DECLARE_WIRE_ENUM(ELongTableSuit)
LONGTABLE_DECLARE_WIRE_ENUM(ELongTableContractMode)
LONGTABLE_DECLARE_WIRE_ENUM(ELongTablePhase)
LONGTABLE_DECLARE_WIRE_ENUM(ELongTableRole)
LONGTABLE_DECLARE_WIRE_ENUM(ELongTableOccupant)
LONGTABLE_DECLARE_WIRE_ENUM(ELongTableChoiceKind)
LONGTABLE_DECLARE_WIRE_ENUM(ELongTableSelectionType)
LONGTABLE_DECLARE_WIRE_ENUM(ELongTableIntentKind)
LONGTABLE_DECLARE_WIRE_ENUM(ELongTableHostControl)
LONGTABLE_DECLARE_WIRE_ENUM(ELongTableHostAnnouncement)
LONGTABLE_DECLARE_WIRE_ENUM(ELongTableOutcome)
LONGTABLE_DECLARE_WIRE_ENUM(ELongTableRejectionCode)
LONGTABLE_DECLARE_WIRE_ENUM(ELongTableDealerCue)
LONGTABLE_DECLARE_WIRE_ENUM(ELongTableWireError)
LONGTABLE_DECLARE_WIRE_ENUM(ELongTableClientMessageType)
LONGTABLE_DECLARE_WIRE_ENUM(ELongTableAuthorityMessageType)

#undef LONGTABLE_DECLARE_WIRE_ENUM

struct FLongTableVocabularyList
{
	FString Name;
	TArrayView<const TCHAR* const> Names;
};

/** Protocol constants and bounds shared by every schema (vocabulary.ts LIMITS). */
namespace LongTableProtocol
{
	LONGTABLEPROTOCOL_API extern const TCHAR* const ProtocolVersion;
	LONGTABLEPROTOCOL_API extern const TCHAR* const ManifestId;

	constexpr int32 IdLength = 64;
	constexpr int32 LabelLength = 80;
	constexpr int32 LineLength = 240;
	constexpr int32 GlyphLength = 4;
	constexpr int32 RankTextLength = 4;
	constexpr int32 DisplayNameLength = 32;
	constexpr int32 TokenLength = 128;
	constexpr int32 DetailLength = 120;
	constexpr int32 MaxListLength = 64;
	constexpr int32 MaxHandLength = 18;
	constexpr int32 MaxVersion = 2147483647;
	constexpr int32 MinBidLevel = 3;
	constexpr int32 MaxBidLevel = 7;
	constexpr int32 TricksPerHand = 12;
	constexpr int32 MaxReplayFrames = 512;

	// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | BEGIN]]
	/**
	 * long-table-intent-idempotency/v2: an intent identity is the lane's
	 * current server-issued grant sessionId plus a canonical decimal counter in
	 * [IntentCounterMin, IntentCounterMax]. Consuming the maximum counter
	 * exhausts the entire table incarnation; there is no wrap.
	 */
	constexpr int64 IntentCounterMin = 1;
	constexpr int64 IntentCounterMax = 9007199254740991LL;
	// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | END]]

	/** Every vocabulary list keyed by its manifest.json name. */
	LONGTABLEPROTOCOL_API TArray<FLongTableVocabularyList> VocabularyLists();
}
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
