// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
#include "LongTableJson.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"

using namespace LongTableProtocol;

// ---------------------------------------------------------------------------
// Closed reader
// ---------------------------------------------------------------------------

FLongTableClosedReader::FLongTableClosedReader(const TSharedPtr<FJsonValue>& InValue, const FString& InPath, FLongTableSchemaRejection& InRejection)
	: Path(InPath)
	, Value(InValue)
	, Rejection(InRejection)
{
}

bool FLongTableClosedReader::Reject(const TCHAR* Code, const FString& AtPath)
{
	if (!Rejection.IsSet())
	{
		Rejection.Code = Code;
		Rejection.Path = AtPath;
	}
	return false;
}

bool FLongTableClosedReader::BeginObject(TArrayView<const TCHAR* const> AllowedKeys)
{
	if (Failed()) { return false; }
	if (!Value.IsValid() || Value->Type != EJson::Object)
	{
		return Reject(TEXT("not-an-object"), Path);
	}
	Object = Value->AsObject();
	for (const TPair<FString, TSharedPtr<FJsonValue>>& Pair : Object->Values)
	{
		bool bAllowed = false;
		for (const TCHAR* Allowed : AllowedKeys)
		{
			if (Pair.Key.Equals(Allowed, ESearchCase::CaseSensitive)) { bAllowed = true; break; }
		}
		if (!bAllowed) { return Reject(TEXT("unknown-field"), ChildPath(*Pair.Key)); }
	}
	return true;
}

const TSharedPtr<FJsonValue>* FLongTableClosedReader::Field(const TCHAR* Key) const
{
	return Object.IsValid() ? Object->Values.Find(FString(Key)) : nullptr;
}

bool FLongTableClosedReader::IsNullField(const TCHAR* Key) const
{
	const TSharedPtr<FJsonValue>* Found = Field(Key);
	return Found && Found->IsValid() && (*Found)->Type == EJson::Null;
}

bool FLongTableClosedReader::ReadString(const TCHAR* Key, int32 MaxLength, bool bAllowEmpty, FString& OutValue)
{
	if (Failed()) { return false; }
	const TSharedPtr<FJsonValue>* Found = Field(Key);
	if (!Found || !Found->IsValid()) { return Reject(TEXT("missing-field"), ChildPath(Key)); }
	if ((*Found)->Type != EJson::String) { return Reject(TEXT("type-mismatch"), ChildPath(Key)); }
	OutValue = (*Found)->AsString();
	if (OutValue.Len() > MaxLength || (!bAllowEmpty && OutValue.IsEmpty())) { return Reject(TEXT("value-out-of-range"), ChildPath(Key)); }
	return true;
}

bool FLongTableClosedReader::ReadNullableString(const TCHAR* Key, int32 MaxLength, bool& bOutHas, FString& OutValue)
{
	bOutHas = false;
	OutValue.Reset();
	if (Failed()) { return false; }
	if (IsNullField(Key)) { return true; }
	bOutHas = true;
	return ReadString(Key, MaxLength, false, OutValue);
}

bool FLongTableClosedReader::ReadInt(const TCHAR* Key, int64 Min, int64 Max, int32& OutValue)
{
	if (Failed()) { return false; }
	const TSharedPtr<FJsonValue>* Found = Field(Key);
	if (!Found || !Found->IsValid()) { return Reject(TEXT("missing-field"), ChildPath(Key)); }
	if ((*Found)->Type != EJson::Number) { return Reject(TEXT("type-mismatch"), ChildPath(Key)); }
	const double Number = (*Found)->AsNumber();
	if (Number != FMath::FloorToDouble(Number)) { return Reject(TEXT("type-mismatch"), ChildPath(Key)); }
	if (Number < static_cast<double>(Min) || Number > static_cast<double>(Max)) { return Reject(TEXT("value-out-of-range"), ChildPath(Key)); }
	OutValue = static_cast<int32>(Number);
	return true;
}

bool FLongTableClosedReader::ReadNullableInt(const TCHAR* Key, int64 Min, int64 Max, bool& bOutHas, int32& OutValue)
{
	bOutHas = false;
	OutValue = 0;
	if (Failed()) { return false; }
	if (IsNullField(Key)) { return true; }
	bOutHas = true;
	return ReadInt(Key, Min, Max, OutValue);
}

bool FLongTableClosedReader::ReadBool(const TCHAR* Key, bool& OutValue)
{
	if (Failed()) { return false; }
	const TSharedPtr<FJsonValue>* Found = Field(Key);
	if (!Found || !Found->IsValid()) { return Reject(TEXT("missing-field"), ChildPath(Key)); }
	if ((*Found)->Type != EJson::Boolean) { return Reject(TEXT("type-mismatch"), ChildPath(Key)); }
	OutValue = (*Found)->AsBool();
	return true;
}

bool FLongTableClosedReader::ReadLiteral(const TCHAR* Key, const TCHAR* Expected)
{
	if (Failed()) { return false; }
	const TSharedPtr<FJsonValue>* Found = Field(Key);
	if (!Found || !Found->IsValid()) { return Reject(TEXT("missing-field"), ChildPath(Key)); }
	if ((*Found)->Type != EJson::String || !(*Found)->AsString().Equals(Expected, ESearchCase::CaseSensitive))
	{
		return Reject(TEXT("value-out-of-range"), ChildPath(Key));
	}
	return true;
}

bool FLongTableClosedReader::ReadEnumText(const TCHAR* Key, FString& OutText)
{
	if (Failed()) { return false; }
	const TSharedPtr<FJsonValue>* Found = Field(Key);
	if (!Found || !Found->IsValid()) { return Reject(TEXT("missing-field"), ChildPath(Key)); }
	if ((*Found)->Type != EJson::String) { return Reject(TEXT("type-mismatch"), ChildPath(Key)); }
	OutText = (*Found)->AsString();
	return true;
}

bool FLongTableClosedReader::ReadEnumTextSelf(FString& OutText)
{
	if (Failed()) { return false; }
	if (!Value.IsValid() || Value->Type != EJson::String) { return Reject(TEXT("type-mismatch"), Path); }
	OutText = Value->AsString();
	return true;
}

bool FLongTableClosedReader::ReadObject(const TCHAR* Key, TFunctionRef<bool(FLongTableClosedReader&)> Decode)
{
	if (Failed()) { return false; }
	const TSharedPtr<FJsonValue>* Found = Field(Key);
	if (!Found || !Found->IsValid()) { return Reject(TEXT("missing-field"), ChildPath(Key)); }
	FLongTableClosedReader Child(*Found, ChildPath(Key), Rejection);
	return Decode(Child) && !Failed();
}

bool FLongTableClosedReader::ReadNullableObject(const TCHAR* Key, bool& bOutHas, TFunctionRef<bool(FLongTableClosedReader&)> Decode)
{
	bOutHas = false;
	if (Failed()) { return false; }
	if (IsNullField(Key)) { return true; }
	bOutHas = true;
	return ReadObject(Key, Decode);
}

bool FLongTableClosedReader::ReadArray(const TCHAR* Key, int32 MaxLength, TFunctionRef<bool(FLongTableClosedReader&)> DecodeItem)
{
	if (Failed()) { return false; }
	const TSharedPtr<FJsonValue>* Found = Field(Key);
	if (!Found || !Found->IsValid()) { return Reject(TEXT("missing-field"), ChildPath(Key)); }
	if ((*Found)->Type != EJson::Array) { return Reject(TEXT("type-mismatch"), ChildPath(Key)); }
	const TArray<TSharedPtr<FJsonValue>>& Items = (*Found)->AsArray();
	if (Items.Num() > MaxLength) { return Reject(TEXT("value-out-of-range"), ChildPath(Key)); }
	for (int32 Index = 0; Index < Items.Num(); ++Index)
	{
		FLongTableClosedReader Item(Items[Index], FString::Printf(TEXT("%s[%d]"), *ChildPath(Key), Index), Rejection);
		if (!DecodeItem(Item) || Failed()) { return false; }
	}
	return true;
}

bool FLongTableClosedReader::ReadProjectionPayload(const TCHAR* Key, TSharedPtr<FJsonValue>& OutJson)
{
	if (Failed()) { return false; }
	const TSharedPtr<FJsonValue>* Found = Field(Key);
	if (!Found || !Found->IsValid()) { return Reject(TEXT("missing-field"), ChildPath(Key)); }
	const FString PayloadPath = ChildPath(Key);
	if ((*Found)->Type != EJson::Object) { return Reject(TEXT("not-an-object"), PayloadPath); }
	const TSharedPtr<FJsonValue>* RoleField = (*Found)->AsObject()->Values.Find(TEXT("role"));
	if (!RoleField || !RoleField->IsValid() || (*RoleField)->Type != EJson::String) { return Reject(TEXT("type-mismatch"), PayloadPath + TEXT(".role")); }
	ELongTableRole Role;
	if (!TLongTableWire<ELongTableRole>::FromWire((*RoleField)->AsString(), Role) || Role == ELongTableRole::Dealer)
	{
		return Reject(TEXT("unknown-variant"), PayloadPath + TEXT(".role"));
	}
	OutJson = *Found;
	return true;
}

bool FLongTableClosedReader::ReadNullableProjectionPayload(const TCHAR* Key, bool& bOutHas, TSharedPtr<FJsonValue>& OutJson)
{
	bOutHas = false;
	OutJson.Reset();
	if (Failed()) { return false; }
	if (IsNullField(Key)) { return true; }
	bOutHas = true;
	return ReadProjectionPayload(Key, OutJson);
}

