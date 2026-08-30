// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
/**
 * Transport boundary for the authority connection. The WebSocket transport
 * wraps the engine's IWebSocket; the loopback transport lets tests drive the
 * client with injected authority frames and inspect what it sent.
 */
#pragma once

#include "CoreMinimal.h"
#include "Delegates/Delegate.h"

class IWebSocket;

DECLARE_MULTICAST_DELEGATE(FLongTableTransportConnected);
DECLARE_MULTICAST_DELEGATE_OneParam(FLongTableTransportMessage, const FString& /* Text */);
DECLARE_MULTICAST_DELEGATE_ThreeParams(FLongTableTransportClosed, int32 /* Code */, const FString& /* Reason */, bool /* bClean */);
DECLARE_MULTICAST_DELEGATE_OneParam(FLongTableTransportError, const FString& /* Error */);

class LONGTABLETABLE_API ILongTableTransport
{
public:
	virtual ~ILongTableTransport() = default;

	virtual void Connect(const FString& Url) = 0;
	virtual void Close() = 0;
	virtual bool IsConnected() const = 0;
	virtual void Send(const FString& Text) = 0;

	FLongTableTransportConnected OnConnected;
	FLongTableTransportMessage OnMessage;
	FLongTableTransportClosed OnClosed;
	FLongTableTransportError OnError;
};

/** Engine WebSocket (text frames). */
class LONGTABLETABLE_API FLongTableWebSocketTransport : public ILongTableTransport
{
public:
	virtual ~FLongTableWebSocketTransport() override;
	virtual void Connect(const FString& Url) override;
	virtual void Close() override;
	virtual bool IsConnected() const override;
	virtual void Send(const FString& Text) override;

private:
	void Unbind();
	TSharedPtr<IWebSocket> Socket;
};

/** In-memory transport for automation tests. */
class LONGTABLETABLE_API FLongTableLoopbackTransport : public ILongTableTransport
{
public:
	virtual void Connect(const FString& Url) override;
	virtual void Close() override;
	virtual bool IsConnected() const override;
	virtual void Send(const FString& Text) override;

	/** Delivers an authority frame to the client. */
	void Inject(const FString& Text);
	/** Simulates an unclean disconnect. */
	void Drop();

	TArray<FString> Sent;
	FString LastUrl;

private:
	bool bConnected = false;
};
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
