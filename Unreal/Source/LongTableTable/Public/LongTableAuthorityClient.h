// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001-R1 | BEGIN]]
/**
 * Authority connection.
 *
 * Owns the transport, the hello/welcome handshake, the last applied version,
 * the intent identity, the commit state machine and the one projection cache
 * for the configured role. It never adjudicates a rule: a projection is
 * applied as received, a receipt is applied as received, and a frame that does
 * not decode through the closed schema — or that is incoherent with the
 * configured role, table or its own envelope — is dropped in full before any
 * client-visible state changes.
 *
 * An authority context is (url, token, role, table). Reconfiguring to a
 * different context resets every cached projection, the session, the seat,
 * the version, the resume marker and the in-flight intent, so nothing from
 * one context can be resumed or replayed into another. A retry after a
 * reconnect within the same context carries the intent's original expected
 * version.
 */
#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "LongTableCommitMachine.h"
#include "LongTableProjections.h"
#include "LongTableTransport.h"
#include "LongTableWire.h"
#include "LongTableAuthorityClient.generated.h"

UENUM(BlueprintType)
enum class ELongTableConnectionState : uint8
{
	Disconnected,
	Connecting,
	AwaitingWelcome,
	Ready,
	Resyncing
};

/** Why an authority frame was dropped before any state changed. */
UENUM(BlueprintType)
enum class ELongTableFrameFault : uint8
{
	SchemaRejected,
	RoleMismatch,
	TableMismatch,
	VersionMismatch,
	SeatMismatch,
	ProjectionMissing
};

USTRUCT(BlueprintType)
struct LONGTABLETABLE_API FLongTableClientConfig
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadWrite, Category = "Long Table") FString AuthorityUrl;
	/** Opaque bearer credential. Held here only; never logged or projected. */
	UPROPERTY(BlueprintReadWrite, Category = "Long Table") FString Token;
	UPROPERTY(BlueprintReadWrite, Category = "Long Table") ELongTableRole Role = ELongTableRole::Player;
	UPROPERTY(BlueprintReadWrite, Category = "Long Table") FString TableId;
	UPROPERTY(BlueprintReadWrite, Category = "Long Table") FString DisplayName;
};

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FLongTablePlayerProjectionEvent, const FLongTablePlayerProjection&, Projection);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FLongTableHostProjectionEvent, const FLongTableHostProjection&, Projection);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FLongTablePublicProjectionEvent, const FLongTablePublicProjection&, Projection);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FLongTableReceiptEvent, const FLongTableIntentReceipt&, Receipt);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FLongTableDealerCueEvent, const FLongTableDealerCueFrame&, Frame);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FLongTableConnectionStateEvent, ELongTableConnectionState, State);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FLongTableWireErrorEvent, ELongTableWireError, Code, const FString&, Detail);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FLongTableFrameRejectedEvent, ELongTableFrameFault, Fault, const FString&, Detail);

UCLASS(BlueprintType)
class LONGTABLETABLE_API ULongTableAuthorityClient : public UObject
{
	GENERATED_BODY()

public:
	/** Binds a transport and an authority context. A different context resets all cached state. */
	void Configure(const FLongTableClientConfig& InConfig, TSharedPtr<ILongTableTransport> InTransport);

	/** Opens the transport and sends hello (resuming from the last applied version after a reconnect in the same context). */
	UFUNCTION(BlueprintCallable, Category = "Long Table")
	void Connect();

	UFUNCTION(BlueprintCallable, Category = "Long Table")
	void Disconnect();

	/** Returns the intent id, or an empty string when not ready or when an intent is already in flight. */
	UFUNCTION(BlueprintCallable, Category = "Long Table")
	FString SubmitIntent(const FLongTableIntent& Intent);

	UFUNCTION(BlueprintCallable, Category = "Long Table")
	void RequestResync();

	UFUNCTION(BlueprintPure, Category = "Long Table") ELongTableConnectionState GetState() const { return State; }
	UFUNCTION(BlueprintPure, Category = "Long Table") int32 GetLastAppliedVersion() const { return LastAppliedVersion; }
	UFUNCTION(BlueprintPure, Category = "Long Table") int32 GetLastUncommittedRevision() const { return LastUncommittedRevision; }
	UFUNCTION(BlueprintPure, Category = "Long Table") bool HasIntentInFlight() const { return Commit.HasInFlight(); }
	UFUNCTION(BlueprintPure, Category = "Long Table") bool HasLocalPreview() const { return Commit.HasLocalPreview(); }
	UFUNCTION(BlueprintPure, Category = "Long Table") ELongTableRole GetRole() const { return Config.Role; }
	UFUNCTION(BlueprintPure, Category = "Long Table") FString GetTableId() const { return Config.TableId; }
	UFUNCTION(BlueprintPure, Category = "Long Table") bool HasSeat() const { return bHasSeat; }
	UFUNCTION(BlueprintPure, Category = "Long Table") ELongTableSeat GetSeat() const { return Seat; }
	UFUNCTION(BlueprintPure, Category = "Long Table") FString GetSessionId() const { return SessionId; }
	UFUNCTION(BlueprintPure, Category = "Long Table") bool IsWelcomed() const { return bEverWelcomed; }