bool FLongTableClosedReader::ReadDiscriminant(const TCHAR* Key, FString& OutTag)
{
	if (Failed()) { return false; }
	if (!Value.IsValid() || Value->Type != EJson::Object) { return Reject(TEXT("not-an-object"), Path); }
	Object = Value->AsObject();
	const TSharedPtr<FJsonValue>* Found = Field(Key);
	if (!Found || !Found->IsValid() || (*Found)->Type != EJson::String) { return Reject(TEXT("type-mismatch"), ChildPath(Key)); }
	OutTag = (*Found)->AsString();
	return true;
}

bool FLongTableClosedReader::RejectUnknownVariant(const TCHAR* Key)
{
	return Reject(TEXT("unknown-variant"), ChildPath(Key));
}

// ---------------------------------------------------------------------------
// Canonical writer
// ---------------------------------------------------------------------------

void FLongTableCanonicalWriter::Prefix()
{
	if (bAfterKey)
	{
		bAfterKey = false;
		return;
	}
	if (NeedComma.Num() > 0)
	{
		if (NeedComma.Last()) { Out.AppendChar(TEXT(',')); }
		NeedComma.Last() = true;
	}
}

void FLongTableCanonicalWriter::BeginObject()
{
	Prefix();
	Out.AppendChar(TEXT('{'));
	NeedComma.Add(false);
}

void FLongTableCanonicalWriter::EndObject()
{
	NeedComma.Pop();
	Out.AppendChar(TEXT('}'));
}

void FLongTableCanonicalWriter::BeginArray()
{
	Prefix();
	Out.AppendChar(TEXT('['));
	NeedComma.Add(false);
}

void FLongTableCanonicalWriter::EndArray()
{
	NeedComma.Pop();
	Out.AppendChar(TEXT(']'));
}

void FLongTableCanonicalWriter::Key(const TCHAR* Name)
{
	Prefix();
	Escape(FString(Name));
	Out.AppendChar(TEXT(':'));
	bAfterKey = true;
}

void FLongTableCanonicalWriter::String(const FString& Text)
{
	Prefix();
	Escape(Text);
}

void FLongTableCanonicalWriter::Int(int64 Number)
{
	Prefix();
	Out.Append(LexToString(Number));
}

void FLongTableCanonicalWriter::Bool(bool bValue)
{
	Prefix();
	Out.Append(bValue ? TEXT("true") : TEXT("false"));
}

void FLongTableCanonicalWriter::Null()
{
	Prefix();
	Out.Append(TEXT("null"));
}

void FLongTableCanonicalWriter::Raw(const FString& CanonicalText)
{
	Prefix();
	Out.Append(CanonicalText);
}

void FLongTableCanonicalWriter::Escape(const FString& Text)
{
	Out.AppendChar(TEXT('"'));
	for (const TCHAR Char : Text)
	{
		switch (Char)
		{
		case TEXT('"'): Out.Append(TEXT("\\\"")); break;
		case TEXT('\\'): Out.Append(TEXT("\\\\")); break;
		case TEXT('\b'): Out.Append(TEXT("\\b")); break;
		case TEXT('\f'): Out.Append(TEXT("\\f")); break;
		case TEXT('\n'): Out.Append(TEXT("\\n")); break;
		case TEXT('\r'): Out.Append(TEXT("\\r")); break;
		case TEXT('\t'): Out.Append(TEXT("\\t")); break;
		default:
			if (static_cast<uint32>(Char) < 0x20)
			{
				Out.Append(FString::Printf(TEXT("\\u%04x"), static_cast<uint32>(Char)));
			}
			else
			{
				Out.AppendChar(Char);
			}
		}
	}
	Out.AppendChar(TEXT('"'));
}

// ---------------------------------------------------------------------------
// Schemas: allowlisted keys in declared order (mirrors packages/protocol)
// ---------------------------------------------------------------------------

namespace
{
	using FReader = FLongTableClosedReader;
	using FWriter = FLongTableCanonicalWriter;

	template <typename EnumType>
	FString Wire(EnumType Value) { return TLongTableWire<EnumType>::ToWire(Value); }

	const TCHAR* const BidKeys[] = { TEXT("level"), TEXT("mode") };
	const TCHAR* const AuctionEntryKeys[] = { TEXT("seat"), TEXT("bid") };
	const TCHAR* const ContractKeys[] = { TEXT("level"), TEXT("mode"), TEXT("modeLabel"), TEXT("trump"), TEXT("trumpLabel"), TEXT("bidder"), TEXT("bidderLabel") };
	const TCHAR* const PublicTrickCardKeys[] = { TEXT("seat"), TEXT("seatLabel"), TEXT("cardId"), TEXT("label"), TEXT("glyph"), TEXT("rankText"), TEXT("red") };
	const TCHAR* const CompletedTrickKeys[] = { TEXT("number"), TEXT("lead"), TEXT("winner") };
	const TCHAR* const SeatOccupancyKeys[] = { TEXT("seat"), TEXT("seatLabel"), TEXT("occupant"), TEXT("displayName"), TEXT("connected"), TEXT("cardCount") };
	const TCHAR* const PlayerCardKeys[] = { TEXT("cardId"), TEXT("label"), TEXT("glyph"), TEXT("rankText"), TEXT("red"), TEXT("legal"), TEXT("selectedForDiscard"), TEXT("previewed") };
	const TCHAR* const DisabledNoticeKeys[] = { TEXT("id"), TEXT("label"), TEXT("explanation") };
	const TCHAR* const SelectionPassKeys[] = { TEXT("type") };
	const TCHAR* const SelectionBidKeys[] = { TEXT("type"), TEXT("bid") };
	const TCHAR* const SelectionDeclarationKeys[] = { TEXT("type"), TEXT("trump") };
	const TCHAR* const SelectionPlayKeys[] = { TEXT("type"), TEXT("cardId") };
	const TCHAR* const IntentKindOnlyKeys[] = { TEXT("kind") };
	const TCHAR* const IntentPreviewKeys[] = { TEXT("kind"), TEXT("selection") };
	const TCHAR* const IntentCardKeys[] = { TEXT("kind"), TEXT("cardId") };
	const TCHAR* const IntentCueKeys[] = { TEXT("kind"), TEXT("cue") };
	const TCHAR* const IntentSeatKeys[] = { TEXT("kind"), TEXT("seat") };
	const TCHAR* const IntentParticipantKeys[] = { TEXT("kind"), TEXT("participantId") };
	const TCHAR* const LegalChoiceKeys[] = { TEXT("targetId"), TEXT("kind"), TEXT("label"), TEXT("intent") };

#define LONGTABLE_CORE_KEYS \
	TEXT("protocolVersion"), TEXT("manifestId"), TEXT("tableId"), TEXT("version"), TEXT("handNumber"), TEXT("phase"), TEXT("turn"), TEXT("turnLabel"), \
	TEXT("dealer"), TEXT("dealerLabel"), TEXT("contract"), TEXT("auction"), TEXT("publicTrick"), TEXT("completedTricks"), TEXT("booksNorthSouth"), \
	TEXT("booksEastWest"), TEXT("scoreNorthSouth"), TEXT("scoreEastWest"), TEXT("seats"), TEXT("statusLine"), TEXT("summaryLine"), TEXT("paused"), TEXT("eventEnded")

	const TCHAR* const CoreKeys[] = { LONGTABLE_CORE_KEYS };
	const TCHAR* const PlayerProjectionKeys[] =
	{
		TEXT("role"), LONGTABLE_CORE_KEYS, TEXT("seat"), TEXT("hand"), TEXT("legalChoices"), TEXT("previewLabel"), TEXT("discardPicked"),
		TEXT("discardTarget"), TEXT("uncommittedRevision"), TEXT("feedbackCode"), TEXT("feedbackLine"), TEXT("disabledNotices")
	};
	const TCHAR* const HostProjectionKeys[] = { TEXT("role"), LONGTABLE_CORE_KEYS, TEXT("betweenHands"), TEXT("hostControls"), TEXT("lastAnnouncement") };
	const TCHAR* const PublicProjectionKeys[] = { TEXT("role"), LONGTABLE_CORE_KEYS };
#undef LONGTABLE_CORE_KEYS

	const TCHAR* const DealerCueKeys[] = { TEXT("protocolVersion"), TEXT("tableId"), TEXT("version"), TEXT("handNumber"), TEXT("phase"), TEXT("cue"), TEXT("seat"), TEXT("seatLabel"), TEXT("announcement") };
	const TCHAR* const ReceiptKeys[] = { TEXT("intentId"), TEXT("intentKind"), TEXT("outcome"), TEXT("code"), TEXT("message"), TEXT("committed"), TEXT("version") };
	const TCHAR* const HelloKeys[] = { TEXT("type"), TEXT("protocolVersion"), TEXT("token"), TEXT("role"), TEXT("tableId"), TEXT("displayName"), TEXT("lastVersion") };
	const TCHAR* const IntentMessageKeys[] = { TEXT("type"), TEXT("tableId"), TEXT("intentId"), TEXT("expectedVersion"), TEXT("intent") };
	const TCHAR* const ResyncKeys[] = { TEXT("type"), TEXT("tableId"), TEXT("lastVersion") };
	// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | BEGIN]]
	const TCHAR* const WelcomeKeys[] = { TEXT("type"), TEXT("protocolVersion"), TEXT("sessionId"), TEXT("role"), TEXT("seat"), TEXT("tableId"), TEXT("version"), TEXT("nextIntentCounter"), TEXT("projection") };
	// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | END]]
	const TCHAR* const ProjectionMessageKeys[] = { TEXT("type"), TEXT("tableId"), TEXT("version"), TEXT("projection") };
	const TCHAR* const ReceiptMessageKeys[] = { TEXT("type"), TEXT("tableId"), TEXT("receipt") };
	const TCHAR* const ReplayMessageKeys[] = { TEXT("type"), TEXT("tableId"), TEXT("fromVersion"), TEXT("toVersion"), TEXT("truncated"), TEXT("frames") };
	const TCHAR* const ReplayFrameKeys[] = { TEXT("version"), TEXT("projection") };
	const TCHAR* const DealerCueMessageKeys[] = { TEXT("type"), TEXT("tableId"), TEXT("frame") };
	const TCHAR* const ErrorMessageKeys[] = { TEXT("type"), TEXT("code"), TEXT("detail") };

