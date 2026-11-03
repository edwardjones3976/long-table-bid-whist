// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
/**
 * Fail-closed JSON codec for the closed protocol schemas.
 *
 * Decoding constructs a new struct field by field from an explicit allowlist.
 * An unknown key, a missing key, a wrong type or an out-of-range value rejects
 * the whole payload with the same code and dotted path the TypeScript kit
 * reports (packages/protocol/src/schema.ts). Encoding writes keys in declared
 * schema order with no whitespace, byte-identical to the TypeScript canonical
 * encoder for the same value.
 *
 * Authority envelopes retain projection payloads undecoded; a payload becomes
 * a typed projection only through the role-specific extractors below.
 */
#pragma once

#include "CoreMinimal.h"
#include "Dom/JsonObject.h"
#include "Dom/JsonValue.h"
#include "LongTableProjections.h"
#include "LongTableWire.h"

struct LONGTABLEPROTOCOL_API FLongTableSchemaRejection
{
	/** not-an-object | unknown-field | missing-field | type-mismatch | value-out-of-range | unknown-variant */
	FString Code;
	/** Dotted path of the offending member, e.g. `player.hand[3].cardId`. */
	FString Path;

	bool IsSet() const { return !Code.IsEmpty(); }
	FString ToString() const { return FString::Printf(TEXT("%s at %s"), *Code, *Path); }
};

/**
 * Closed reader over one JSON value. The first failure is recorded and every
 * later call short-circuits, so a decoder is a straight sequence of reads.
 */
class LONGTABLEPROTOCOL_API FLongTableClosedReader
{
public:
	FLongTableClosedReader(const TSharedPtr<FJsonValue>& InValue, const FString& InPath, FLongTableSchemaRejection& InRejection);

	/** Must be called first: rejects a non-object and any key outside `AllowedKeys` (in input order). */
	bool BeginObject(TArrayView<const TCHAR* const> AllowedKeys);

	bool ReadString(const TCHAR* Key, int32 MaxLength, bool bAllowEmpty, FString& OutValue);
	bool ReadNullableString(const TCHAR* Key, int32 MaxLength, bool& bOutHas, FString& OutValue);
	bool ReadInt(const TCHAR* Key, int64 Min, int64 Max, int32& OutValue);
	bool ReadNullableInt(const TCHAR* Key, int64 Min, int64 Max, bool& bOutHas, int32& OutValue);
	bool ReadBool(const TCHAR* Key, bool& OutValue);
	bool ReadLiteral(const TCHAR* Key, const TCHAR* Expected);

	template <typename EnumType>
	bool ReadEnum(const TCHAR* Key, EnumType& OutValue)
	{
		FString Text;
		if (!ReadEnumText(Key, Text)) { return false; }
		if (!TLongTableWire<EnumType>::FromWire(Text, OutValue)) { return Reject(TEXT("value-out-of-range"), ChildPath(Key)); }
		return true;
	}

	template <typename EnumType>
	bool ReadNullableEnum(const TCHAR* Key, bool& bOutHas, EnumType& OutValue)
	{
		bOutHas = false;
		if (Failed()) { return false; }
		if (IsNullField(Key)) { return true; }
		bOutHas = true;
		return ReadEnum(Key, OutValue);
	}

	template <typename EnumType>
	bool ReadEnumArray(const TCHAR* Key, int32 MaxLength, TArray<EnumType>& OutValues)
	{
		OutValues.Reset();
		return ReadArray(Key, MaxLength, [&OutValues](FLongTableClosedReader& Item)
		{
			FString Text;
			if (!Item.ReadEnumTextSelf(Text)) { return false; }
			EnumType Value;
			if (!TLongTableWire<EnumType>::FromWire(Text, Value)) { return Item.Reject(TEXT("value-out-of-range"), Item.Path); }
			OutValues.Add(Value);
			return true;
		});
	}

	/** Reads a nested object through `Decode`, which must call BeginObject. */
	bool ReadObject(const TCHAR* Key, TFunctionRef<bool(FLongTableClosedReader&)> Decode);
	bool ReadNullableObject(const TCHAR* Key, bool& bOutHas, TFunctionRef<bool(FLongTableClosedReader&)> Decode);
	/** Reads an array; `DecodeItem` receives a reader positioned on each element. */
	bool ReadArray(const TCHAR* Key, int32 MaxLength, TFunctionRef<bool(FLongTableClosedReader&)> DecodeItem);

	/** Retains a projection payload: it must be an object whose `role` is a projection role. Full decoding happens at extraction. */
	bool ReadProjectionPayload(const TCHAR* Key, TSharedPtr<FJsonValue>& OutJson);
	bool ReadNullableProjectionPayload(const TCHAR* Key, bool& bOutHas, TSharedPtr<FJsonValue>& OutJson);

	/** Union support: reads the discriminant as a string (type-mismatch when absent or not a string). */
	bool ReadDiscriminant(const TCHAR* Key, FString& OutTag);
	bool RejectUnknownVariant(const TCHAR* Key);

	bool Reject(const TCHAR* Code, const FString& AtPath);
	bool Failed() const { return Rejection.IsSet(); }
	FString ChildPath(const TCHAR* Key) const { return Path + TEXT(".") + Key; }

