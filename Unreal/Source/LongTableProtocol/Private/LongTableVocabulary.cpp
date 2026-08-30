// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
#include "LongTableVocabulary.h"

namespace
{
	const TCHAR* const SeatNames[] = { TEXT("south"), TEXT("west"), TEXT("north"), TEXT("east") };
	const TCHAR* const SuitNames[] = { TEXT("clubs"), TEXT("diamonds"), TEXT("hearts"), TEXT("spades") };
	const TCHAR* const ContractModeNames[] = { TEXT("high"), TEXT("low"), TEXT("no-trump-high"), TEXT("no-trump-low") };
	const TCHAR* const PhaseNames[] = { TEXT("auction"), TEXT("declaration"), TEXT("kitty"), TEXT("play"), TEXT("summary") };
	const TCHAR* const RoleNames[] = { TEXT("player"), TEXT("host"), TEXT("public"), TEXT("dealer") };
	const TCHAR* const OccupantNames[] = { TEXT("human"), TEXT("ai"), TEXT("open") };
	const TCHAR* const ChoiceKindNames[] = { TEXT("pass"), TEXT("bid"), TEXT("declare"), TEXT("discard"), TEXT("play"), TEXT("next-hand") };
	const TCHAR* const SelectionTypeNames[] = { TEXT("pass"), TEXT("bid"), TEXT("declaration"), TEXT("play") };
	const TCHAR* const IntentKindNames[] =
	{
		TEXT("preview"), TEXT("toggle-discard"), TEXT("cancel"), TEXT("confirm"), TEXT("next-hand"),
		TEXT("host-pause"), TEXT("host-resume"), TEXT("host-announce"), TEXT("host-substitute"), TEXT("host-transfer"), TEXT("host-end-event")
	};
	const TCHAR* const HostControlNames[] =
	{
		TEXT("next-hand"), TEXT("host-pause"), TEXT("host-resume"), TEXT("host-announce"), TEXT("host-substitute"), TEXT("host-transfer"), TEXT("host-end-event")
	};
	const TCHAR* const HostAnnouncementNames[] = { TEXT("welcome"), TEXT("hand-starting"), TEXT("pause-shortly"), TEXT("resuming"), TEXT("last-hand"), TEXT("thanks") };
	const TCHAR* const OutcomeNames[] = { TEXT("accepted"), TEXT("duplicate"), TEXT("rejected") };
	const TCHAR* const RejectionCodeNames[] =
	{
		TEXT("duplicate-input-id"), TEXT("table-paused"), TEXT("not-your-turn"), TEXT("wrong-phase"), TEXT("bid-outside-manifest"),
		TEXT("illegal-bid"), TEXT("illegal-declaration"), TEXT("illegal-card"), TEXT("card-not-in-hand"), TEXT("discard-limit-reached"),
		TEXT("discard-incomplete"), TEXT("nothing-to-confirm"), TEXT("engine-rejected"), TEXT("stale-version"), TEXT("unauthorized-role"),
		TEXT("seat-not-bound"), TEXT("unknown-table"), TEXT("not-between-hands"), TEXT("seat-not-substitutable"), TEXT("unknown-participant"),
		TEXT("event-ended")
	};
	const TCHAR* const DealerCueNames[] =
	{
		TEXT("hand-opens"), TEXT("auction-turn"), TEXT("contract-set"), TEXT("kitty-taken"), TEXT("play-opens"), TEXT("trick-taken"),
		TEXT("hand-scored"), TEXT("table-paused"), TEXT("table-resumed"), TEXT("seat-substituted"), TEXT("host-announcement"),
		TEXT("next-hand-ready"), TEXT("event-ended")
	};
	const TCHAR* const WireErrorNames[] =
	{
		TEXT("schema-rejected"), TEXT("protocol-version"), TEXT("unauthenticated"), TEXT("not-welcomed"), TEXT("unknown-table"), TEXT("role-unavailable")
	};
	const TCHAR* const ClientMessageTypeNames[] = { TEXT("hello"), TEXT("intent"), TEXT("resync") };
	const TCHAR* const AuthorityMessageTypeNames[] = { TEXT("welcome"), TEXT("projection"), TEXT("receipt"), TEXT("replay"), TEXT("dealer-cue"), TEXT("error") };
}