	// ---- decoders -----------------------------------------------------------

	bool DecodeBid(FReader& R, FLongTableBidView& Out)
	{
		return R.BeginObject(MakeArrayView(BidKeys))
			&& R.ReadInt(TEXT("level"), MinBidLevel, MaxBidLevel, Out.Level)
			&& R.ReadEnum(TEXT("mode"), Out.Mode);
	}

	bool DecodeAuctionEntry(FReader& R, FLongTableAuctionEntryView& Out)
	{
		return R.BeginObject(MakeArrayView(AuctionEntryKeys))
			&& R.ReadEnum(TEXT("seat"), Out.Seat)
			&& R.ReadNullableObject(TEXT("bid"), Out.bHasBid, [&Out](FReader& Child) { return DecodeBid(Child, Out.Bid); });
	}

	bool DecodeContract(FReader& R, FLongTableContractView& Out)
	{
		return R.BeginObject(MakeArrayView(ContractKeys))
			&& R.ReadInt(TEXT("level"), MinBidLevel, MaxBidLevel, Out.Level)
			&& R.ReadEnum(TEXT("mode"), Out.Mode)
			&& R.ReadString(TEXT("modeLabel"), LabelLength, false, Out.ModeLabel)
			&& R.ReadNullableEnum(TEXT("trump"), Out.bHasTrump, Out.Trump)
			&& R.ReadString(TEXT("trumpLabel"), LabelLength, false, Out.TrumpLabel)
			&& R.ReadEnum(TEXT("bidder"), Out.Bidder)
			&& R.ReadString(TEXT("bidderLabel"), LabelLength, false, Out.BidderLabel);
	}

	bool DecodePublicTrickCard(FReader& R, FLongTablePublicTrickCard& Out)
	{
		return R.BeginObject(MakeArrayView(PublicTrickCardKeys))
			&& R.ReadEnum(TEXT("seat"), Out.Seat)
			&& R.ReadString(TEXT("seatLabel"), LabelLength, false, Out.SeatLabel)
			&& R.ReadString(TEXT("cardId"), IdLength, false, Out.CardId)
			&& R.ReadString(TEXT("label"), LabelLength, false, Out.Label)
			&& R.ReadString(TEXT("glyph"), GlyphLength, false, Out.Glyph)
			&& R.ReadString(TEXT("rankText"), RankTextLength, false, Out.RankText)
			&& R.ReadBool(TEXT("red"), Out.bRed);
	}

	bool DecodeCompletedTrick(FReader& R, FLongTableCompletedTrickView& Out)
	{
		return R.BeginObject(MakeArrayView(CompletedTrickKeys))
			&& R.ReadInt(TEXT("number"), 1, TricksPerHand, Out.Number)
			&& R.ReadEnum(TEXT("lead"), Out.Lead)
			&& R.ReadEnum(TEXT("winner"), Out.Winner);
	}

	bool DecodeSeatOccupancy(FReader& R, FLongTableSeatOccupancyView& Out)
	{
		return R.BeginObject(MakeArrayView(SeatOccupancyKeys))
			&& R.ReadEnum(TEXT("seat"), Out.Seat)
			&& R.ReadString(TEXT("seatLabel"), LabelLength, false, Out.SeatLabel)
			&& R.ReadEnum(TEXT("occupant"), Out.Occupant)
			&& R.ReadString(TEXT("displayName"), DisplayNameLength, false, Out.DisplayName)
			&& R.ReadBool(TEXT("connected"), Out.bConnected)
			&& R.ReadInt(TEXT("cardCount"), 0, MaxHandLength, Out.CardCount);
	}

	bool DecodePlayerCard(FReader& R, FLongTablePlayerCardView& Out)
	{
		return R.BeginObject(MakeArrayView(PlayerCardKeys))
			&& R.ReadString(TEXT("cardId"), IdLength, false, Out.CardId)
			&& R.ReadString(TEXT("label"), LabelLength, false, Out.Label)
			&& R.ReadString(TEXT("glyph"), GlyphLength, false, Out.Glyph)
			&& R.ReadString(TEXT("rankText"), RankTextLength, false, Out.RankText)
			&& R.ReadBool(TEXT("red"), Out.bRed)
			&& R.ReadBool(TEXT("legal"), Out.bLegal)
			&& R.ReadBool(TEXT("selectedForDiscard"), Out.bSelectedForDiscard)
			&& R.ReadBool(TEXT("previewed"), Out.bPreviewed);
	}

	bool DecodeDisabledNotice(FReader& R, FLongTableDisabledNoticeView& Out)
	{
		return R.BeginObject(MakeArrayView(DisabledNoticeKeys))
			&& R.ReadString(TEXT("id"), IdLength, false, Out.Id)
			&& R.ReadString(TEXT("label"), LabelLength, false, Out.Label)
			&& R.ReadString(TEXT("explanation"), LineLength, false, Out.Explanation);
	}

	bool DecodeSelection(FReader& R, FLongTableSelection& Out)
	{
		FString Tag;
		if (!R.ReadDiscriminant(TEXT("type"), Tag)) { return false; }
		if (!TLongTableWire<ELongTableSelectionType>::FromWire(Tag, Out.Type)) { return R.RejectUnknownVariant(TEXT("type")); }
		switch (Out.Type)
		{
		case ELongTableSelectionType::Pass:
			return R.BeginObject(MakeArrayView(SelectionPassKeys)) && R.ReadLiteral(TEXT("type"), TEXT("pass"));
		case ELongTableSelectionType::Bid:
			return R.BeginObject(MakeArrayView(SelectionBidKeys)) && R.ReadLiteral(TEXT("type"), TEXT("bid"))
				&& R.ReadObject(TEXT("bid"), [&Out](FReader& Child) { return DecodeBid(Child, Out.Bid); });
		case ELongTableSelectionType::Declaration:
		{
			bool bHasTrump = false;
			const bool bOk = R.BeginObject(MakeArrayView(SelectionDeclarationKeys)) && R.ReadLiteral(TEXT("type"), TEXT("declaration"))
				&& R.ReadNullableEnum(TEXT("trump"), bHasTrump, Out.Trump);
			Out.bNoTrump = !bHasTrump;
			return bOk;
		}
		case ELongTableSelectionType::Play:
			return R.BeginObject(MakeArrayView(SelectionPlayKeys)) && R.ReadLiteral(TEXT("type"), TEXT("play"))
				&& R.ReadString(TEXT("cardId"), IdLength, false, Out.CardId);
		}
		return false;
	}

	bool DecodeIntentInner(FReader& R, FLongTableIntent& Out)
	{
		FString Tag;
		if (!R.ReadDiscriminant(TEXT("kind"), Tag)) { return false; }
		if (!TLongTableWire<ELongTableIntentKind>::FromWire(Tag, Out.Kind)) { return R.RejectUnknownVariant(TEXT("kind")); }
		const FString Literal = Wire(Out.Kind);
		switch (Out.Kind)
		{
		case ELongTableIntentKind::Preview:
			return R.BeginObject(MakeArrayView(IntentPreviewKeys)) && R.ReadLiteral(TEXT("kind"), *Literal)
				&& R.ReadObject(TEXT("selection"), [&Out](FReader& Child) { return DecodeSelection(Child, Out.Selection); });
		case ELongTableIntentKind::ToggleDiscard:
			return R.BeginObject(MakeArrayView(IntentCardKeys)) && R.ReadLiteral(TEXT("kind"), *Literal)
				&& R.ReadString(TEXT("cardId"), IdLength, false, Out.CardId);
		case ELongTableIntentKind::HostAnnounce:
			return R.BeginObject(MakeArrayView(IntentCueKeys)) && R.ReadLiteral(TEXT("kind"), *Literal)
				&& R.ReadEnum(TEXT("cue"), Out.Cue);
		case ELongTableIntentKind::HostSubstitute:
			return R.BeginObject(MakeArrayView(IntentSeatKeys)) && R.ReadLiteral(TEXT("kind"), *Literal)
				&& R.ReadEnum(TEXT("seat"), Out.Seat);
		case ELongTableIntentKind::HostTransfer:
			return R.BeginObject(MakeArrayView(IntentParticipantKeys)) && R.ReadLiteral(TEXT("kind"), *Literal)
				&& R.ReadString(TEXT("participantId"), IdLength, false, Out.ParticipantId);
		default:
			return R.BeginObject(MakeArrayView(IntentKindOnlyKeys)) && R.ReadLiteral(TEXT("kind"), *Literal);
		}
	}

