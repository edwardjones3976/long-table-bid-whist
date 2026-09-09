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
 * An authority context is (url, token, role, table), compared structurally
 * field by field with exact case-sensitive equality — never through a
 * delimiter-joined key, so no token, role, table or endpoint pair can collide.
 * Reconfiguring to a different context resets every cached projection, the
 * session, the seat, the version, the resume marker and the in-flight intent,
 * and bumps the context generation, so nothing from one context can be
 * resumed or replayed into another. A retry after a reconnect within the same
 * context carries the intent's original expected version.
 *
 * A welcome is staged and validated in full, committed atomically, and only
 * then broadcast: every synchronous callback observes one fully committed
 * context, and after every callback the client aborts the old frame's
 * continuation — including the in-flight resend — when the context generation
 * changed underneath it. A welcome in the same context never rolls the
 * applied version, the cached projection or the resume position backwards,
 * and Resyncing exits to Ready only after coherent newer state was applied.
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

// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | BEGIN]]
/**
 * Single-binding twins of the context-bound events above, used only by the
 * guarded snapshot adapter: UE5.7's ordinary `Broadcast()` copies the full
 * invocation list before invoking, so a reentrant Configure inside listener
 * one could not stop listener two. The adapter instead copies the invocation
 * list itself and invokes ONE copied binding at a time through these
 * signatures, re-checking the context generation before each next binding.
 * The reflected BlueprintAssignable API above is unchanged.
 */
DECLARE_DYNAMIC_DELEGATE_OneParam(FLongTablePlayerProjectionSingle, const FLongTablePlayerProjection&, Projection);
DECLARE_DYNAMIC_DELEGATE_OneParam(FLongTableHostProjectionSingle, const FLongTableHostProjection&, Projection);
DECLARE_DYNAMIC_DELEGATE_OneParam(FLongTablePublicProjectionSingle, const FLongTablePublicProjection&, Projection);
DECLARE_DYNAMIC_DELEGATE_OneParam(FLongTableReceiptSingle, const FLongTableIntentReceipt&, Receipt);
DECLARE_DYNAMIC_DELEGATE_OneParam(FLongTableDealerCueSingle, const FLongTableDealerCueFrame&, Frame);
DECLARE_DYNAMIC_DELEGATE_OneParam(FLongTableConnectionStateSingle, ELongTableConnectionState, State);
DECLARE_DYNAMIC_DELEGATE_TwoParams(FLongTableWireErrorSingle, ELongTableWireError, Code, const FString&, Detail);
DECLARE_DYNAMIC_DELEGATE_TwoParams(FLongTableFrameRejectedSingle, ELongTableFrameFault, Fault, const FString&, Detail);
// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | END]]

// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | BEGIN]]
/**
 * Project-owned by-value binding snapshot of one dynamic multicast event.
 *
 * Every dynamic multicast delegate class is a TMulticastScriptDelegate whose
 * invocation list is a protected member with no public accessor. Deriving
 * from the event's own class and copy-constructing from the live event is
 * legal protected-base access: the copy is a private, by-value snapshot of
 * the bindings at the moment a fanout starts, which the guarded adapter walks
 * one binding at a time. The live event is never read again during the
 * fanout, and no engine header, private member, layout cast, GetAllObjects
 * or ordinary Broadcast() takes part.
 */
template <typename MulticastType>
class TLongTableBindingSnapshot final : public MulticastType
{
public:
	explicit TLongTableBindingSnapshot(const MulticastType& Source)
		: MulticastType(Source)
	{
	}

	/** The copied bindings; each exposes its target and function through the public script-delegate API. */
	typename MulticastType::InvocationListType& Bindings()
	{
		return this->InvocationList;
	}
};