#define LONGTABLE_DEFINE_WIRE_ENUM(EnumType, Array) \
	TArrayView<const TCHAR* const> TLongTableWire<EnumType>::Names() { return MakeArrayView(Array); }

LONGTABLE_DEFINE_WIRE_ENUM(ELongTableSeat, SeatNames)
LONGTABLE_DEFINE_WIRE_ENUM(ELongTableSuit, SuitNames)
LONGTABLE_DEFINE_WIRE_ENUM(ELongTableContractMode, ContractModeNames)
LONGTABLE_DEFINE_WIRE_ENUM(ELongTablePhase, PhaseNames)
LONGTABLE_DEFINE_WIRE_ENUM(ELongTableRole, RoleNames)
LONGTABLE_DEFINE_WIRE_ENUM(ELongTableOccupant, OccupantNames)
LONGTABLE_DEFINE_WIRE_ENUM(ELongTableChoiceKind, ChoiceKindNames)
LONGTABLE_DEFINE_WIRE_ENUM(ELongTableSelectionType, SelectionTypeNames)
LONGTABLE_DEFINE_WIRE_ENUM(ELongTableIntentKind, IntentKindNames)
LONGTABLE_DEFINE_WIRE_ENUM(ELongTableHostControl, HostControlNames)
LONGTABLE_DEFINE_WIRE_ENUM(ELongTableHostAnnouncement, HostAnnouncementNames)
LONGTABLE_DEFINE_WIRE_ENUM(ELongTableOutcome, OutcomeNames)
LONGTABLE_DEFINE_WIRE_ENUM(ELongTableRejectionCode, RejectionCodeNames)
LONGTABLE_DEFINE_WIRE_ENUM(ELongTableDealerCue, DealerCueNames)
LONGTABLE_DEFINE_WIRE_ENUM(ELongTableWireError, WireErrorNames)
LONGTABLE_DEFINE_WIRE_ENUM(ELongTableClientMessageType, ClientMessageTypeNames)
LONGTABLE_DEFINE_WIRE_ENUM(ELongTableAuthorityMessageType, AuthorityMessageTypeNames)

#undef LONGTABLE_DEFINE_WIRE_ENUM

namespace LongTableProtocol
{
	const TCHAR* const ProtocolVersion = TEXT("long-table-protocol/1");
	const TCHAR* const ManifestId = TEXT("RESTRICTED_TABLE_SLICE_0_1");

	TArray<FLongTableVocabularyList> VocabularyLists()
	{
		return
		{
			{ TEXT("seats"), MakeArrayView(SeatNames) },
			{ TEXT("suits"), MakeArrayView(SuitNames) },
			{ TEXT("contractModes"), MakeArrayView(ContractModeNames) },
			{ TEXT("phases"), MakeArrayView(PhaseNames) },
			{ TEXT("roles"), MakeArrayView(RoleNames) },
			{ TEXT("occupants"), MakeArrayView(OccupantNames) },
			{ TEXT("choiceKinds"), MakeArrayView(ChoiceKindNames) },
			{ TEXT("selectionTypes"), MakeArrayView(SelectionTypeNames) },
			{ TEXT("intentKinds"), MakeArrayView(IntentKindNames) },
			{ TEXT("hostControls"), MakeArrayView(HostControlNames) },
			{ TEXT("hostAnnouncementCues"), MakeArrayView(HostAnnouncementNames) },
			{ TEXT("outcomes"), MakeArrayView(OutcomeNames) },
			{ TEXT("rejectionCodes"), MakeArrayView(RejectionCodeNames) },
			{ TEXT("dealerCues"), MakeArrayView(DealerCueNames) },
			{ TEXT("wireErrorCodes"), MakeArrayView(WireErrorNames) },
		};
	}
}
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