	bool DecodeLegalChoice(FReader& R, FLongTableLegalChoice& Out)
	{
		return R.BeginObject(MakeArrayView(LegalChoiceKeys))
			&& R.ReadString(TEXT("targetId"), IdLength, false, Out.TargetId)
			&& R.ReadEnum(TEXT("kind"), Out.Kind)
			&& R.ReadString(TEXT("label"), LabelLength, false, Out.Label)
			&& R.ReadObject(TEXT("intent"), [&Out](FReader& Child) { return DecodeIntentInner(Child, Out.Intent); });
	}

	bool DecodeCoreFields(FReader& R, FLongTablePublicCore& Out)
	{
		return R.ReadLiteral(TEXT("protocolVersion"), ProtocolVersion)
			&& R.ReadLiteral(TEXT("manifestId"), ManifestId)
			&& R.ReadString(TEXT("tableId"), IdLength, false, Out.TableId)
			&& R.ReadInt(TEXT("version"), 0, MaxVersion, Out.Version)
			&& R.ReadInt(TEXT("handNumber"), 1, MaxVersion, Out.HandNumber)
			&& R.ReadEnum(TEXT("phase"), Out.Phase)
			&& R.ReadEnum(TEXT("turn"), Out.Turn)
			&& R.ReadString(TEXT("turnLabel"), LabelLength, false, Out.TurnLabel)
			&& R.ReadEnum(TEXT("dealer"), Out.Dealer)
			&& R.ReadString(TEXT("dealerLabel"), LabelLength, false, Out.DealerLabel)
			&& R.ReadNullableObject(TEXT("contract"), Out.bHasContract, [&Out](FReader& Child) { return DecodeContract(Child, Out.Contract); })
			&& R.ReadArray(TEXT("auction"), 4, [&Out](FReader& Item) { return DecodeAuctionEntry(Item, Out.Auction.AddDefaulted_GetRef()); })
			&& R.ReadArray(TEXT("publicTrick"), 4, [&Out](FReader& Item) { return DecodePublicTrickCard(Item, Out.PublicTrick.AddDefaulted_GetRef()); })
			&& R.ReadArray(TEXT("completedTricks"), TricksPerHand, [&Out](FReader& Item) { return DecodeCompletedTrick(Item, Out.CompletedTricks.AddDefaulted_GetRef()); })
			&& R.ReadInt(TEXT("booksNorthSouth"), 0, TricksPerHand, Out.BooksNorthSouth)
			&& R.ReadInt(TEXT("booksEastWest"), 0, TricksPerHand, Out.BooksEastWest)
			&& R.ReadInt(TEXT("scoreNorthSouth"), -static_cast<int64>(MaxVersion), MaxVersion, Out.ScoreNorthSouth)
			&& R.ReadInt(TEXT("scoreEastWest"), -static_cast<int64>(MaxVersion), MaxVersion, Out.ScoreEastWest)
			&& R.ReadArray(TEXT("seats"), 4, [&Out](FReader& Item) { return DecodeSeatOccupancy(Item, Out.Seats.AddDefaulted_GetRef()); })
			&& R.ReadString(TEXT("statusLine"), LineLength, true, Out.StatusLine)
			&& R.ReadNullableString(TEXT("summaryLine"), LineLength, Out.bHasSummaryLine, Out.SummaryLine)
			&& R.ReadBool(TEXT("paused"), Out.bPaused)
			&& R.ReadBool(TEXT("eventEnded"), Out.bEventEnded);
	}

	bool DecodePlayerInner(FReader& R, FLongTablePlayerProjection& Out)
	{
		Out = FLongTablePlayerProjection();
		return R.BeginObject(MakeArrayView(PlayerProjectionKeys))
			&& R.ReadLiteral(TEXT("role"), TEXT("player"))
			&& DecodeCoreFields(R, Out)
			&& R.ReadEnum(TEXT("seat"), Out.Seat)
			&& R.ReadArray(TEXT("hand"), MaxHandLength, [&Out](FReader& Item) { return DecodePlayerCard(Item, Out.Hand.AddDefaulted_GetRef()); })
			&& R.ReadArray(TEXT("legalChoices"), MaxListLength, [&Out](FReader& Item) { return DecodeLegalChoice(Item, Out.LegalChoices.AddDefaulted_GetRef()); })
			&& R.ReadNullableString(TEXT("previewLabel"), LabelLength, Out.bHasPreviewLabel, Out.PreviewLabel)
			&& R.ReadInt(TEXT("discardPicked"), 0, MaxHandLength, Out.DiscardPicked)
			&& R.ReadInt(TEXT("discardTarget"), 0, MaxHandLength, Out.DiscardTarget)
			&& R.ReadInt(TEXT("uncommittedRevision"), 0, MaxVersion, Out.UncommittedRevision)
			&& R.ReadNullableEnum(TEXT("feedbackCode"), Out.bHasFeedbackCode, Out.FeedbackCode)
			&& R.ReadNullableString(TEXT("feedbackLine"), LineLength, Out.bHasFeedbackLine, Out.FeedbackLine)
			&& R.ReadArray(TEXT("disabledNotices"), 8, [&Out](FReader& Item) { return DecodeDisabledNotice(Item, Out.DisabledNotices.AddDefaulted_GetRef()); });
	}

	bool DecodeHostInner(FReader& R, FLongTableHostProjection& Out)
	{
		Out = FLongTableHostProjection();
		return R.BeginObject(MakeArrayView(HostProjectionKeys))
			&& R.ReadLiteral(TEXT("role"), TEXT("host"))
			&& DecodeCoreFields(R, Out)
			&& R.ReadBool(TEXT("betweenHands"), Out.bBetweenHands)
			&& R.ReadEnumArray(TEXT("hostControls"), 7, Out.HostControls)
			&& R.ReadNullableEnum(TEXT("lastAnnouncement"), Out.bHasLastAnnouncement, Out.LastAnnouncement);
	}

	bool DecodePublicInner(FReader& R, FLongTablePublicProjection& Out)
	{
		Out = FLongTablePublicProjection();
		return R.BeginObject(MakeArrayView(PublicProjectionKeys))
			&& R.ReadLiteral(TEXT("role"), TEXT("public"))
			&& DecodeCoreFields(R, Out);
	}

	bool DecodeDealerCueInner(FReader& R, FLongTableDealerCueFrame& Out)
	{
		Out = FLongTableDealerCueFrame();
		return R.BeginObject(MakeArrayView(DealerCueKeys))
			&& R.ReadLiteral(TEXT("protocolVersion"), ProtocolVersion)
			&& R.ReadString(TEXT("tableId"), IdLength, false, Out.TableId)
			&& R.ReadInt(TEXT("version"), 0, MaxVersion, Out.Version)
			&& R.ReadInt(TEXT("handNumber"), 1, MaxVersion, Out.HandNumber)
			&& R.ReadEnum(TEXT("phase"), Out.Phase)
			&& R.ReadEnum(TEXT("cue"), Out.Cue)
			&& R.ReadNullableEnum(TEXT("seat"), Out.bHasSeat, Out.Seat)
			&& R.ReadNullableString(TEXT("seatLabel"), LabelLength, Out.bHasSeatLabel, Out.SeatLabel)
			&& R.ReadNullableEnum(TEXT("announcement"), Out.bHasAnnouncement, Out.Announcement);
	}

	bool DecodeReceiptInner(FReader& R, FLongTableIntentReceipt& Out)
	{
		Out = FLongTableIntentReceipt();
		return R.BeginObject(MakeArrayView(ReceiptKeys))
			&& R.ReadString(TEXT("intentId"), IdLength, false, Out.IntentId)
			&& R.ReadEnum(TEXT("intentKind"), Out.IntentKind)
			&& R.ReadEnum(TEXT("outcome"), Out.Outcome)
			&& R.ReadNullableEnum(TEXT("code"), Out.bHasCode, Out.Code)
			&& R.ReadString(TEXT("message"), LineLength, true, Out.Message)
			&& R.ReadBool(TEXT("committed"), Out.bCommitted)
			&& R.ReadInt(TEXT("version"), 0, MaxVersion, Out.Version);
	}

	bool DecodeClientInner(FReader& R, FLongTableClientMessage& Out)
	{
		Out = FLongTableClientMessage();
		FString Tag;
		if (!R.ReadDiscriminant(TEXT("type"), Tag)) { return false; }
		if (!TLongTableWire<ELongTableClientMessageType>::FromWire(Tag, Out.Type)) { return R.RejectUnknownVariant(TEXT("type")); }
		switch (Out.Type)
		{
		case ELongTableClientMessageType::Hello:
			return R.BeginObject(MakeArrayView(HelloKeys))
				&& R.ReadLiteral(TEXT("type"), TEXT("hello"))
				&& R.ReadLiteral(TEXT("protocolVersion"), ProtocolVersion)
				&& R.ReadString(TEXT("token"), TokenLength, false, Out.Hello.Token)
				&& R.ReadEnum(TEXT("role"), Out.Hello.Role)
				&& R.ReadString(TEXT("tableId"), IdLength, false, Out.Hello.TableId)
				&& R.ReadString(TEXT("displayName"), DisplayNameLength, true, Out.Hello.DisplayName)
				&& R.ReadNullableInt(TEXT("lastVersion"), 0, MaxVersion, Out.Hello.bResume, Out.Hello.LastVersion);
		case ELongTableClientMessageType::Intent:
			return R.BeginObject(MakeArrayView(IntentMessageKeys))
				&& R.ReadLiteral(TEXT("type"), TEXT("intent"))
				&& R.ReadString(TEXT("tableId"), IdLength, false, Out.Intent.TableId)
				&& R.ReadString(TEXT("intentId"), IdLength, false, Out.Intent.IntentId)
				&& R.ReadInt(TEXT("expectedVersion"), 0, MaxVersion, Out.Intent.ExpectedVersion)
				&& R.ReadObject(TEXT("intent"), [&Out](FReader& Child) { return DecodeIntentInner(Child, Out.Intent.Intent); });
		case ELongTableClientMessageType::Resync:
			return R.BeginObject(MakeArrayView(ResyncKeys))
				&& R.ReadLiteral(TEXT("type"), TEXT("resync"))
				&& R.ReadString(TEXT("tableId"), IdLength, false, Out.Resync.TableId)
				&& R.ReadInt(TEXT("lastVersion"), 0, MaxVersion, Out.Resync.LastVersion);
		}
		return false;
	}

	// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-FINAL-001 | BEGIN]]
	/** The welcome role, mirroring the TypeScript role-discriminated union: an unknown member is `unknown-variant`. */
	bool ReadWelcomeRole(FReader& R, ELongTableRole& OutRole)
	{
		FString Text;
		if (!R.ReadString(TEXT("role"), IdLength, false, Text)) { return false; }
		if (!TLongTableWire<ELongTableRole>::FromWire(Text, OutRole)) { return R.Reject(TEXT("unknown-variant"), R.ChildPath(TEXT("role"))); }
		return true;
	}
	// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-FINAL-001 | END]]

	// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | BEGIN]]
	/**
	 * The welcome's `nextIntentCounter`, with the exact TypeScript rejections:
	 * an entitled (player/host) welcome accepts null or an integral number in
	 * [IntentCounterMin, IntentCounterMax] (a non-number is `type-mismatch`, an
	 * out-of-range or non-integral value is `value-out-of-range` or
	 * `type-mismatch` respectively); a public or dealer welcome accepts JSON
	 * null and nothing else (`value-out-of-range`). The counter exceeds int32,
	 * so it is read from the raw root value the closed reader already vetted
	 * with BeginObject.
	 */
	bool ReadWelcomeNextIntentCounter(FReader& R, const TSharedPtr<FJsonValue>& Root, FLongTableWelcome& Out)
	{
		if (R.Failed()) { return false; }
		const FString FieldPath = R.ChildPath(TEXT("nextIntentCounter"));
		if (!Root.IsValid() || Root->Type != EJson::Object) { return R.Reject(TEXT("not-an-object"), R.Path); }
		const TSharedPtr<FJsonValue>* Found = Root->AsObject()->Values.Find(TEXT("nextIntentCounter"));
		if (!Found || !Found->IsValid()) { return R.Reject(TEXT("missing-field"), FieldPath); }
		Out.bHasNextIntentCounter = false;
		Out.NextIntentCounter = 0;
		if ((*Found)->Type == EJson::Null) { return true; }
		const bool bEntitledRole = Out.Role == ELongTableRole::Player || Out.Role == ELongTableRole::Host;
		if (!bEntitledRole) { return R.Reject(TEXT("value-out-of-range"), FieldPath); }
		if ((*Found)->Type != EJson::Number) { return R.Reject(TEXT("type-mismatch"), FieldPath); }
		const double Number = (*Found)->AsNumber();
		if (Number != FMath::FloorToDouble(Number)) { return R.Reject(TEXT("type-mismatch"), FieldPath); }
		if (Number < static_cast<double>(IntentCounterMin) || Number > static_cast<double>(IntentCounterMax)) { return R.Reject(TEXT("value-out-of-range"), FieldPath); }
		Out.bHasNextIntentCounter = true;
		Out.NextIntentCounter = static_cast<int64>(Number);
		return true;
	}
	// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | END]]

	bool DecodeAuthorityInner(FReader& R, const TSharedPtr<FJsonValue>& Root, FLongTableAuthorityMessage& Out)
	{
		Out = FLongTableAuthorityMessage();
		FString Tag;
		if (!R.ReadDiscriminant(TEXT("type"), Tag)) { return false; }
		if (!TLongTableWire<ELongTableAuthorityMessageType>::FromWire(Tag, Out.Type)) { return R.RejectUnknownVariant(TEXT("type")); }
		switch (Out.Type)
		{
		// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-FINAL-001 | BEGIN]]
		case ELongTableAuthorityMessageType::Welcome:
		{
			// The welcome is a closed role-discriminated shape. Every
			// role/seat/projection crossover fails closed here, in schema
			// field order, with the exact TypeScript rejection code and path —
			// before any payload is retained: a player welcome requires a seat
			// and a player projection; host and public welcomes forbid a seat
			// and require their own projection; a dealer welcome forbids a
			// seat and requires a null projection.
			if (!(R.BeginObject(MakeArrayView(WelcomeKeys))
				&& R.ReadLiteral(TEXT("type"), TEXT("welcome"))
				&& R.ReadLiteral(TEXT("protocolVersion"), ProtocolVersion)
				&& R.ReadString(TEXT("sessionId"), IdLength, false, Out.Welcome.SessionId)
				&& ReadWelcomeRole(R, Out.Welcome.Role)
				&& R.ReadNullableEnum(TEXT("seat"), Out.Welcome.bHasSeat, Out.Welcome.Seat)))
			{
				return false;
			}
			if (Out.Welcome.Role == ELongTableRole::Player && !Out.Welcome.bHasSeat)
			{
				return R.Reject(TEXT("type-mismatch"), R.ChildPath(TEXT("seat")));
			}
			if (Out.Welcome.Role != ELongTableRole::Player && Out.Welcome.bHasSeat)
			{
				return R.Reject(TEXT("value-out-of-range"), R.ChildPath(TEXT("seat")));
			}
			if (!(R.ReadString(TEXT("tableId"), IdLength, false, Out.Welcome.TableId)
				&& R.ReadInt(TEXT("version"), 0, MaxVersion, Out.Welcome.Version)))
			{
				return false;
			}
			// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | BEGIN]]
			if (!ReadWelcomeNextIntentCounter(R, Root, Out.Welcome)) { return false; }
			// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | END]]
			bool bHasProjection = false;
			bool bProjectionOk = false;
			switch (Out.Welcome.Role)
			{
			case ELongTableRole::Player:
			{
				FLongTablePlayerProjection Staged;
				bProjectionOk = R.ReadNullableObject(TEXT("projection"), bHasProjection, [&Staged](FReader& Child) { return DecodePlayerInner(Child, Staged); });
				break;
			}
			case ELongTableRole::Host:
			{
				FLongTableHostProjection Staged;
				bProjectionOk = R.ReadNullableObject(TEXT("projection"), bHasProjection, [&Staged](FReader& Child) { return DecodeHostInner(Child, Staged); });
				break;
			}
			case ELongTableRole::Public:
			{
				FLongTablePublicProjection Staged;
				bProjectionOk = R.ReadNullableObject(TEXT("projection"), bHasProjection, [&Staged](FReader& Child) { return DecodePublicInner(Child, Staged); });
				break;
			}
			case ELongTableRole::Dealer:
				// The dealer projection accepts JSON null and nothing else.
				bProjectionOk = R.ReadNullableObject(TEXT("projection"), bHasProjection, [](FReader& Child) { return Child.Reject(TEXT("value-out-of-range"), Child.Path); });
				break;
			}
			if (!bProjectionOk || R.Failed()) { return false; }
			if (Out.Welcome.Role == ELongTableRole::Dealer)
			{
				Out.Welcome.bHasProjection = false;
				return true;
			}
			if (!bHasProjection)
			{
				return R.Reject(TEXT("not-an-object"), R.ChildPath(TEXT("projection")));
			}
			TSharedPtr<FJsonValue> Payload;
			if (!R.ReadProjectionPayload(TEXT("projection"), Payload)) { return false; }
			Out.Welcome.bHasProjection = true;
			FLongTableProjectionPayload& Retained = Out.Payloads.AddDefaulted_GetRef();
			Retained.EnvelopeVersion = Out.Welcome.Version;
			Retained.Json = Payload;
			return true;
		}
		// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-FINAL-001 | END]]
		case ELongTableAuthorityMessageType::Projection:
		{
			TSharedPtr<FJsonValue> Payload;
			const bool bOk = R.BeginObject(MakeArrayView(ProjectionMessageKeys))
				&& R.ReadLiteral(TEXT("type"), TEXT("projection"))
				&& R.ReadString(TEXT("tableId"), IdLength, false, Out.Projection.TableId)
				&& R.ReadInt(TEXT("version"), 0, MaxVersion, Out.Projection.Version)
				&& R.ReadProjectionPayload(TEXT("projection"), Payload);
			if (bOk)
			{
				FLongTableProjectionPayload& Retained = Out.Payloads.AddDefaulted_GetRef();
				Retained.EnvelopeVersion = Out.Projection.Version;
				Retained.Json = Payload;
			}
			return bOk;
		}
		case ELongTableAuthorityMessageType::Receipt:
			return R.BeginObject(MakeArrayView(ReceiptMessageKeys))
				&& R.ReadLiteral(TEXT("type"), TEXT("receipt"))
				&& R.ReadString(TEXT("tableId"), IdLength, false, Out.Receipt.TableId)
				&& R.ReadObject(TEXT("receipt"), [&Out](FReader& Child) { return DecodeReceiptInner(Child, Out.Receipt.Receipt); });
		case ELongTableAuthorityMessageType::Replay:
			return R.BeginObject(MakeArrayView(ReplayMessageKeys))
				&& R.ReadLiteral(TEXT("type"), TEXT("replay"))
				&& R.ReadString(TEXT("tableId"), IdLength, false, Out.Replay.TableId)
				&& R.ReadInt(TEXT("fromVersion"), 0, MaxVersion, Out.Replay.FromVersion)
				&& R.ReadInt(TEXT("toVersion"), 0, MaxVersion, Out.Replay.ToVersion)
				&& R.ReadBool(TEXT("truncated"), Out.Replay.bTruncated)
				&& R.ReadArray(TEXT("frames"), MaxReplayFrames, [&Out](FReader& Item)
				{
					int32 Version = 0;
					TSharedPtr<FJsonValue> Payload;
					const bool bFrameOk = Item.BeginObject(MakeArrayView(ReplayFrameKeys))
						&& Item.ReadInt(TEXT("version"), 0, MaxVersion, Version)
						&& Item.ReadProjectionPayload(TEXT("projection"), Payload);
					if (bFrameOk)
					{
						Out.Replay.FrameVersions.Add(Version);
						FLongTableProjectionPayload& Retained = Out.Payloads.AddDefaulted_GetRef();
						Retained.EnvelopeVersion = Version;
						Retained.Json = Payload;
					}
					return bFrameOk;
				});
		// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-FINAL-001 | BEGIN]]
		case ELongTableAuthorityMessageType::DealerCue:
		{
			// One structural cross-field invariant, mirrored from the
			// TypeScript decoder: the inner frame's tableId must equal the
			// envelope's tableId exactly, so a cue can never smuggle a frame
			// for another table inside a well-addressed envelope.
			const bool bOk = R.BeginObject(MakeArrayView(DealerCueMessageKeys))
				&& R.ReadLiteral(TEXT("type"), TEXT("dealer-cue"))
				&& R.ReadString(TEXT("tableId"), IdLength, false, Out.DealerCue.TableId)
				&& R.ReadObject(TEXT("frame"), [&Out](FReader& Child) { return DecodeDealerCueInner(Child, Out.DealerCue.Frame); });
			if (!bOk) { return false; }
			if (!Out.DealerCue.Frame.TableId.Equals(Out.DealerCue.TableId, ESearchCase::CaseSensitive))
			{
				return R.Reject(TEXT("value-out-of-range"), R.ChildPath(TEXT("frame")) + TEXT(".tableId"));
			}
			return true;
		}
		// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-FINAL-001 | END]]
		case ELongTableAuthorityMessageType::Error:
			return R.BeginObject(MakeArrayView(ErrorMessageKeys))
				&& R.ReadLiteral(TEXT("type"), TEXT("error"))
				&& R.ReadEnum(TEXT("code"), Out.Error.Code)
				&& R.ReadString(TEXT("detail"), DetailLength, true, Out.Error.Detail);
		}
		return false;
	}

