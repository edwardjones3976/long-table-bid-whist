// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001-R1 | BEGIN]]
/**
 * Wire envelopes mirroring packages/protocol/src/wire.ts.
 *
 * Authority envelopes carry metadata only. A projection payload is retained
 * undecoded and is turned into a typed projection solely through the
 * role-specific extractors in FLongTableProtocolCodec, so no envelope, host
 * or public type ever embeds a player projection.
 */
#pragma once

#include "CoreMinimal.h"
#include "Dom/JsonValue.h"
#include "LongTableProjections.h"
#include "LongTableWire.generated.h"

USTRUCT(BlueprintType)
struct LONGTABLEPROTOCOL_API FLongTableHello
{
	GENERATED_BODY()

	/** Opaque bearer credential matched exactly by the authority directory. */
	UPROPERTY(BlueprintReadWrite, Category = "Long Table") FString Token;
	UPROPERTY(BlueprintReadWrite, Category = "Long Table") ELongTableRole Role = ELongTableRole::Player;
	UPROPERTY(BlueprintReadWrite, Category = "Long Table") FString TableId;
	UPROPERTY(BlueprintReadWrite, Category = "Long Table") FString DisplayName;
	/** False on a fresh join; true when reconnecting with LastVersion. */
	UPROPERTY(BlueprintReadWrite, Category = "Long Table") bool bResume = false;
	UPROPERTY(BlueprintReadWrite, Category = "Long Table") int32 LastVersion = 0;
};

USTRUCT(BlueprintType)
struct LONGTABLEPROTOCOL_API FLongTableIntentMessage
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadWrite, Category = "Long Table") FString TableId;
	UPROPERTY(BlueprintReadWrite, Category = "Long Table") FString IntentId;
	UPROPERTY(BlueprintReadWrite, Category = "Long Table") int32 ExpectedVersion = 0;
	UPROPERTY(BlueprintReadWrite, Category = "Long Table") FLongTableIntent Intent;
};

USTRUCT(BlueprintType)
struct LONGTABLEPROTOCOL_API FLongTableResync
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadWrite, Category = "Long Table") FString TableId;
	UPROPERTY(BlueprintReadWrite, Category = "Long Table") int32 LastVersion = 0;
};

USTRUCT(BlueprintType)
struct LONGTABLEPROTOCOL_API FLongTableClientMessage
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadWrite, Category = "Long Table") ELongTableClientMessageType Type = ELongTableClientMessageType::Hello;
	UPROPERTY(BlueprintReadWrite, Category = "Long Table") FLongTableHello Hello;
	UPROPERTY(BlueprintReadWrite, Category = "Long Table") FLongTableIntentMessage Intent;
	UPROPERTY(BlueprintReadWrite, Category = "Long Table") FLongTableResync Resync;
};

USTRUCT(BlueprintType)
struct LONGTABLEPROTOCOL_API FLongTableWelcome
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FString SessionId;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") ELongTableRole Role = ELongTableRole::Public;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") bool bHasSeat = false;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") ELongTableSeat Seat = ELongTableSeat::South;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FString TableId;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") int32 Version = 0;
	// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | BEGIN]]
	/**
	 * long-table-intent-idempotency/v2: an entitled (player or host) welcome's
	 * SessionId is that lane's current server-issued grant and this is its
	 * exact next counter — absent once the table incarnation is exhausted. A
	 * public or dealer welcome never carries a counter.
	 */
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") bool bHasNextIntentCounter = false;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") int64 NextIntentCounter = 0;
	// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | END]]
	/** False only for the dealer role, which receives cues alone. The payload itself is retained on the envelope. */
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") bool bHasProjection = false;
};

USTRUCT(BlueprintType)
struct LONGTABLEPROTOCOL_API FLongTableProjectionMessage
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FString TableId;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") int32 Version = 0;
};

USTRUCT(BlueprintType)
struct LONGTABLEPROTOCOL_API FLongTableReceiptMessage
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FString TableId;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FLongTableIntentReceipt Receipt;
};

USTRUCT(BlueprintType)
struct LONGTABLEPROTOCOL_API FLongTableReplayMessage
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FString TableId;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") int32 FromVersion = 0;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") int32 ToVersion = 0;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") bool bTruncated = false;
	/** Envelope version of each frame, in order; payloads are retained on the envelope. */
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") TArray<int32> FrameVersions;
};

USTRUCT(BlueprintType)
struct LONGTABLEPROTOCOL_API FLongTableDealerCueMessage
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FString TableId;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FLongTableDealerCueFrame Frame;
};

USTRUCT(BlueprintType)
struct LONGTABLEPROTOCOL_API FLongTableErrorMessage
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Long Table") ELongTableWireError Code = ELongTableWireError::SchemaRejected;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FString Detail;
};

/** An undecoded projection payload with the envelope version it arrived under. */
struct FLongTableProjectionPayload
{
	int32 EnvelopeVersion = 0;
	TSharedPtr<FJsonValue> Json;
};

USTRUCT(BlueprintType)
struct LONGTABLEPROTOCOL_API FLongTableAuthorityMessage
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Long Table") ELongTableAuthorityMessageType Type = ELongTableAuthorityMessageType::Error;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FLongTableWelcome Welcome;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FLongTableProjectionMessage Projection;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FLongTableReceiptMessage Receipt;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FLongTableReplayMessage Replay;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FLongTableDealerCueMessage DealerCue;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FLongTableErrorMessage Error;

	/**
	 * Not reflected. Projection payloads in arrival order: at most one for a
	 * welcome or projection envelope, one per frame for a replay. Decoded only
	 * through FLongTableProtocolCodec::Extract*Projection for the client's role.
	 */
	TArray<FLongTableProjectionPayload> Payloads;
};
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001-R1 | END]]
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
