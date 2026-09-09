// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
#include "LongTableTransport.h"
#include "LongTableTableModule.h"
#include "Modules/ModuleManager.h"
#include "IWebSocket.h"
#include "WebSocketsModule.h"

// ---------------------------------------------------------------------------
// WebSocket transport
// ---------------------------------------------------------------------------

FLongTableWebSocketTransport::~FLongTableWebSocketTransport()
{
	Unbind();
}

void FLongTableWebSocketTransport::Unbind()
{
	if (Socket.IsValid())
	{
		Socket->OnConnected().Clear();
		Socket->OnConnectionError().Clear();
		Socket->OnClosed().Clear();
		Socket->OnMessage().Clear();
	}
}

void FLongTableWebSocketTransport::Connect(const FString& Url)
{
	Close();
#if WITH_WEBSOCKETS
	FWebSocketsModule& Module = FModuleManager::LoadModuleChecked<FWebSocketsModule>(TEXT("WebSockets"));
	Socket = Module.CreateWebSocket(Url, FString());
	Socket->OnConnected().AddLambda([this]() { OnConnected.Broadcast(); });
	Socket->OnConnectionError().AddLambda([this](const FString& Error) { OnError.Broadcast(Error); });
	Socket->OnClosed().AddLambda([this](int32 StatusCode, const FString& Reason, bool bWasClean) { OnClosed.Broadcast(StatusCode, Reason, bWasClean); });
	Socket->OnMessage().AddLambda([this](const FString& Message) { OnMessage.Broadcast(Message); });
	Socket->Connect();
#else
	UE_LOG(LogLongTableTable, Error, TEXT("WebSockets are unavailable on this platform build"));
	OnError.Broadcast(TEXT("websockets-unavailable"));
#endif
}

void FLongTableWebSocketTransport::Close()
{
	if (Socket.IsValid())
	{
		Unbind();
		if (Socket->IsConnected())
		{
			Socket->Close();
		}
		Socket.Reset();
	}
}

bool FLongTableWebSocketTransport::IsConnected() const
{
	return Socket.IsValid() && Socket->IsConnected();
}

void FLongTableWebSocketTransport::Send(const FString& Text)
{
	if (Socket.IsValid() && Socket->IsConnected())
	{
		Socket->Send(Text);
	}
}

// ---------------------------------------------------------------------------
// Loopback transport
// ---------------------------------------------------------------------------

void FLongTableLoopbackTransport::Connect(const FString& Url)
{
	LastUrl = Url;
	bConnected = true;
	OnConnected.Broadcast();
}

void FLongTableLoopbackTransport::Close()
{
	if (bConnected)
	{
		bConnected = false;
		OnClosed.Broadcast(1000, TEXT("closed"), true);
	}
}

bool FLongTableLoopbackTransport::IsConnected() const
{
	return bConnected;
}

void FLongTableLoopbackTransport::Send(const FString& Text)
{
	if (bConnected)
	{
		Sent.Add(Text);
	}
}

void FLongTableLoopbackTransport::Inject(const FString& Text)
{
	OnMessage.Broadcast(Text);
}

void FLongTableLoopbackTransport::Drop()
{
	if (bConnected)
	{
		bConnected = false;
		OnClosed.Broadcast(1006, TEXT("dropped"), false);
	}
}
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