	/** The player projection; empty unless this client's role is Player. */
	UFUNCTION(BlueprintPure, Category = "Long Table") FLongTablePlayerProjection GetPlayerProjection() const { return PlayerProjection(); }
	/** The host projection; empty unless this client's role is Host. */
	UFUNCTION(BlueprintPure, Category = "Long Table") FLongTableHostProjection GetHostProjection() const { return HostProjection(); }
	/** The public projection; empty unless this client's role is Public. */
	UFUNCTION(BlueprintPure, Category = "Long Table") FLongTablePublicProjection GetPublicProjection() const { return PublicProjection(); }
	UFUNCTION(BlueprintPure, Category = "Long Table") FLongTableIntentReceipt GetLastReceipt() const { return LastReceipt; }

	const FLongTablePlayerProjection& PlayerProjection() const;
	const FLongTableHostProjection& HostProjection() const;
	const FLongTablePublicProjection& PublicProjection() const;
	int32 AppliedFrameCount() const { return AppliedFrames; }
	const FString& InFlightIntentId() const { return Commit.InFlightId(); }
	int32 InFlightExpectedVersion() const { return Commit.InFlightVersion(); }
	void SetIdentityNonceForTests(const FString& Nonce) { Identity = FLongTableIntentIdentity(Nonce); }
	const FString& IdentityNonce() const { return Identity.GetNonce(); }

	UPROPERTY(BlueprintAssignable, Category = "Long Table") FLongTablePlayerProjectionEvent OnPlayerProjection;
	UPROPERTY(BlueprintAssignable, Category = "Long Table") FLongTableHostProjectionEvent OnHostProjection;
	UPROPERTY(BlueprintAssignable, Category = "Long Table") FLongTablePublicProjectionEvent OnPublicProjection;
	UPROPERTY(BlueprintAssignable, Category = "Long Table") FLongTableReceiptEvent OnReceipt;
	UPROPERTY(BlueprintAssignable, Category = "Long Table") FLongTableDealerCueEvent OnDealerCue;
	UPROPERTY(BlueprintAssignable, Category = "Long Table") FLongTableConnectionStateEvent OnConnectionState;
	UPROPERTY(BlueprintAssignable, Category = "Long Table") FLongTableWireErrorEvent OnWireError;
	UPROPERTY(BlueprintAssignable, Category = "Long Table") FLongTableFrameRejectedEvent OnFrameRejected;

private:
	static FString ContextKeyFor(const FLongTableClientConfig& InConfig);
	void ResetContext();
	void SetState(ELongTableConnectionState NewState);
	void SendHello();
	void SendClientMessage(const FLongTableClientMessage& Message);
	void ResendInFlight();
	bool Fault(ELongTableFrameFault Fault, const FString& Detail);

	/** Validates every retained payload against role, table and envelope version; applies all or none. */
	bool ApplyPayloads(const FLongTableAuthorityMessage& Message, const FString& EnvelopeTableId, bool bSnapshot);
	bool ShouldApply(int32 Version, int32 Revision) const;

	void HandleConnected();
	void HandleMessage(const FString& Text);
	void HandleClosed(int32 Code, const FString& Reason, bool bClean);
	void HandleError(const FString& Error);

	FLongTableClientConfig Config;
	FString ActiveContext;
	TSharedPtr<ILongTableTransport> Transport;
	ELongTableConnectionState State = ELongTableConnectionState::Disconnected;
	int32 LastAppliedVersion = -1;
	int32 LastUncommittedRevision = -1;
	bool bEverWelcomed = false;
	bool bHasSeat = false;
	ELongTableSeat Seat = ELongTableSeat::South;
	FString SessionId;
	FLongTableIntentIdentity Identity;
	FLongTableCommitMachine Commit;
	/** Exactly one of these is ever populated: the one for Config.Role. */
	FLongTablePlayerProjection PlayerCache;
	FLongTableHostProjection HostCache;
	FLongTablePublicProjection PublicCache;
	FLongTableIntentReceipt LastReceipt;
	int32 AppliedFrames = 0;
};
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001-R1 | END]]
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