	// ---- encoders -----------------------------------------------------------

	void WriteBid(FWriter& W, const FLongTableBidView& V)
	{
		W.BeginObject();
		W.Key(TEXT("level")); W.Int(V.Level);
		W.Key(TEXT("mode")); W.String(Wire(V.Mode));
		W.EndObject();
	}

	void WriteContract(FWriter& W, const FLongTableContractView& V)
	{
		W.BeginObject();
		W.Key(TEXT("level")); W.Int(V.Level);
		W.Key(TEXT("mode")); W.String(Wire(V.Mode));
		W.Key(TEXT("modeLabel")); W.String(V.ModeLabel);
		W.Key(TEXT("trump")); if (V.bHasTrump) { W.String(Wire(V.Trump)); } else { W.Null(); }
		W.Key(TEXT("trumpLabel")); W.String(V.TrumpLabel);
		W.Key(TEXT("bidder")); W.String(Wire(V.Bidder));
		W.Key(TEXT("bidderLabel")); W.String(V.BidderLabel);
		W.EndObject();
	}

	void WriteSelection(FWriter& W, const FLongTableSelection& V)
	{
		W.BeginObject();
		W.Key(TEXT("type")); W.String(Wire(V.Type));
		switch (V.Type)
		{
		case ELongTableSelectionType::Bid: W.Key(TEXT("bid")); WriteBid(W, V.Bid); break;
		case ELongTableSelectionType::Declaration: W.Key(TEXT("trump")); if (V.bNoTrump) { W.Null(); } else { W.String(Wire(V.Trump)); } break;
		case ELongTableSelectionType::Play: W.Key(TEXT("cardId")); W.String(V.CardId); break;
		default: break;
		}
		W.EndObject();
	}

	void WriteIntent(FWriter& W, const FLongTableIntent& V)
	{
		W.BeginObject();
		W.Key(TEXT("kind")); W.String(Wire(V.Kind));
		switch (V.Kind)
		{
		case ELongTableIntentKind::Preview: W.Key(TEXT("selection")); WriteSelection(W, V.Selection); break;
		case ELongTableIntentKind::ToggleDiscard: W.Key(TEXT("cardId")); W.String(V.CardId); break;
		case ELongTableIntentKind::HostAnnounce: W.Key(TEXT("cue")); W.String(Wire(V.Cue)); break;
		case ELongTableIntentKind::HostSubstitute: W.Key(TEXT("seat")); W.String(Wire(V.Seat)); break;
		case ELongTableIntentKind::HostTransfer: W.Key(TEXT("participantId")); W.String(V.ParticipantId); break;
		default: break;
		}
		W.EndObject();
	}

	void WriteCore(FWriter& W, const FLongTablePublicCore& V)
	{
		W.Key(TEXT("protocolVersion")); W.String(ProtocolVersion);
		W.Key(TEXT("manifestId")); W.String(ManifestId);
		W.Key(TEXT("tableId")); W.String(V.TableId);
		W.Key(TEXT("version")); W.Int(V.Version);
		W.Key(TEXT("handNumber")); W.Int(V.HandNumber);
		W.Key(TEXT("phase")); W.String(Wire(V.Phase));
		W.Key(TEXT("turn")); W.String(Wire(V.Turn));
		W.Key(TEXT("turnLabel")); W.String(V.TurnLabel);
		W.Key(TEXT("dealer")); W.String(Wire(V.Dealer));
		W.Key(TEXT("dealerLabel")); W.String(V.DealerLabel);
		W.Key(TEXT("contract")); if (V.bHasContract) { WriteContract(W, V.Contract); } else { W.Null(); }
		W.Key(TEXT("auction")); W.BeginArray();
		for (const FLongTableAuctionEntryView& Entry : V.Auction)
		{
			W.BeginObject();
			W.Key(TEXT("seat")); W.String(Wire(Entry.Seat));
			W.Key(TEXT("bid")); if (Entry.bHasBid) { WriteBid(W, Entry.Bid); } else { W.Null(); }
			W.EndObject();
		}
		W.EndArray();
		W.Key(TEXT("publicTrick")); W.BeginArray();
		for (const FLongTablePublicTrickCard& Card : V.PublicTrick)
		{
			W.BeginObject();
			W.Key(TEXT("seat")); W.String(Wire(Card.Seat));
			W.Key(TEXT("seatLabel")); W.String(Card.SeatLabel);
			W.Key(TEXT("cardId")); W.String(Card.CardId);
			W.Key(TEXT("label")); W.String(Card.Label);
			W.Key(TEXT("glyph")); W.String(Card.Glyph);
			W.Key(TEXT("rankText")); W.String(Card.RankText);
			W.Key(TEXT("red")); W.Bool(Card.bRed);
			W.EndObject();
		}
		W.EndArray();
		W.Key(TEXT("completedTricks")); W.BeginArray();
		for (const FLongTableCompletedTrickView& Trick : V.CompletedTricks)
		{
			W.BeginObject();
			W.Key(TEXT("number")); W.Int(Trick.Number);
			W.Key(TEXT("lead")); W.String(Wire(Trick.Lead));
			W.Key(TEXT("winner")); W.String(Wire(Trick.Winner));
			W.EndObject();
		}
		W.EndArray();
		W.Key(TEXT("booksNorthSouth")); W.Int(V.BooksNorthSouth);
		W.Key(TEXT("booksEastWest")); W.Int(V.BooksEastWest);
		W.Key(TEXT("scoreNorthSouth")); W.Int(V.ScoreNorthSouth);
		W.Key(TEXT("scoreEastWest")); W.Int(V.ScoreEastWest);
		W.Key(TEXT("seats")); W.BeginArray();
		for (const FLongTableSeatOccupancyView& Seat : V.Seats)
		{
			W.BeginObject();
			W.Key(TEXT("seat")); W.String(Wire(Seat.Seat));
			W.Key(TEXT("seatLabel")); W.String(Seat.SeatLabel);
			W.Key(TEXT("occupant")); W.String(Wire(Seat.Occupant));
			W.Key(TEXT("displayName")); W.String(Seat.DisplayName);
			W.Key(TEXT("connected")); W.Bool(Seat.bConnected);
			W.Key(TEXT("cardCount")); W.Int(Seat.CardCount);
			W.EndObject();
		}
		W.EndArray();
		W.Key(TEXT("statusLine")); W.String(V.StatusLine);
		W.Key(TEXT("summaryLine")); if (V.bHasSummaryLine) { W.String(V.SummaryLine); } else { W.Null(); }
		W.Key(TEXT("paused")); W.Bool(V.bPaused);
		W.Key(TEXT("eventEnded")); W.Bool(V.bEventEnded);
	}

