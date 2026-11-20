package com.example.engine

import kotlin.random.Random

/**
 * Pure, deterministic Bid Whist rules engine with zero Android or UI dependencies.
 * Enforces Strict Table Manifest rules and isolates concealed per-seat card views.
 */
class BidWhistRulesEngine(
    val manifest: TableRulesManifest = TableRulesManifest()
) {
    /**
     * Authoritative internal match state (never exposed wholesale to AI or UI).
     */
    data class AuthoritativeState(
        val handNumber: Int,
        val seed: Long,
        val phase: TablePhase,
        val dealer: Seat,
        val currentTurn: Seat,
        val scoreUs: Int,
        val scoreThem: Int,
        val hands: Map<Seat, List<Card>>,
        val kitty: List<Card>,
        val kittyCardIdsRevealedToDeclarer: Set<String>,
        val bidHistory: List<SeatBidRecord>,
        val highestBid: SeatBidRecord?,
        val contract: Contract?,
        val currentTrick: List<PlayedCard>,
        val completedTricks: List<TrickRecord>,
        val booksWonUs: Int,
        val booksWonThem: Int,
        val lastOutcome: HandOutcome?,
        val seatCaptions: Map<Seat, String>,
        val latestCaption: String,
        val auditLog: List<AuditEvent>,
        val isBetweenHandPaused: Boolean = false,
        val pendingVoidRequest: VoidRequest? = null
    )

    fun createStandardDeck(): List<Card> {
        val standard = Suit.entries.flatMap { suit ->
            Rank.entries
                .filter { it != Rank.BIG_JOKER && it != Rank.LITTLE_JOKER }
                .map { rank ->
                    Card(
                        id = "${suit.name}_${rank.name}",
                        suit = suit,
                        rank = rank
                    )
                }
        }
        val jokers = listOf(
            Card(id = "JOKER_BIG", suit = null, rank = Rank.BIG_JOKER),
            Card(id = "JOKER_LITTLE", suit = null, rank = Rank.LITTLE_JOKER)
        )
        return standard + jokers
    }

    fun startNewMatch(initialSeed: Long = System.currentTimeMillis()): AuthoritativeState {
        return dealHand(
            handNumber = 1,
            seed = initialSeed,
            dealer = Seat.EAST,
            scoreUs = 0,
            scoreThem = 0,
            priorLog = emptyList()
        )
    }

    fun dealHand(
        handNumber: Int,
        seed: Long,
        dealer: Seat,
        scoreUs: Int,
        scoreThem: Int,
        priorLog: List<AuditEvent> = emptyList()
    ): AuthoritativeState {
        val shuffled = createStandardDeck().shuffled(Random(seed))
        val southHand = sortHand(shuffled.subList(0, 12), null, BidDirection.UPTOWN)
        val westHand = sortHand(shuffled.subList(12, 24), null, BidDirection.UPTOWN)
        val northHand = sortHand(shuffled.subList(24, 36), null, BidDirection.UPTOWN)
        val eastHand = sortHand(shuffled.subList(36, 48), null, BidDirection.UPTOWN)
        val kitty = shuffled.subList(48, 54)

        val firstBidder = dealer.nextClockwise()
        val dealEvent = AuditEvent(
            sequence = priorLog.size + 1,
            phase = TablePhase.BIDDING,
            actor = "Authoritative Rules Service",
            summary = "Hand #$handNumber dealt (Dealer: ${dealer.displayName})",
            detail = "54 cards shuffled with seed #$seed; 12 cards per seat, 6 cards sealed in kitty. Manifest ${manifest.version}."
        )

        return AuthoritativeState(
            handNumber = handNumber,
            seed = seed,
            phase = TablePhase.BIDDING,
            dealer = dealer,
            currentTurn = firstBidder,
            scoreUs = scoreUs,
            scoreThem = scoreThem,
            hands = mapOf(
                Seat.SOUTH to southHand,
                Seat.WEST to westHand,
                Seat.NORTH to northHand,
                Seat.EAST to eastHand
            ),
            kitty = kitty,
            kittyCardIdsRevealedToDeclarer = emptySet(),
            bidHistory = emptyList(),
            highestBid = null,
            contract = null,
            currentTrick = emptyList(),
            completedTricks = emptyList(),
            booksWonUs = 0,
            booksWonThem = 0,
            lastOutcome = null,
            seatCaptions = emptyMap(),
            latestCaption = "Hand #$handNumber dealt. ${firstBidder.displayName} opens the bidding.",
            auditLog = priorLog + dealEvent
        )
    }

    fun isBidValid(
        state: AuthoritativeState,
        seat: Seat,
        action: BidAction
    ): Boolean {
        if (state.phase != TablePhase.BIDDING || state.currentTurn != seat) return false
        val isDealerLastTurn = seat == state.dealer && state.bidHistory.size == 3
        val allPassedSoFar = state.highestBid == null

        return when (action) {
            BidAction.Pass -> !(manifest.forcedDealerMinBid && isDealerLastTurn && allPassedSoFar)
            is BidAction.Bid -> {
                if (action.booksOverSix !in manifest.minBid..manifest.maxBid) return false
                val currentHigh = state.highestBid?.action as? BidAction.Bid ?: return true
                isBidHigher(action, currentHigh)
            }
        }
    }

    fun isBidHigher(candidate: BidAction.Bid, currentHigh: BidAction.Bid): Boolean {
        if (candidate.booksOverSix > currentHigh.booksOverSix) return true
        if (candidate.booksOverSix < currentHigh.booksOverSix) return false
        // Equal numeric level: No-Trump outranks Trump if manifest allows
        return manifest.noTrumpOutranksTrumpAtSameBid && candidate.isNoTrump && !currentHigh.isNoTrump
    }

    fun submitBid(
        state: AuthoritativeState,
        seat: Seat,
        action: BidAction,
        caption: String? = null
    ): AuthoritativeState {
        require(isBidValid(state, seat, action)) {
            "Illegal bid $action by $seat in phase ${state.phase}"
        }

        val isForced = state.bidHistory.size == 3 &&
            state.highestBid == null &&
            seat == state.dealer &&
            action is BidAction.Bid

        val record = SeatBidRecord(seat = seat, action = action, forcedByDealerRule = isForced)
        val newHistory = state.bidHistory + record
        val newHighest = if (action is BidAction.Bid) record else state.highestBid

        val spokenCaption = caption ?: when (action) {
            BidAction.Pass -> "${seat.displayName} passes."
            is BidAction.Bid -> if (isForced) {
                "${seat.displayName} is stuck as dealer at ${action.formatShort()}."
            } else {
                "${seat.displayName} bids ${action.formatShort()}."
            }
        }

        val event = AuditEvent(
            sequence = state.auditLog.size + 1,
            phase = TablePhase.BIDDING,
            actor = seat.displayName,
            summary = if (action is BidAction.Bid) "Bid ${action.formatShort()}" else "Pass",
            detail = spokenCaption
        )

        val updatedCaptions = state.seatCaptions + (seat to spokenCaption)

        if (newHistory.size < 4) {
            return state.copy(
                currentTurn = seat.nextClockwise(),
                bidHistory = newHistory,
                highestBid = newHighest,
                seatCaptions = updatedCaptions,
                latestCaption = spokenCaption,
                auditLog = state.auditLog + event
            )
        }

        // Auction complete! Winner takes the kitty
        val winningRecord = requireNotNull(newHighest)
        val winningBid = winningRecord.action as BidAction.Bid
        val declarer = winningRecord.seat

        // If winner already bid No-Trump, confirm trump=null; if suit bid, enter SELECT_TRUMP
        val nextPhase = if (winningBid.isNoTrump) {
            // Still let declarer take kitty and discard 6 cards
            val declarerHandWithKitty = sortHand(
                state.hands.getValue(declarer) + state.kitty,
                trumpSuit = null,
                direction = winningBid.direction
            )
            val newHands = state.hands + (declarer to declarerHandWithKitty)
            val kittyIds = state.kitty.map { it.id }.toSet()
            val contract = Contract(
                declarer = declarer,
                booksOverSix = winningBid.booksOverSix,
                trumpSuit = null,
                direction = winningBid.direction
            )
            val winEvent = AuditEvent(
                sequence = state.auditLog.size + 2,
                phase = TablePhase.KITTY_DISCARD,
                actor = "Authoritative Rules Service",
                summary = "${declarer.displayName} wins bid (${contract.formatBanner()})",
                detail = "6-card kitty delivered privately to ${declarer.displayName}."
            )
            return state.copy(
                phase = TablePhase.KITTY_DISCARD,
                currentTurn = declarer,
                hands = newHands,
                kittyCardIdsRevealedToDeclarer = kittyIds,
                bidHistory = newHistory,
                highestBid = winningRecord,
                contract = contract,
                seatCaptions = updatedCaptions,
                latestCaption = "${declarer.displayName} won the bid (${winningBid.formatShort()}) and picks up the kitty.",
                auditLog = state.auditLog + event + winEvent
            )
        } else {
            val winEvent = AuditEvent(
                sequence = state.auditLog.size + 2,
                phase = TablePhase.SELECT_TRUMP,
                actor = "Authoritative Rules Service",
                summary = "${declarer.displayName} wins auction at ${winningBid.formatShort()}",
                detail = "Awaiting trump suit declaration before revealing kitty."
            )
            return state.copy(
                phase = TablePhase.SELECT_TRUMP,
                currentTurn = declarer,
                bidHistory = newHistory,
                highestBid = winningRecord,
                seatCaptions = updatedCaptions,
                latestCaption = "${declarer.displayName} won the bid at ${winningBid.formatShort()} — naming trump.",
                auditLog = state.auditLog + event + winEvent
            )
        }
    }

    fun selectTrumpAndPickUpKitty(
        state: AuthoritativeState,
        seat: Seat,
        trumpSuit: Suit?,
        direction: BidDirection
    ): AuthoritativeState {
        require(state.phase == TablePhase.SELECT_TRUMP && state.currentTurn == seat) {
            "Not in SELECT_TRUMP for $seat"
        }
        val winningBid = state.highestBid?.action as? BidAction.Bid
            ?: error("Missing winning bid")

        val contract = Contract(
            declarer = seat,
            booksOverSix = winningBid.booksOverSix,
            trumpSuit = trumpSuit,
            direction = direction
        )

        val kittyIds = state.kitty.map { it.id }.toSet()
        val combinedHand = sortHand(
            state.hands.getValue(seat) + state.kitty,
            trumpSuit = trumpSuit,
            direction = direction
        )
        val reSortedAll = state.hands.mapValues { (s, hand) ->
            if (s == seat) combinedHand else sortHand(hand, trumpSuit, direction)
        }

        val trumpLabel = trumpSuit?.let { "${it.symbol} ${it.label}" } ?: "No-Trump"
        val caption = "${seat.displayName} calls $trumpLabel (${direction.label}) and takes the kitty."
        val event = AuditEvent(
            sequence = state.auditLog.size + 1,
            phase = TablePhase.KITTY_DISCARD,
            actor = seat.displayName,
            summary = "Contract: ${contract.formatBanner()}",
            detail = "6-card kitty delivered privately to ${seat.displayName} for 6 discards."
        )

        return state.copy(
            phase = TablePhase.KITTY_DISCARD,
            currentTurn = seat,
            hands = reSortedAll,
            kittyCardIdsRevealedToDeclarer = kittyIds,
            contract = contract,
            seatCaptions = state.seatCaptions + (seat to caption),
            latestCaption = caption,
            auditLog = state.auditLog + event
        )
    }

    fun submitKittyDiscard(
        state: AuthoritativeState,
        seat: Seat,
        discardCardIds: Set<String>
    ): AuthoritativeState {
        require(state.phase == TablePhase.KITTY_DISCARD && state.currentTurn == seat) {
            "Not in KITTY_DISCARD for $seat"
        }
        val contract = requireNotNull(state.contract)
        val currentHand = state.hands.getValue(seat)
        require(discardCardIds.size == manifest.kittySize) {
            "Must discard exactly ${manifest.kittySize} cards"
        }
        val remainingHand = currentHand.filterNot { it.id in discardCardIds }
        require(remainingHand.size == manifest.handSize) {
            "Discard IDs did not match cards in declarer hand"
        }

        val reSorted = state.hands.mapValues { (s, hand) ->
            if (s == seat) {
                sortHand(remainingHand, contract.trumpSuit, contract.direction)
            } else {
                sortHand(hand, contract.trumpSuit, contract.direction)
            }
        }

        // Kitty counts as 1st book for Declarer's partnership per Strict Table Manifest
        val kittyUs = if (contract.declarer.partnership == Partnership.US) 1 else 0
        val kittyThem = if (contract.declarer.partnership == Partnership.THEM) 1 else 0

        val caption = "${seat.displayName} lays down 6 discards (Kitty book credited) and leads trick 1."
        val event = AuditEvent(
            sequence = state.auditLog.size + 1,
            phase = TablePhase.PLAYING_TRICK,
            actor = seat.displayName,
            summary = "Kitty discarded; play begins",
            detail = "Declarer holds ${manifest.handSize} cards. ${contract.declarer.displayName} leads Trick 1."
        )

        return state.copy(
            phase = TablePhase.PLAYING_TRICK,
            currentTurn = contract.declarer,
            hands = reSorted,
            kittyCardIdsRevealedToDeclarer = emptySet(),
            booksWonUs = kittyUs,
            booksWonThem = kittyThem,
            seatCaptions = state.seatCaptions + (seat to "Kitty down. Let's play."),
            latestCaption = caption,
            auditLog = state.auditLog + event
        )
    }

    fun effectiveSuit(card: Card, contract: Contract): Suit? {
        return if (card.isJoker) {
            contract.trumpSuit // null in No-Trump
        } else {
            card.suit
        }
    }

    fun legalCards(
        hand: List<Card>,
        currentTrick: List<PlayedCard>,
        contract: Contract
    ): List<Card> {
        if (currentTrick.isEmpty()) return hand
        val ledSuit = effectiveSuit(currentTrick.first().card, contract) ?: return hand
        val matchingSuit = hand.filter { effectiveSuit(it, contract) == ledSuit }
        return matchingSuit.ifEmpty { hand }
    }

    fun rankStrength(rank: Rank, direction: BidDirection): Int {
        return when (direction) {
            BidDirection.UPTOWN -> rank.uptownOrder
            BidDirection.DOWNTOWN -> rank.downtownOrder
        }
    }

    fun cardStrength(card: Card, ledSuit: Suit?, contract: Contract): Int {
        val trump = contract.trumpSuit
        if (trump != null) {
            if (card.rank == Rank.BIG_JOKER) return 1000
            if (card.rank == Rank.LITTLE_JOKER) return 999
            if (card.suit == trump) return 500 + rankStrength(card.rank, contract.direction)
            if (ledSuit != null && card.suit == ledSuit) {
                return 100 + rankStrength(card.rank, contract.direction)
            }
            return 0
        } else {
            // No-Trump: Jokers have no suit and cannot win tricks
            if (card.isJoker) return 0
            if (ledSuit != null && card.suit == ledSuit) {
                return 100 + rankStrength(card.rank, contract.direction)
            }
            return 0
        }
    }

    fun determineTrickWinner(plays: List<PlayedCard>, contract: Contract): Seat {
        require(plays.size == 4) { "Trick must have 4 plays" }
        val ledSuit = effectiveSuit(plays.first().card, contract)
        return plays.maxBy { cardStrength(it.card, ledSuit, contract) }.seat
    }

    fun playCard(
        state: AuthoritativeState,
        seat: Seat,
        cardId: String,
        caption: String? = null
    ): AuthoritativeState {
        require(state.phase == TablePhase.PLAYING_TRICK && state.currentTurn == seat) {
            "Not $seat's turn to play"
        }
        val contract = requireNotNull(state.contract)
        val hand = state.hands.getValue(seat)
        val card = hand.firstOrNull { it.id == cardId }
            ?: error("Card $cardId not in $seat hand")

        val legal = legalCards(hand, state.currentTrick, contract)
        require(legal.any { it.id == cardId }) {
            "Illegal card play: ${card.displayName} does not follow suit"
        }

        val newHand = hand.filterNot { it.id == cardId }
        val newTrick = state.currentTrick + PlayedCard(seat = seat, card = card)
        val newHands = state.hands + (seat to newHand)

        val playText = caption ?: "${seat.displayName} plays ${card.accessibleDescription}."
        val playEvent = AuditEvent(
            sequence = state.auditLog.size + 1,
            phase = TablePhase.PLAYING_TRICK,
            actor = seat.displayName,
            summary = "Played ${card.displayName}",
            detail = playText
        )

        if (newTrick.size < 4) {
            return state.copy(
                currentTurn = seat.nextClockwise(),
                hands = newHands,
                currentTrick = newTrick,
                seatCaptions = state.seatCaptions + (seat to playText),
                latestCaption = playText,
                auditLog = state.auditLog + playEvent
            )
        }

        // Trick complete!
        val winner = determineTrickWinner(newTrick, contract)
        val trickNumber = state.completedTricks.size + 1
        val record = TrickRecord(
            trickNumber = trickNumber,
            leader = newTrick.first().seat,
            plays = newTrick,
            winner = winner
        )
        val newBooksUs = state.booksWonUs + if (winner.partnership == Partnership.US) 1 else 0
        val newBooksThem = state.booksWonThem + if (winner.partnership == Partnership.THEM) 1 else 0
        val trickSummary = "${winner.displayName} wins Book #$trickNumber (${newBooksUs}–${newBooksThem})."
        val trickEvent = AuditEvent(
            sequence = state.auditLog.size + 2,
            phase = TablePhase.TRICK_COMPLETE,
            actor = "Authoritative Rules Service",
            summary = "Book #$trickNumber -> ${winner.displayName}",
            detail = trickSummary
        )

        return state.copy(
            phase = TablePhase.TRICK_COMPLETE,
            currentTurn = winner,
            hands = newHands,
            currentTrick = newTrick,
            completedTricks = state.completedTricks + record,
            booksWonUs = newBooksUs,
            booksWonThem = newBooksThem,
            seatCaptions = state.seatCaptions + (seat to playText),
            latestCaption = trickSummary,
            auditLog = state.auditLog + playEvent + trickEvent
        )
    }

    fun collectCompletedTrick(state: AuthoritativeState): AuthoritativeState {
        require(state.phase == TablePhase.TRICK_COMPLETE) {
            "No completed trick to collect"
        }
        val contract = requireNotNull(state.contract)
        val lastTrick = state.completedTricks.last()

        // If 12 tricks have been played, score the hand!
        if (state.completedTricks.size >= manifest.handSize) {
            val declarerPartnership = contract.declarer.partnership
            val declarerBooks = if (declarerPartnership == Partnership.US) state.booksWonUs else state.booksWonThem
            val made = declarerBooks >= contract.targetBooks
            val isBoston = declarerBooks == 13

            val basePoints = when {
                isBoston && contract.booksOverSix == 7 -> manifest.bostonPoints
                contract.isNoTrump && manifest.noTrumpDoublesPoints -> contract.booksOverSix * 2
                else -> contract.booksOverSix
            }

            val awardedTo = if (made) {
                declarerPartnership
            } else {
                if (declarerPartnership == Partnership.US) Partnership.THEM else Partnership.US
            }

            val newScoreUs = state.scoreUs + if (awardedTo == Partnership.US) basePoints else 0
            val newScoreThem = state.scoreThem + if (awardedTo == Partnership.THEM) basePoints else 0

            val outcome = HandOutcome(
                handNumber = state.handNumber,
                contract = contract,
                booksWonUs = state.booksWonUs,
                booksWonThem = state.booksWonThem,
                contractMade = made,
                isBoston = isBoston,
                pointsAwardedTo = awardedTo,
                pointsDelta = basePoints
            )

            val matchOver = newScoreUs >= manifest.targetGameScore || newScoreThem >= manifest.targetGameScore
            val nextPhase = if (matchOver) TablePhase.MATCH_COMPLETE else TablePhase.HAND_COMPLETE
            val outcomeCaption = buildString {
                if (isBoston) append("BOSTON! ")
                if (made) {
                    append("${declarerPartnership.displayName} made ${contract.formatBanner()} (+$basePoints).")
                } else {
                    append("${declarerPartnership.displayName} were set! ${awardedTo.displayName} score +$basePoints.")
                }
            }
            val scoreEvent = AuditEvent(
                sequence = state.auditLog.size + 1,
                phase = nextPhase,
                actor = "Authoritative Rules Service",
                summary = if (made) "Contract Made (+$basePoints)" else "Contract Set (+$basePoints)",
                detail = "$outcomeCaption Match score: Us $newScoreUs – Them $newScoreThem."
            )

            return state.copy(
                phase = nextPhase,
                currentTurn = lastTrick.winner,
                scoreUs = newScoreUs,
                scoreThem = newScoreThem,
                currentTrick = emptyList(),
                lastOutcome = outcome,
                latestCaption = outcomeCaption,
                auditLog = state.auditLog + scoreEvent
            )
        }

        return state.copy(
            phase = TablePhase.PLAYING_TRICK,
            currentTurn = lastTrick.winner,
            currentTrick = emptyList(),
            latestCaption = "${lastTrick.winner.displayName} leads Book #${state.completedTricks.size + 1}."
        )
    }

    /**
     * Phases in which a hand can no longer be voided: it is already settled, the match is
     * over, it was already voided, or no hand is in progress.
     */
    private val voidRefusedPhases = setOf(
        TablePhase.IDLE,
        TablePhase.HAND_COMPLETE,
        TablePhase.MATCH_COMPLETE,
        TablePhase.VOIDED_HAND
    )

    fun canRequestVoid(state: AuthoritativeState): Boolean = state.phase !in voidRefusedPhases

    /**
     * Audited unanimous void, step 1: a seat asks the table to void the current hand.
     * The request is logged and stays pending until every human seat has consented via
     * [consentToVoid]; AI seats consent implicitly. Never touches concealed cards or scores.
     */
    fun requestVoid(state: AuthoritativeState, seat: Seat, reason: String): AuthoritativeState {
        require(canRequestVoid(state)) {
            "Cannot void Hand #${state.handNumber} in phase ${state.phase}"
        }
        require(state.pendingVoidRequest == null) {
            "A void request by ${state.pendingVoidRequest?.requestedBy} is already pending"
        }
        require(reason.isNotBlank()) { "Void request requires a reason" }

        val implicitAiConsents = Seat.entries.filter { !it.isHuman }.toSet()
        val request = VoidRequest(
            reason = reason.trim(),
            requestedBy = seat,
            consents = implicitAiConsents
        )
        val outstanding = request.outstandingSeats
        val event = AuditEvent(
            sequence = state.auditLog.size + 1,
            phase = state.phase,
            actor = seat.displayName,
            summary = "Void requested for Hand #${state.handNumber}",
            detail = "${request.formatAuditDetail()} Awaiting consent from: " +
                outstanding.joinToString(", ") { it.displayName } + "."
        )
        val caption = "${seat.displayName} requests an audited void ($reason). " +
            "Awaiting ${outstanding.joinToString(", ") { it.displayName }}."
        return state.copy(
            pendingVoidRequest = request,
            latestCaption = caption,
            auditLog = state.auditLog + event
        )
    }

    /**
     * Audited unanimous void, step 2: a seat consents to the pending request. When every
     * human seat has consented the hand is voided; otherwise the request stays pending.
     */
    fun consentToVoid(state: AuthoritativeState, seat: Seat): AuthoritativeState {
        val pending = requireNotNull(state.pendingVoidRequest) {
            "No void request is pending for Hand #${state.handNumber}"
        }
        require(canRequestVoid(state)) {
            "Cannot void Hand #${state.handNumber} in phase ${state.phase}"
        }
        if (seat in pending.consents) return state

        val updated = pending.copy(consents = pending.consents + seat)
        if (updated.isUnanimous) {
            return applyVoid(state, updated)
        }

        val outstanding = updated.outstandingSeats
        val event = AuditEvent(
            sequence = state.auditLog.size + 1,
            phase = state.phase,
            actor = seat.displayName,
            summary = "Consented to void of Hand #${state.handNumber}",
            detail = "${updated.formatAuditDetail()} Still awaiting: " +
                outstanding.joinToString(", ") { it.displayName } + "."
        )
        return state.copy(
            pendingVoidRequest = updated,
            latestCaption = "${seat.displayName} consents to the void. " +
                "Awaiting ${outstanding.joinToString(", ") { it.displayName }}.",
            auditLog = state.auditLog + event
        )
    }

    /**
     * Withdraws a pending void request before it becomes unanimous. Logged like every other
     * void action so the audit trail shows the request was raised and dropped.
     */
    fun withdrawVoidRequest(state: AuthoritativeState, seat: Seat): AuthoritativeState {
        val pending = state.pendingVoidRequest ?: return state
        val event = AuditEvent(
            sequence = state.auditLog.size + 1,
            phase = state.phase,
            actor = seat.displayName,
            summary = "Void request withdrawn for Hand #${state.handNumber}",
            detail = "${pending.formatAuditDetail()} Withdrawn by ${seat.displayName}; play continues."
        )
        return state.copy(
            pendingVoidRequest = null,
            latestCaption = "${seat.displayName} withdrew the void request. Play continues.",
            auditLog = state.auditLog + event
        )
    }

    private fun applyVoid(state: AuthoritativeState, request: VoidRequest): AuthoritativeState {
        check(request.isUnanimous) { "Void applied without unanimous consent" }
        val nextDealer = state.dealer.nextClockwise()
        val outcome = HandOutcome(
            handNumber = state.handNumber,
            contract = state.contract,
            booksWonUs = state.booksWonUs,
            booksWonThem = state.booksWonThem,
            contractMade = false,
            isBoston = false,
            pointsAwardedTo = null,
            pointsDelta = 0,
            wasVoided = true,
            voidReason = request.reason,
            voidRequest = request
        )
        val event = AuditEvent(
            sequence = state.auditLog.size + 1,
            phase = TablePhase.VOIDED_HAND,
            actor = "Authoritative Rules Service",
            summary = "Hand #${state.handNumber} voided (unanimous)",
            detail = "${request.formatAuditDetail()} No points awarded; concealed hands discarded unrevealed; " +
                "next dealer ${nextDealer.displayName}."
        )
        return state.copy(
            phase = TablePhase.VOIDED_HAND,
            pendingVoidRequest = null,
            lastOutcome = outcome,
            latestCaption = "Hand #${state.handNumber} voided by unanimous consent (${request.reason}). Ready for next deal.",
            auditLog = state.auditLog + event
        )
    }

    fun dealNextHand(state: AuthoritativeState, nextSeed: Long = System.currentTimeMillis()): AuthoritativeState {
        return dealHand(
            handNumber = state.handNumber + 1,
            seed = nextSeed,
            dealer = state.dealer.nextClockwise(),
            scoreUs = state.scoreUs,
            scoreThem = state.scoreThem,
            priorLog = state.auditLog
        )
    }

    fun sortHand(hand: List<Card>, trumpSuit: Suit?, direction: BidDirection): List<Card> {
        val suitOrder = mapOf(
            Suit.SPADES to 0,
            Suit.HEARTS to 1,
            Suit.CLUBS to 2,
            Suit.DIAMONDS to 3
        )
        return hand.sortedWith(
            compareByDescending<Card> { it.isJoker }
                .thenByDescending { it.suit != null && it.suit == trumpSuit }
                .thenBy { card ->
                    if (card.isJoker) -1 else suitOrder[card.suit] ?: 4
                }
                .thenByDescending { card ->
                    if (card.rank == Rank.BIG_JOKER) 100
                    else if (card.rank == Rank.LITTLE_JOKER) 99
                    else rankStrength(card.rank, direction)
                }
        )
    }

    /**
     * Projects strictly concealed-safe SeatView for South (human player).
     */
    fun projectSeatView(state: AuthoritativeState, guidedHint: String? = null): SeatView {
        val southHand = state.hands.getValue(Seat.SOUTH)
        val legalIds = if (state.phase == TablePhase.PLAYING_TRICK &&
            state.currentTurn == Seat.SOUTH &&
            state.contract != null
        ) {
            legalCards(southHand, state.currentTrick, state.contract).map { it.id }.toSet()
        } else {
            emptySet()
        }
        return SeatView(
            manifest = manifest,
            handNumber = state.handNumber,
            seed = state.seed,
            phase = state.phase,
            dealer = state.dealer,
            currentTurn = state.currentTurn,
            scoreUs = state.scoreUs,
            scoreThem = state.scoreThem,
            localHand = southHand,
            kittyCardIdsInHand = state.kittyCardIdsRevealedToDeclarer.filter { id ->
                southHand.any { it.id == id }
            }.toSet(),
            legalPlayCardIds = legalIds,
            seatCardCounts = state.hands.mapValues { it.value.size },
            bidHistory = state.bidHistory,
            highestBid = state.highestBid,
            contract = state.contract,
            currentTrick = state.currentTrick,
            completedTricks = state.completedTricks,
            lastTrick = state.completedTricks.lastOrNull(),
            booksWonUs = state.booksWonUs,
            booksWonThem = state.booksWonThem,
            lastOutcome = state.lastOutcome,
            seatCaptions = state.seatCaptions,
            latestCaption = state.latestCaption,
            auditLog = state.auditLog,
            isBetweenHandPaused = state.isBetweenHandPaused,
            pendingVoidRequest = state.pendingVoidRequest,
            canRequestVoid = canRequestVoid(state),
            guidedHint = guidedHint
        )
    }

    /**
     * Projects strictly concealed-safe AiSeatObservation for an AI seat.
     */
    fun projectAiObservation(state: AuthoritativeState, seat: Seat): AiSeatObservation {
        val isDealerForced = seat == state.dealer && state.bidHistory.size == 3 && state.highestBid == null
        return AiSeatObservation(
            seat = seat,
            dealer = state.dealer,
            ownHand = state.hands.getValue(seat),
            bidHistory = state.bidHistory,
            highestBid = state.highestBid,
            contract = state.contract,
            currentTrick = state.currentTrick,
            completedTricks = state.completedTricks,
            isDealerForcedToBid = isDealerForced
        )
    }
}