	const FString Path;

private:
	bool IsNullField(const TCHAR* Key) const;
	bool ReadEnumText(const TCHAR* Key, FString& OutText);
	bool ReadEnumTextSelf(FString& OutText);
	const TSharedPtr<FJsonValue>* Field(const TCHAR* Key) const;

	TSharedPtr<FJsonValue> Value;
	TSharedPtr<FJsonObject> Object;
	FLongTableSchemaRejection& Rejection;
};

/** Compact writer producing JSON.stringify-identical text for the values the codec emits. */
class LONGTABLEPROTOCOL_API FLongTableCanonicalWriter
{
public:
	void BeginObject();
	void EndObject();
	void BeginArray();
	void EndArray();
	void Key(const TCHAR* Name);
	void String(const FString& Text);
	void Int(int64 Number);
	void Bool(bool bValue);
	void Null();
	/** Inserts already-canonical JSON text as a value. */
	void Raw(const FString& CanonicalText);

	const FString& Text() const { return Out; }

private:
	void Prefix();
	void Escape(const FString& Text);

	FString Out;
	TArray<bool> NeedComma;
	bool bAfterKey = false;
};

/** Decoders and canonical encoders for every wire type. */
struct LONGTABLEPROTOCOL_API FLongTableProtocolCodec
{
	static TSharedPtr<FJsonValue> ParseText(const FString& Text);

	static bool DecodePlayerProjection(const TSharedPtr<FJsonValue>& Value, const FString& Label, FLongTablePlayerProjection& Out, FLongTableSchemaRejection& Rejection);
	static bool DecodeHostProjection(const TSharedPtr<FJsonValue>& Value, const FString& Label, FLongTableHostProjection& Out, FLongTableSchemaRejection& Rejection);
	static bool DecodePublicProjection(const TSharedPtr<FJsonValue>& Value, const FString& Label, FLongTablePublicProjection& Out, FLongTableSchemaRejection& Rejection);
	static bool DecodeDealerCueFrame(const TSharedPtr<FJsonValue>& Value, const FString& Label, FLongTableDealerCueFrame& Out, FLongTableSchemaRejection& Rejection);
	static bool DecodeIntentReceipt(const TSharedPtr<FJsonValue>& Value, const FString& Label, FLongTableIntentReceipt& Out, FLongTableSchemaRejection& Rejection);
	static bool DecodeIntent(const TSharedPtr<FJsonValue>& Value, const FString& Label, FLongTableIntent& Out, FLongTableSchemaRejection& Rejection);
	static bool DecodeClientMessage(const TSharedPtr<FJsonValue>& Value, const FString& Label, FLongTableClientMessage& Out, FLongTableSchemaRejection& Rejection);
	/** Decodes the envelope and retains projection payloads undecoded. */
	static bool DecodeAuthorityMessage(const TSharedPtr<FJsonValue>& Value, const FString& Label, FLongTableAuthorityMessage& Out, FLongTableSchemaRejection& Rejection);

	/** Text entry points used by the runtime. Malformed text fails closed as type-mismatch at the label. */
	static bool DecodeAuthorityMessageText(const FString& Text, FLongTableAuthorityMessage& Out, FLongTableSchemaRejection& Rejection);
	static bool DecodeClientMessageText(const FString& Text, FLongTableClientMessage& Out, FLongTableSchemaRejection& Rejection);

	/** The projection role a retained payload declares, without decoding its body. */
	static bool PayloadRole(const FLongTableProjectionPayload& Payload, ELongTableRole& OutRole);
	/** Role-specific extraction. A payload of another role is rejected; nothing is written to Out. */
	static bool ExtractPlayerProjection(const FLongTableProjectionPayload& Payload, const FString& Label, FLongTablePlayerProjection& Out, FLongTableSchemaRejection& Rejection);
	static bool ExtractHostProjection(const FLongTableProjectionPayload& Payload, const FString& Label, FLongTableHostProjection& Out, FLongTableSchemaRejection& Rejection);
	static bool ExtractPublicProjection(const FLongTableProjectionPayload& Payload, const FString& Label, FLongTablePublicProjection& Out, FLongTableSchemaRejection& Rejection);

	static FString EncodePlayerProjection(const FLongTablePlayerProjection& Value);
	static FString EncodeHostProjection(const FLongTableHostProjection& Value);
	static FString EncodePublicProjection(const FLongTablePublicProjection& Value);
	static FString EncodeDealerCueFrame(const FLongTableDealerCueFrame& Value);
	static FString EncodeIntentReceipt(const FLongTableIntentReceipt& Value);
	static FString EncodeIntent(const FLongTableIntent& Value);
	static FString EncodeClientMessage(const FLongTableClientMessage& Value);
	/** Encodes an envelope; `ProjectionTexts` supplies the canonical text of each payload slot in order. */
	static FString EncodeAuthorityMessage(const FLongTableAuthorityMessage& Value, const TArray<FString>& ProjectionTexts);

	/** Exact, ordered wire key inventory of a schema by its manifest inventory name (empty when unknown). */
	static TArray<FString> WireKeys(const FString& InventoryName);

	/** Byte comparison of the UTF-8 encodings of two strings. */
	static bool Utf8BytesEqual(const FString& A, const FString& B);
};
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