/**
 * Two independent clocks govern the client. The logical context generation
 * (below) advances only when a genuinely different authority context is
 * configured and resets every cached projection, session and intent. The
 * transport dispatch epoch advances on EVERY transport binding or replacement,
 * identical configuration included: every transport callback is bound with
 * the epoch it belongs to and returns before reading configuration or sending
 * once that epoch has passed; every fanout re-checks the epoch before each
 * next sibling; and Connect, Disconnect, SendHello, client sends, resends and
 * resync capture epoch, transport and configuration before any synchronous
 * callback and re-check after it.
 */
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | END]]

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

	// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | BEGIN]]
	/** True while this client can form a v2 intent identity: a welcomed grant with an unexhausted counter domain. */
	UFUNCTION(BlueprintPure, Category = "Long Table") bool HasIntentIdentity() const { return Identity.CanIssue(); }
	/** The exact next counter this client would issue under its welcomed grant. */
	UFUNCTION(BlueprintPure, Category = "Long Table") int64 GetNextIntentCounter() const { return Identity.PeekNextCounter(); }
	/** True once the table incarnation reported exhaustion (a null welcome counter or the maximum consumed). */
	UFUNCTION(BlueprintPure, Category = "Long Table") bool IsIntentExhausted() const { return Identity.IsExhausted(); }
	const FLongTableIntentIdentity& IntentIdentityForTests() const { return Identity; }
	// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | END]]

	UPROPERTY(BlueprintAssignable, Category = "Long Table") FLongTablePlayerProjectionEvent OnPlayerProjection;
	UPROPERTY(BlueprintAssignable, Category = "Long Table") FLongTableHostProjectionEvent OnHostProjection;
	UPROPERTY(BlueprintAssignable, Category = "Long Table") FLongTablePublicProjectionEvent OnPublicProjection;
	UPROPERTY(BlueprintAssignable, Category = "Long Table") FLongTableReceiptEvent OnReceipt;
	UPROPERTY(BlueprintAssignable, Category = "Long Table") FLongTableDealerCueEvent OnDealerCue;
	UPROPERTY(BlueprintAssignable, Category = "Long Table") FLongTableConnectionStateEvent OnConnectionState;
	UPROPERTY(BlueprintAssignable, Category = "Long Table") FLongTableWireErrorEvent OnWireError;
	UPROPERTY(BlueprintAssignable, Category = "Long Table") FLongTableFrameRejectedEvent OnFrameRejected;

	// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-FINAL-001 | BEGIN]]
	/** Increments whenever the authenticated context resets; a change under a callback aborts the old frame's continuation. */
	uint64 GetContextGenerationForTests() const { return ContextGeneration; }
	// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-FINAL-001 | END]]

	// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | BEGIN]]
	/** Increments on every transport binding or replacement, identical configuration included; stops old siblings, callbacks and sends. */
	uint64 GetDispatchEpochForTests() const { return DispatchEpoch; }
	/** True while an issued identity awaits its receipt: its counter is reserved, not advanced. */
	UFUNCTION(BlueprintPure, Category = "Long Table") bool HasIntentReservation() const { return Identity.HasReservation(); }
	/** True after the authority refused this client's identity; submission stays disabled until a fresh welcome. */
	UFUNCTION(BlueprintPure, Category = "Long Table") bool IsIntentIdentityInvalidated() const { return Identity.IsInvalidated(); }
	// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | END]]

