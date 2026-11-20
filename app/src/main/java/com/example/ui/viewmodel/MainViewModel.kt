package com.example.ui.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.CardScale
import com.example.data.Handedness
import com.example.data.SoundFeedback
import com.example.data.TablePreferences
import com.example.data.TablePreferencesRepository
import com.example.engine.AiPlayerPolicy
import com.example.engine.BidAction
import com.example.engine.BidWhistRulesEngine
import com.example.engine.RoleMode
import com.example.engine.Seat
import com.example.engine.SeatView
import com.example.engine.Suit
import com.example.engine.TablePhase
import com.example.engine.TableTalkTone
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class TableUiState(
    val seatView: SeatView? = null,
    val selectedCardId: String? = null,
    val selectedDiscardIds: Set<String> = emptySet(),
    val statusNotice: String? = null,
    val seatNames: Map<Seat, String> = Seat.entries.associateWith { it.defaultPlayerName },
    val isAiThinking: Boolean = false
)

class MainViewModel(application: Application) : AndroidViewModel(application) {
    private val prefsRepo = TablePreferencesRepository(application.applicationContext)
    private val engine = BidWhistRulesEngine()
    private val aiPolicy = AiPlayerPolicy(engine)

    val preferences: StateFlow<TablePreferences> = prefsRepo.preferences.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = TablePreferences()
    )

    private var authoritativeState: BidWhistRulesEngine.AuthoritativeState? = null
    private var aiTurnJob: Job? = null
    private var recordedHandNumber: Int = 0

    private val _tableState = MutableStateFlow(TableUiState())
    val tableState: StateFlow<TableUiState> = combine(
        _tableState,
        prefsRepo.preferences
    ) { table, prefs ->
        val auth = authoritativeState
        if (auth != null) {
            val projected = engine.projectSeatView(
                state = auth,
                guidedHint = if (prefs.guidedHintEnabled) {
                    aiPolicy.generateCoachHint(engine.projectSeatView(auth))
                } else {
                    null
                }
            )
            table.copy(seatView = projected)
        } else {
            table
        }
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = TableUiState()
    )

    fun startNewMatch(guidedMode: Boolean? = null) {
        aiTurnJob?.cancel()
        recordedHandNumber = 0
        if (guidedMode != null) {
            viewModelScope.launch { prefsRepo.updateGuidedHintEnabled(guidedMode) }
        }
        val state = engine.startNewMatch(System.currentTimeMillis())
        authoritativeState = state
        publishState(selectedCardId = null, selectedDiscardIds = emptySet(), notice = null)
        scheduleAiAdvanceIfNeeded()
    }

    fun dealNextHand() {
        val current = authoritativeState ?: return
        if (current.isBetweenHandPaused) {
            _tableState.value = _tableState.value.copy(
                statusNotice = "Table is paused by Host between hands. Resume to deal."
            )
            return
        }
        aiTurnJob?.cancel()
        val next = engine.dealNextHand(current, System.currentTimeMillis())
        authoritativeState = next
        publishState(selectedCardId = null, selectedDiscardIds = emptySet(), notice = null)
        scheduleAiAdvanceIfNeeded()
    }

    fun submitHumanBid(action: BidAction) {
        val current = authoritativeState ?: return
        if (current.phase != TablePhase.BIDDING || current.currentTurn != Seat.SOUTH) return
        if (!engine.isBidValid(current, Seat.SOUTH, action)) {
            _tableState.value = _tableState.value.copy(
                statusNotice = "Bid must outrank the current high bid (${(current.highestBid?.action as? BidAction.Bid)?.formatShort() ?: "none"})."
            )
            return
        }
        SoundFeedback.playCardSnap(preferences.value.soundEffectsEnabled)
        authoritativeState = engine.submitBid(current, Seat.SOUTH, action)
        publishState(selectedCardId = null, selectedDiscardIds = emptySet(), notice = null)
        scheduleAiAdvanceIfNeeded()
    }

    /**
     * South names the trump suit after winning a suit bid. Direction and Trump/No-Trump
     * were declared in the auction and are enforced by the engine.
     */
    fun selectTrumpAndTakeKitty(trumpSuit: Suit) {
        val current = authoritativeState ?: return
        if (current.phase != TablePhase.SELECT_TRUMP || current.currentTurn != Seat.SOUTH) return
        SoundFeedback.playTrickChime(preferences.value.soundEffectsEnabled)
        authoritativeState = engine.selectTrumpAndPickUpKitty(current, Seat.SOUTH, trumpSuit)
        publishState(selectedCardId = null, selectedDiscardIds = emptySet(), notice = null)
    }

    fun toggleKittyDiscardCard(cardId: String) {
        val current = authoritativeState ?: return
        if (current.phase != TablePhase.KITTY_DISCARD || current.currentTurn != Seat.SOUTH) return
        val existing = _tableState.value.selectedDiscardIds
        val updated = if (cardId in existing) {
            existing - cardId
        } else if (existing.size < engine.manifest.kittySize) {
            existing + cardId
        } else {
            _tableState.value = _tableState.value.copy(
                statusNotice = "6 cards already selected. Tap a selected card to uncheck it."
            )
            return
        }
        _tableState.value = _tableState.value.copy(
            selectedDiscardIds = updated,
            statusNotice = null
        )
    }

    fun confirmKittyDiscards() {
        val current = authoritativeState ?: return
        if (current.phase != TablePhase.KITTY_DISCARD || current.currentTurn != Seat.SOUTH) return
        val selected = _tableState.value.selectedDiscardIds
        if (selected.size != engine.manifest.kittySize) {
            _tableState.value = _tableState.value.copy(
                statusNotice = "Select exactly 6 cards to lay down before leading."
            )
            return
        }
        SoundFeedback.playCardSnap(preferences.value.soundEffectsEnabled)
        authoritativeState = engine.submitKittyDiscard(current, Seat.SOUTH, selected)
        publishState(selectedCardId = null, selectedDiscardIds = emptySet(), notice = null)
        scheduleAiAdvanceIfNeeded()
    }

    fun onCardTapped(cardId: String) {
        val current = authoritativeState ?: return
        if (current.phase == TablePhase.KITTY_DISCARD && current.currentTurn == Seat.SOUTH) {
            toggleKittyDiscardCard(cardId)
            return
        }
        if (current.phase != TablePhase.PLAYING_TRICK || current.currentTurn != Seat.SOUTH) return
        val view = engine.projectSeatView(current)
        if (cardId !in view.legalPlayCardIds) {
            val ledCard = current.currentTrick.firstOrNull()?.card
            val ledSuit = ledCard?.let { c -> current.contract?.let { engine.effectiveSuit(c, it) } }
            val suitMsg = ledSuit?.let { "Must follow ${it.symbol} ${it.label}." } ?: "Select a legal card."
            _tableState.value = _tableState.value.copy(statusNotice = suitMsg)
            return
        }

        if (!preferences.value.twoStepConfirm) {
            commitSelectedCard(cardId)
            return
        }

        val alreadySelected = _tableState.value.selectedCardId == cardId
        _tableState.value = _tableState.value.copy(
            selectedCardId = if (alreadySelected) null else cardId,
            statusNotice = null
        )
    }

    fun commitSelectedCard(explicitCardId: String? = null) {
        val current = authoritativeState ?: return
        if (current.phase != TablePhase.PLAYING_TRICK || current.currentTurn != Seat.SOUTH) return
        val cardId = explicitCardId ?: _tableState.value.selectedCardId ?: return
        SoundFeedback.playCardSnap(preferences.value.soundEffectsEnabled)
        authoritativeState = engine.playCard(current, Seat.SOUTH, cardId)
        publishState(selectedCardId = null, selectedDiscardIds = emptySet(), notice = null)
        scheduleAiAdvanceIfNeeded()
    }

    fun collectTrickNow() {
        val current = authoritativeState ?: return
        if (current.phase != TablePhase.TRICK_COMPLETE) return
        aiTurnJob?.cancel()
        advanceAfterTrickComplete()
    }

    // Host Controls (strictly constrained: no concealed card access!)
    fun toggleBetweenHandPause() {
        val current = authoritativeState ?: return
        if (preferences.value.roleMode != RoleMode.SEATED_PLAYER_HOST) return
        val paused = !current.isBetweenHandPaused
        authoritativeState = current.copy(
            isBetweenHandPaused = paused,
            latestCaption = if (paused) "Host paused the table between hands." else "Host resumed table play."
        )
        publishState(notice = if (paused) "Table paused by Host." else "Table resumed.")
    }

    fun voidHandAsHost(reason: String) {
        val current = authoritativeState ?: return
        if (preferences.value.roleMode != RoleMode.SEATED_PLAYER_HOST) return
        aiTurnJob?.cancel()
        authoritativeState = engine.voidCurrentHandAsHost(current, reason)
        publishState(selectedCardId = null, selectedDiscardIds = emptySet(), notice = null)
    }

    fun applySeatPreset(presetName: String) {
        val names = when (presetName) {
            "Family Reunion" -> mapOf(
                Seat.SOUTH to "You",
                Seat.WEST to "Cousin Derek",
                Seat.NORTH to "Aunt Brenda",
                Seat.EAST to "Uncle Ronnie"
            )
            "Bid School" -> mapOf(
                Seat.SOUTH to "You",
                Seat.WEST to "Coach Vance",
                Seat.NORTH to "Mentor Denise",
                Seat.EAST to "Mentor Curtis"
            )
            else -> Seat.entries.associateWith { it.defaultPlayerName }
        }
        _tableState.value = _tableState.value.copy(
            seatNames = names,
            statusNotice = "Table seating updated: $presetName"
        )
    }

    fun clearNotice() {
        _tableState.value = _tableState.value.copy(statusNotice = null)
    }

    // Preferences updates
    fun updateHandedness(v: Handedness) = viewModelScope.launch { prefsRepo.updateHandedness(v) }
    fun updateCardScale(v: CardScale) = viewModelScope.launch { prefsRepo.updateCardScale(v) }
    fun updateTwoStepConfirm(v: Boolean) = viewModelScope.launch { prefsRepo.updateTwoStepConfirm(v) }
    fun updateHighContrastSuits(v: Boolean) = viewModelScope.launch { prefsRepo.updateHighContrastSuits(v) }
    fun updateCaptionsEnabled(v: Boolean) = viewModelScope.launch { prefsRepo.updateCaptionsEnabled(v) }
    fun updateReducedMotion(v: Boolean) = viewModelScope.launch { prefsRepo.updateReducedMotion(v) }
    fun updateSoundEffects(v: Boolean) = viewModelScope.launch { prefsRepo.updateSoundEffects(v) }
    fun updateTableTalkTone(v: TableTalkTone) = viewModelScope.launch { prefsRepo.updateTableTalkTone(v) }
    fun updateRoleMode(v: RoleMode) = viewModelScope.launch { prefsRepo.updateRoleMode(v) }
    fun acknowledgeManifest(v: Boolean) = viewModelScope.launch { prefsRepo.setManifestAcknowledged(v) }
    fun markBidSchoolCompleted() = viewModelScope.launch { prefsRepo.setBidSchoolCompleted(true) }
    fun updateGuidedHintEnabled(v: Boolean) = viewModelScope.launch { prefsRepo.updateGuidedHintEnabled(v) }

    private fun scheduleAiAdvanceIfNeeded() {
        val current = authoritativeState ?: return
        val needsAi = when (current.phase) {
            TablePhase.BIDDING,
            TablePhase.SELECT_TRUMP,
            TablePhase.KITTY_DISCARD,
            TablePhase.PLAYING_TRICK -> !current.currentTurn.isHuman
            TablePhase.TRICK_COMPLETE -> true
            else -> false
        }
        if (!needsAi) {
            _tableState.value = _tableState.value.copy(isAiThinking = false)
            return
        }

        aiTurnJob?.cancel()
        aiTurnJob = viewModelScope.launch {
            _tableState.value = _tableState.value.copy(isAiThinking = true)
            val stepDelay = if (preferences.value.reducedMotion) 280L else 780L
            delay(if (current.phase == TablePhase.TRICK_COMPLETE) stepDelay + 450L else stepDelay)

            val latest = authoritativeState ?: return@launch
            val tone = preferences.value.tableTalkTone
            when (latest.phase) {
                TablePhase.BIDDING -> {
                    val seat = latest.currentTurn
                    if (!seat.isHuman) {
                        val obs = engine.projectAiObservation(latest, seat)
                        val (bid, line) = aiPolicy.chooseBid(obs, tone)
                        SoundFeedback.playCardSnap(preferences.value.soundEffectsEnabled)
                        authoritativeState = engine.submitBid(latest, seat, bid, line)
                        publishState()
                        scheduleAiAdvanceIfNeeded()
                    }
                }
                TablePhase.SELECT_TRUMP -> {
                    val seat = latest.currentTurn
                    if (!seat.isHuman) {
                        val obs = engine.projectAiObservation(latest, seat)
                        val suit = aiPolicy.chooseTrumpSuit(obs)
                        SoundFeedback.playTrickChime(preferences.value.soundEffectsEnabled)
                        authoritativeState = engine.selectTrumpAndPickUpKitty(latest, seat, suit)
                        publishState()
                        scheduleAiAdvanceIfNeeded()
                    }
                }
                TablePhase.KITTY_DISCARD -> {
                    val seat = latest.currentTurn
                    if (!seat.isHuman) {
                        val obs = engine.projectAiObservation(latest, seat)
                        val discards = aiPolicy.chooseSixDiscards(obs)
                        authoritativeState = engine.submitKittyDiscard(latest, seat, discards)
                        publishState()
                        scheduleAiAdvanceIfNeeded()
                    }
                }
                TablePhase.PLAYING_TRICK -> {
                    val seat = latest.currentTurn
                    if (!seat.isHuman) {
                        val obs = engine.projectAiObservation(latest, seat)
                        val (card, line) = aiPolicy.chooseCardToPlay(obs, tone)
                        SoundFeedback.playCardSnap(preferences.value.soundEffectsEnabled)
                        authoritativeState = engine.playCard(latest, seat, card.id, line)
                        publishState()
                        scheduleAiAdvanceIfNeeded()
                    }
                }
                TablePhase.TRICK_COMPLETE -> {
                    advanceAfterTrickComplete()
                }
                else -> {
                    _tableState.value = _tableState.value.copy(isAiThinking = false)
                }
            }
        }
    }

    private fun advanceAfterTrickComplete() {
        val current = authoritativeState ?: return
        if (current.phase != TablePhase.TRICK_COMPLETE) return
        SoundFeedback.playTrickChime(preferences.value.soundEffectsEnabled)
        val next = engine.collectCompletedTrick(current)
        authoritativeState = next
        if ((next.phase == TablePhase.HAND_COMPLETE || next.phase == TablePhase.MATCH_COMPLETE) &&
            next.handNumber != recordedHandNumber
        ) {
            recordedHandNumber = next.handNumber
            val outcome = next.lastOutcome
            if (outcome != null && !outcome.wasVoided) {
                viewModelScope.launch {
                    prefsRepo.recordHandResult(
                        usWon = outcome.pointsAwardedTo == com.example.engine.Partnership.US,
                        isBoston = outcome.isBoston
                    )
                }
            }
        }
        publishState()
        scheduleAiAdvanceIfNeeded()
    }

    private fun publishState(
        selectedCardId: String? = _tableState.value.selectedCardId,
        selectedDiscardIds: Set<String> = _tableState.value.selectedDiscardIds,
        notice: String? = _tableState.value.statusNotice
    ) {
        val auth = authoritativeState ?: return
        val prefs = preferences.value
        val projected = engine.projectSeatView(
            state = auth,
            guidedHint = if (prefs.guidedHintEnabled) {
                aiPolicy.generateCoachHint(engine.projectSeatView(auth))
            } else {
                null
            }
        )
        _tableState.value = _tableState.value.copy(
            seatView = projected,
            selectedCardId = selectedCardId,
            selectedDiscardIds = selectedDiscardIds,
            statusNotice = notice,
            isAiThinking = auth.phase in setOf(
                TablePhase.BIDDING,
                TablePhase.SELECT_TRUMP,
                TablePhase.KITTY_DISCARD,
                TablePhase.PLAYING_TRICK
            ) && !auth.currentTurn.isHuman || auth.phase == TablePhase.TRICK_COMPLETE
        )
    }
}