	void WritePlayer(FWriter& W, const FLongTablePlayerProjection& V)
	{
		W.BeginObject();
		W.Key(TEXT("role")); W.String(TEXT("player"));
		WriteCore(W, V);
		W.Key(TEXT("seat")); W.String(Wire(V.Seat));
		W.Key(TEXT("hand")); W.BeginArray();
		for (const FLongTablePlayerCardView& Card : V.Hand)
		{
			W.BeginObject();
			W.Key(TEXT("cardId")); W.String(Card.CardId);
			W.Key(TEXT("label")); W.String(Card.Label);
			W.Key(TEXT("glyph")); W.String(Card.Glyph);
			W.Key(TEXT("rankText")); W.String(Card.RankText);
			W.Key(TEXT("red")); W.Bool(Card.bRed);
			W.Key(TEXT("legal")); W.Bool(Card.bLegal);
			W.Key(TEXT("selectedForDiscard")); W.Bool(Card.bSelectedForDiscard);
			W.Key(TEXT("previewed")); W.Bool(Card.bPreviewed);
			W.EndObject();
		}
		W.EndArray();
		W.Key(TEXT("legalChoices")); W.BeginArray();
		for (const FLongTableLegalChoice& Choice : V.LegalChoices)
		{
			W.BeginObject();
			W.Key(TEXT("targetId")); W.String(Choice.TargetId);
			W.Key(TEXT("kind")); W.String(Wire(Choice.Kind));
			W.Key(TEXT("label")); W.String(Choice.Label);
			W.Key(TEXT("intent")); WriteIntent(W, Choice.Intent);
			W.EndObject();
		}
		W.EndArray();
		W.Key(TEXT("previewLabel")); if (V.bHasPreviewLabel) { W.String(V.PreviewLabel); } else { W.Null(); }
		W.Key(TEXT("discardPicked")); W.Int(V.DiscardPicked);
		W.Key(TEXT("discardTarget")); W.Int(V.DiscardTarget);
		W.Key(TEXT("uncommittedRevision")); W.Int(V.UncommittedRevision);
		W.Key(TEXT("feedbackCode")); if (V.bHasFeedbackCode) { W.String(Wire(V.FeedbackCode)); } else { W.Null(); }
		W.Key(TEXT("feedbackLine")); if (V.bHasFeedbackLine) { W.String(V.FeedbackLine); } else { W.Null(); }
		W.Key(TEXT("disabledNotices")); W.BeginArray();
		for (const FLongTableDisabledNoticeView& Notice : V.DisabledNotices)
		{
			W.BeginObject();
			W.Key(TEXT("id")); W.String(Notice.Id);
			W.Key(TEXT("label")); W.String(Notice.Label);
			W.Key(TEXT("explanation")); W.String(Notice.Explanation);
			W.EndObject();
		}
		W.EndArray();
		W.EndObject();
	}

	void WriteHost(FWriter& W, const FLongTableHostProjection& V)
	{
		W.BeginObject();
		W.Key(TEXT("role")); W.String(TEXT("host"));
		WriteCore(W, V);
		W.Key(TEXT("betweenHands")); W.Bool(V.bBetweenHands);
		W.Key(TEXT("hostControls")); W.BeginArray();
		for (const ELongTableHostControl Control : V.HostControls) { W.String(Wire(Control)); }
		W.EndArray();
		W.Key(TEXT("lastAnnouncement")); if (V.bHasLastAnnouncement) { W.String(Wire(V.LastAnnouncement)); } else { W.Null(); }
		W.EndObject();
	}

	void WritePublic(FWriter& W, const FLongTablePublicProjection& V)
	{
		W.BeginObject();
		W.Key(TEXT("role")); W.String(TEXT("public"));
		WriteCore(W, V);
		W.EndObject();
	}

	void WriteDealerCue(FWriter& W, const FLongTableDealerCueFrame& V)
	{
		W.BeginObject();
		W.Key(TEXT("protocolVersion")); W.String(ProtocolVersion);
		W.Key(TEXT("tableId")); W.String(V.TableId);
		W.Key(TEXT("version")); W.Int(V.Version);
		W.Key(TEXT("handNumber")); W.Int(V.HandNumber);
		W.Key(TEXT("phase")); W.String(Wire(V.Phase));
		W.Key(TEXT("cue")); W.String(Wire(V.Cue));
		W.Key(TEXT("seat")); if (V.bHasSeat) { W.String(Wire(V.Seat)); } else { W.Null(); }
		W.Key(TEXT("seatLabel")); if (V.bHasSeatLabel) { W.String(V.SeatLabel); } else { W.Null(); }
		W.Key(TEXT("announcement")); if (V.bHasAnnouncement) { W.String(Wire(V.Announcement)); } else { W.Null(); }
		W.EndObject();
	}

	void WriteReceipt(FWriter& W, const FLongTableIntentReceipt& V)
	{
		W.BeginObject();
		W.Key(TEXT("intentId")); W.String(V.IntentId);
		W.Key(TEXT("intentKind")); W.String(Wire(V.IntentKind));
		W.Key(TEXT("outcome")); W.String(Wire(V.Outcome));
		W.Key(TEXT("code")); if (V.bHasCode) { W.String(Wire(V.Code)); } else { W.Null(); }
		W.Key(TEXT("message")); W.String(V.Message);
		W.Key(TEXT("committed")); W.Bool(V.bCommitted);
		W.Key(TEXT("version")); W.Int(V.Version);
		W.EndObject();
	}

	void WriteClient(FWriter& W, const FLongTableClientMessage& V)
	{
		W.BeginObject();
		W.Key(TEXT("type")); W.String(Wire(V.Type));
		switch (V.Type)
		{
		case ELongTableClientMessageType::Hello:
			W.Key(TEXT("protocolVersion")); W.String(ProtocolVersion);
			W.Key(TEXT("token")); W.String(V.Hello.Token);
			W.Key(TEXT("role")); W.String(Wire(V.Hello.Role));
			W.Key(TEXT("tableId")); W.String(V.Hello.TableId);
			W.Key(TEXT("displayName")); W.String(V.Hello.DisplayName);
			W.Key(TEXT("lastVersion")); if (V.Hello.bResume) { W.Int(V.Hello.LastVersion); } else { W.Null(); }
			break;
		case ELongTableClientMessageType::Intent:
			W.Key(TEXT("tableId")); W.String(V.Intent.TableId);
			W.Key(TEXT("intentId")); W.String(V.Intent.IntentId);
			W.Key(TEXT("expectedVersion")); W.Int(V.Intent.ExpectedVersion);
			W.Key(TEXT("intent")); WriteIntent(W, V.Intent.Intent);
			break;
		case ELongTableClientMessageType::Resync:
			W.Key(TEXT("tableId")); W.String(V.Resync.TableId);
			W.Key(TEXT("lastVersion")); W.Int(V.Resync.LastVersion);
			break;
		}
		W.EndObject();
	}

	void WriteProjectionSlot(FWriter& W, const TArray<FString>& Texts, int32& Cursor)
	{
		if (Texts.IsValidIndex(Cursor)) { W.Raw(Texts[Cursor]); }
		else { W.Null(); }
		++Cursor;
	}

	void WriteAuthority(FWriter& W, const FLongTableAuthorityMessage& V, const TArray<FString>& Texts)
	{
		int32 Cursor = 0;
		W.BeginObject();
		W.Key(TEXT("type")); W.String(Wire(V.Type));
		switch (V.Type)
		{
		case ELongTableAuthorityMessageType::Welcome:
			W.Key(TEXT("protocolVersion")); W.String(ProtocolVersion);
			W.Key(TEXT("sessionId")); W.String(V.Welcome.SessionId);
			W.Key(TEXT("role")); W.String(Wire(V.Welcome.Role));
			W.Key(TEXT("seat")); if (V.Welcome.bHasSeat) { W.String(Wire(V.Welcome.Seat)); } else { W.Null(); }
			W.Key(TEXT("tableId")); W.String(V.Welcome.TableId);
			W.Key(TEXT("version")); W.Int(V.Welcome.Version);
			// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | BEGIN]]
			W.Key(TEXT("nextIntentCounter")); if (V.Welcome.bHasNextIntentCounter) { W.Int(V.Welcome.NextIntentCounter); } else { W.Null(); }
			// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | END]]
			W.Key(TEXT("projection")); if (V.Welcome.bHasProjection) { WriteProjectionSlot(W, Texts, Cursor); } else { W.Null(); }
			break;
		case ELongTableAuthorityMessageType::Projection:
			W.Key(TEXT("tableId")); W.String(V.Projection.TableId);
			W.Key(TEXT("version")); W.Int(V.Projection.Version);
			W.Key(TEXT("projection")); WriteProjectionSlot(W, Texts, Cursor);
			break;
		case ELongTableAuthorityMessageType::Receipt:
			W.Key(TEXT("tableId")); W.String(V.Receipt.TableId);
			W.Key(TEXT("receipt")); WriteReceipt(W, V.Receipt.Receipt);
			break;
		case ELongTableAuthorityMessageType::Replay:
			W.Key(TEXT("tableId")); W.String(V.Replay.TableId);
			W.Key(TEXT("fromVersion")); W.Int(V.Replay.FromVersion);
			W.Key(TEXT("toVersion")); W.Int(V.Replay.ToVersion);
			W.Key(TEXT("truncated")); W.Bool(V.Replay.bTruncated);
			W.Key(TEXT("frames")); W.BeginArray();
			for (const int32 FrameVersion : V.Replay.FrameVersions)
			{
				W.BeginObject();
				W.Key(TEXT("version")); W.Int(FrameVersion);
				W.Key(TEXT("projection")); WriteProjectionSlot(W, Texts, Cursor);
				W.EndObject();
			}
			W.EndArray();
			break;
		case ELongTableAuthorityMessageType::DealerCue:
			W.Key(TEXT("tableId")); W.String(V.DealerCue.TableId);
			W.Key(TEXT("frame")); WriteDealerCue(W, V.DealerCue.Frame);
			break;
		case ELongTableAuthorityMessageType::Error:
			W.Key(TEXT("code")); W.String(Wire(V.Error.Code));
			W.Key(TEXT("detail")); W.String(V.Error.Detail);
			break;
		}
		W.EndObject();
	}
}