private:
	// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-FINAL-001 | BEGIN]]
	/** Structural, case-sensitive equality of two authenticated contexts: url, token, role and table, field by field. */
	static bool SameAuthorityContext(const FLongTableClientConfig& A, const FLongTableClientConfig& B);

	/** Every payload of one envelope, decoded and validated but not yet applied. */
	struct FStagedPayloads
	{
		TArray<FLongTablePlayerProjection> Player;
		TArray<FLongTableHostProjection> Host;
		TArray<FLongTablePublicProjection> Public;
	};

	/**
	 * Pass 1: decodes and validates every retained payload for this client's
	 * role against role, table, envelope version and (when expected) the seat.
	 * Changes no state; a single failure stages nothing.
	 */
	bool StagePayloads(const FLongTableAuthorityMessage& Message, const FString& EnvelopeTableId, bool bExpectSeat, ELongTableSeat ExpectedSeat, FStagedPayloads& OutStaged);

	/**
	 * Pass 2: applies staged candidates in order — commit first, then the
	 * broadcast — and returns false when the context generation changed under
	 * a callback, so the caller aborts the old frame's continuation.
	 */
	bool ApplyStaged(const FStagedPayloads& Staged);
	// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-FINAL-001 | END]]

	// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | BEGIN]]
	/**
	 * The guarded snapshot adapter behind every context-bound event: copies the
	 * multicast's invocation list, then invokes one copied binding at a time
	 * through the matching single-delegate signature, checking the context
	 * generation before each next binding. Returns false when a reentrant
	 * context change aborted the fanout, so the caller drops the old frame's
	 * continuation. Compiles against the reflected dynamic-delegate API alone.
	 */
	template <typename MulticastType, typename SingleType, typename... TArgs>
	bool BroadcastGuarded(const MulticastType& Delegate, TArgs&&... Args);
	// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | END]]

	void ResetContext();
	void SetState(ELongTableConnectionState NewState);
	void SendHello();
	void SendClientMessage(const FLongTableClientMessage& Message);
	// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | BEGIN]]
	/** Sends on the captured transport only while `Epoch` is still the current dispatch epoch. */
	void SendOn(const TSharedPtr<ILongTableTransport>& Captured, uint64 Epoch, const FLongTableClientMessage& Message);
	/** Removes this client's callbacks from the bound transport and closes it. */
	void UnbindTransport();
	// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | END]]
	void ResendInFlight();
	bool Fault(ELongTableFrameFault Fault, const FString& Detail);
	bool ShouldApply(int32 Version, int32 Revision) const;

	void HandleConnected();
	void HandleMessage(const FString& Text);
	void HandleClosed(int32 Code, const FString& Reason, bool bClean);
	void HandleError(const FString& Error);

	FLongTableClientConfig Config;
	// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-FINAL-001 | BEGIN]]
	/** The authenticated context currently bound; compared structurally, never as a joined string. */
	FLongTableClientConfig ActiveConfig;
	bool bHasActiveContext = false;
	/** Bumped by every context reset; captured before callbacks and re-checked after each one. */
	uint64 ContextGeneration = 0;
	// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | BEGIN]]
	/** Bumped by every transport binding or replacement; every callback, fanout and send is checked against it. */
	uint64 DispatchEpoch = 0;
	// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | END]]
	/** The version held when the outstanding resync was requested; -1 when none is outstanding. */
	int32 ResyncBaseVersion = -1;
	// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-FINAL-001 | END]]
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

// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-FINAL-001 | BEGIN]]
/**
 * Automation support: a UObject whose UFUNCTION handlers can be bound to the
 * client's dynamic delegates so tests can observe callback ordering and drive
 * a reentrant action (such as reconfiguring the client) from inside a
 * synchronous broadcast. Not used by any runtime path.
 */
UCLASS()
class LONGTABLETABLE_API ULongTableAuthorityCallbackProbe : public UObject
{
	GENERATED_BODY()

public:
	/** Invoked from every handler below, after recording; automation may reenter the client from it. */
	TFunction<void()> OnEvent;

	UFUNCTION()
	void HandleConnectionState(ELongTableConnectionState NewState)
	{
		States.Add(NewState);
		if (OnEvent) { OnEvent(); }
	}

	UFUNCTION()
	void HandlePlayerProjection(const FLongTablePlayerProjection& Projection)
	{
		PlayerVersions.Add(Projection.Version);
		if (OnEvent) { OnEvent(); }
	}

	UFUNCTION()
	void HandleDealerCue(const FLongTableDealerCueFrame& Frame)
	{
		CueTableIds.Add(Frame.TableId);
		if (OnEvent) { OnEvent(); }
	}

	// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | BEGIN]]
	UFUNCTION()
	void HandleWireError(ELongTableWireError Code, const FString& Detail)
	{
		WireErrors.Add(Code);
		if (OnEvent) { OnEvent(); }
	}

	UFUNCTION()
	void HandleFrameRejected(ELongTableFrameFault Fault, const FString& Detail)
	{
		FrameFaults.Add(Fault);
		if (OnEvent) { OnEvent(); }
	}

	UFUNCTION()
	void HandleReceipt(const FLongTableIntentReceipt& Receipt)
	{
		ReceiptIds.Add(Receipt.IntentId);
		if (OnEvent) { OnEvent(); }
	}

	TArray<ELongTableWireError> WireErrors;
	TArray<ELongTableFrameFault> FrameFaults;
	TArray<FString> ReceiptIds;
	// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | END]]

	TArray<ELongTableConnectionState> States;
	TArray<int32> PlayerVersions;
	TArray<FString> CueTableIds;
};
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-FINAL-001 | END]]
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001-R1 | END]]
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
