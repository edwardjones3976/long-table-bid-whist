// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
#pragma once

#include "CoreMinimal.h"
#include "Modules/ModuleInterface.h"
#include "Logging/LogMacros.h"

LONGTABLETABLE_API DECLARE_LOG_CATEGORY_EXTERN(LogLongTableTable, Log, All);

class FLongTableTableModule : public IModuleInterface
{
public:
	virtual void StartupModule() override;
	virtual void ShutdownModule() override;
};
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