// ---------------------------------------------------------------------------
// Codec entry points
// ---------------------------------------------------------------------------

TSharedPtr<FJsonValue> FLongTableProtocolCodec::ParseText(const FString& Text)
{
	TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(Text);
	TSharedPtr<FJsonValue> Value;
	if (!FJsonSerializer::Deserialize(Reader, Value) || !Value.IsValid())
	{
		return nullptr;
	}
	return Value;
}

#define LONGTABLE_DECODE_ENTRY(FunctionName, StructType, InnerFunction) \
	bool FLongTableProtocolCodec::FunctionName(const TSharedPtr<FJsonValue>& Value, const FString& Label, StructType& Out, FLongTableSchemaRejection& Rejection) \
	{ \
		Rejection = FLongTableSchemaRejection(); \
		FLongTableClosedReader Reader(Value, Label, Rejection); \
		const bool bOk = InnerFunction(Reader, Out); \
		return bOk && !Rejection.IsSet(); \
	}

LONGTABLE_DECODE_ENTRY(DecodePlayerProjection, FLongTablePlayerProjection, DecodePlayerInner)
LONGTABLE_DECODE_ENTRY(DecodeHostProjection, FLongTableHostProjection, DecodeHostInner)
LONGTABLE_DECODE_ENTRY(DecodePublicProjection, FLongTablePublicProjection, DecodePublicInner)
LONGTABLE_DECODE_ENTRY(DecodeDealerCueFrame, FLongTableDealerCueFrame, DecodeDealerCueInner)
LONGTABLE_DECODE_ENTRY(DecodeIntentReceipt, FLongTableIntentReceipt, DecodeReceiptInner)
LONGTABLE_DECODE_ENTRY(DecodeIntent, FLongTableIntent, DecodeIntentInner)
LONGTABLE_DECODE_ENTRY(DecodeClientMessage, FLongTableClientMessage, DecodeClientInner)

#undef LONGTABLE_DECODE_ENTRY

// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | BEGIN]]
// Hand-written (not the macro): the welcome's nextIntentCounter exceeds int32,
// so the inner decoder also receives the raw root value the reader wraps.
bool FLongTableProtocolCodec::DecodeAuthorityMessage(const TSharedPtr<FJsonValue>& Value, const FString& Label, FLongTableAuthorityMessage& Out, FLongTableSchemaRejection& Rejection)
{
	Rejection = FLongTableSchemaRejection();
	FLongTableClosedReader Reader(Value, Label, Rejection);
	const bool bOk = DecodeAuthorityInner(Reader, Value, Out);
	return bOk && !Rejection.IsSet();
}
// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | END]]

bool FLongTableProtocolCodec::DecodeAuthorityMessageText(const FString& Text, FLongTableAuthorityMessage& Out, FLongTableSchemaRejection& Rejection)
{
	const TSharedPtr<FJsonValue> Value = ParseText(Text);
	if (!Value.IsValid())
	{
		Rejection.Code = TEXT("type-mismatch");
		Rejection.Path = TEXT("authority");
		return false;
	}
	return DecodeAuthorityMessage(Value, TEXT("authority"), Out, Rejection);
}

bool FLongTableProtocolCodec::DecodeClientMessageText(const FString& Text, FLongTableClientMessage& Out, FLongTableSchemaRejection& Rejection)
{
	const TSharedPtr<FJsonValue> Value = ParseText(Text);
	if (!Value.IsValid())
	{
		Rejection.Code = TEXT("type-mismatch");
		Rejection.Path = TEXT("client");
		return false;
	}
	return DecodeClientMessage(Value, TEXT("client"), Out, Rejection);
}

bool FLongTableProtocolCodec::PayloadRole(const FLongTableProjectionPayload& Payload, ELongTableRole& OutRole)
{
	if (!Payload.Json.IsValid() || Payload.Json->Type != EJson::Object) { return false; }
	const TSharedPtr<FJsonValue>* RoleField = Payload.Json->AsObject()->Values.Find(TEXT("role"));
	if (!RoleField || !RoleField->IsValid() || (*RoleField)->Type != EJson::String) { return false; }
	return TLongTableWire<ELongTableRole>::FromWire((*RoleField)->AsString(), OutRole);
}

bool FLongTableProtocolCodec::ExtractPlayerProjection(const FLongTableProjectionPayload& Payload, const FString& Label, FLongTablePlayerProjection& Out, FLongTableSchemaRejection& Rejection)
{
	FLongTablePlayerProjection Candidate;
	if (!DecodePlayerProjection(Payload.Json, Label, Candidate, Rejection)) { return false; }
	Out = MoveTemp(Candidate);
	return true;
}

bool FLongTableProtocolCodec::ExtractHostProjection(const FLongTableProjectionPayload& Payload, const FString& Label, FLongTableHostProjection& Out, FLongTableSchemaRejection& Rejection)
{
	FLongTableHostProjection Candidate;
	if (!DecodeHostProjection(Payload.Json, Label, Candidate, Rejection)) { return false; }
	Out = MoveTemp(Candidate);
	return true;
}

bool FLongTableProtocolCodec::ExtractPublicProjection(const FLongTableProjectionPayload& Payload, const FString& Label, FLongTablePublicProjection& Out, FLongTableSchemaRejection& Rejection)
{
	FLongTablePublicProjection Candidate;
	if (!DecodePublicProjection(Payload.Json, Label, Candidate, Rejection)) { return false; }
	Out = MoveTemp(Candidate);
	return true;
}

#define LONGTABLE_ENCODE_ENTRY(FunctionName, StructType, WriteFunction) \
	FString FLongTableProtocolCodec::FunctionName(const StructType& Value) \
	{ \
		FLongTableCanonicalWriter Writer; \
		WriteFunction(Writer, Value); \
		return Writer.Text(); \
	}

LONGTABLE_ENCODE_ENTRY(EncodePlayerProjection, FLongTablePlayerProjection, WritePlayer)
LONGTABLE_ENCODE_ENTRY(EncodeHostProjection, FLongTableHostProjection, WriteHost)
LONGTABLE_ENCODE_ENTRY(EncodePublicProjection, FLongTablePublicProjection, WritePublic)
LONGTABLE_ENCODE_ENTRY(EncodeDealerCueFrame, FLongTableDealerCueFrame, WriteDealerCue)
LONGTABLE_ENCODE_ENTRY(EncodeIntentReceipt, FLongTableIntentReceipt, WriteReceipt)
LONGTABLE_ENCODE_ENTRY(EncodeIntent, FLongTableIntent, WriteIntent)
LONGTABLE_ENCODE_ENTRY(EncodeClientMessage, FLongTableClientMessage, WriteClient)

#undef LONGTABLE_ENCODE_ENTRY

FString FLongTableProtocolCodec::EncodeAuthorityMessage(const FLongTableAuthorityMessage& Value, const TArray<FString>& ProjectionTexts)
{
	FLongTableCanonicalWriter Writer;
	WriteAuthority(Writer, Value, ProjectionTexts);
	return Writer.Text();
}

TArray<FString> FLongTableProtocolCodec::WireKeys(const FString& InventoryName)
{
	TArrayView<const TCHAR* const> Keys;
	if (InventoryName == TEXT("PublicCore")) { Keys = MakeArrayView(CoreKeys); }
	else if (InventoryName == TEXT("PlayerProjection")) { Keys = MakeArrayView(PlayerProjectionKeys); }
	else if (InventoryName == TEXT("HostProjection")) { Keys = MakeArrayView(HostProjectionKeys); }
	else if (InventoryName == TEXT("PublicProjection")) { Keys = MakeArrayView(PublicProjectionKeys); }
	else if (InventoryName == TEXT("DealerCueFrame")) { Keys = MakeArrayView(DealerCueKeys); }
	else if (InventoryName == TEXT("IntentReceipt")) { Keys = MakeArrayView(ReceiptKeys); }
	else if (InventoryName == TEXT("WelcomeMessage")) { Keys = MakeArrayView(WelcomeKeys); }
	else if (InventoryName == TEXT("ErrorMessage")) { Keys = MakeArrayView(ErrorMessageKeys); }
	else if (InventoryName == TEXT("ReplayFrame")) { Keys = MakeArrayView(ReplayFrameKeys); }
	TArray<FString> Out;
	for (const TCHAR* Key : Keys) { Out.Add(FString(Key)); }
	return Out;
}

bool FLongTableProtocolCodec::Utf8BytesEqual(const FString& A, const FString& B)
{
	const FTCHARToUTF8 BytesA(*A);
	const FTCHARToUTF8 BytesB(*B);
	return BytesA.Length() == BytesB.Length() && FMemory::Memcmp(BytesA.Get(), BytesB.Get(), BytesA.Length()) == 0;
}
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
