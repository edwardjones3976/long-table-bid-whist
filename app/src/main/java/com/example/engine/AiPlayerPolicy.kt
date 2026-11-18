package com.example.engine

/**
 * Deterministic, fair AI seat policy operating strictly on AiSeatObservation.
 * Has zero access to concealed opponent/partner hands or the unseen kitty.
 */
class AiPlayerPolicy(
    private val engine: BidWhistRulesEngine
) {
    data class TrumpPlan(
        val trumpSuit: Suit?,
        val direction: BidDirection,
        val expectedTricks: Double
    )

    fun chooseBid(obs: AiSeatObservation, tone: TableTalkTone): Pair<BidAction, String> {
        val bestPlan = evaluateBestPlan(obs.ownHand)
        val estimatedBid = when {
            bestPlan.expectedTricks >= 12.2 -> 7
            bestPlan.expectedTricks >= 10.6 -> 6
            bestPlan.expectedTricks >= 9.3 -> 5
            bestPlan.expectedTricks >= 8.1 -> 4
            else -> 0
        }

        if (obs.isDealerForcedToBid) {
            val forcedBid = BidAction.Bid(
                booksOverSix = maxOf(4, estimatedBid),
                isNoTrump = bestPlan.trumpSuit == null,
                direction = bestPlan.direction
            )
            val line = toneLine(
                tone = tone,
                quiet = "${obs.seat.displayName} takes the forced dealer bid at ${forcedBid.formatShort()}.",
                social = "Alright table, dealer takes it at ${forcedBid.formatShort()}.",
                lively = "Dealer's stuck — let's make ${forcedBid.formatShort()} work!"
            )
            return forcedBid to line
        }

        if (estimatedBid >= 4) {
            val candidate = BidAction.Bid(
                booksOverSix = estimatedBid,
                isNoTrump = bestPlan.trumpSuit == null,
                direction = bestPlan.direction
            )
            val currentHigh = obs.highestBid?.action as? BidAction.Bid
            if (currentHigh == null || engine.isBidHigher(candidate, currentHigh)) {
                val line = toneLine(
                    tone = tone,
                    quiet = "${obs.seat.displayName} bids ${candidate.formatShort()}.",
                    social = "I'll bid ${candidate.formatShort()}.",
                    lively = "Put me down for ${candidate.formatShort()}!"
                )
                return candidate to line
            }
        }

        val passLine = toneLine(
            tone = tone,
            quiet = "${obs.seat.displayName} passes.",
            social = "I'll pass and support the table.",
            lively = "Too light for me — I'm passing."
        )
        return BidAction.Pass to passLine
    }

    fun chooseTrumpAndDirection(obs: AiSeatObservation): Pair<Suit?, BidDirection> {
        val plan = evaluateBestPlan(obs.ownHand)
        return plan.trumpSuit to plan.direction
    }

    fun chooseSixDiscards(obs: AiSeatObservation): Set<String> {
        val contract = requireNotNull(obs.contract)
        // Rank cards by retention value: keep Jokers, trumps, Aces, and strong connectors
        val rankedForDiscard = obs.ownHand.sortedBy { card ->
            var keepScore = 0
            if (card.isJoker) keepScore += 1000
            if (card.suit != null && card.suit == contract.trumpSuit) {
                keepScore += 400 + engine.rankStrength(card.rank, contract.direction)
            } else {
                keepScore += engine.rankStrength(card.rank, contract.direction) * 4
                // Slight bonus for Aces and Kings/Twos depending on direction
                if (card.rank == Rank.ACE) keepScore += 80
            }
            keepScore
        }
        return rankedForDiscard.take(engine.manifest.kittySize).map { it.id }.toSet()
    }

    fun chooseCardToPlay(obs: AiSeatObservation, tone: TableTalkTone): Pair<Card, String> {
        val contract = requireNotNull(obs.contract)
        val legal = engine.legalCards(obs.ownHand, obs.currentTrick, contract)
        if (legal.size == 1) {
            val only = legal.first()
            return only to "${obs.seat.displayName} plays ${only.accessibleDescription}."
        }

        val chosen = if (obs.currentTrick.isEmpty()) {
            chooseLeadCard(legal, contract)
        } else {
            chooseFollowCard(obs.seat, legal, obs.currentTrick, contract)
        }

        val caption = when {
            chosen.isJoker && contract.trumpSuit != null -> toneLine(
                tone = tone,
                quiet = "${obs.seat.displayName} plays ${chosen.rank.fullName}.",
                social = "${obs.seat.displayName} drops the ${chosen.rank.fullName}.",
                lively = "Watch out — ${chosen.rank.fullName} on the felt!"
            )
            obs.currentTrick.isEmpty() -> "${obs.seat.displayName} leads ${chosen.accessibleDescription}."
            else -> "${obs.seat.displayName} plays ${chosen.accessibleDescription}."
        }
        return chosen to caption
    }

    fun generateCoachHint(view: SeatView): String? {
        return when (view.phase) {
            TablePhase.BIDDING -> {
                val plan = evaluateBestPlan(view.localHand)
                val trumpDesc = plan.trumpSuit?.label ?: "No-Trump"
                val suggested = when {
                    plan.expectedTricks >= 10.5 -> "Strong hand (~${plan.expectedTricks.toInt()} books in ${plan.direction.label} $trumpDesc). Consider bidding 5 or 6."
                    plan.expectedTricks >= 8.2 -> "Solid ${plan.direction.label} $trumpDesc shape. A 4 bid is reasonable, or pass to let partner bid."
                    else -> "Light distribution — passing protects your partnership from a set."
                }
                suggested
            }
            TablePhase.SELECT_TRUMP -> {
                val plan = evaluateBestPlan(view.localHand)
                val label = plan.trumpSuit?.label ?: "No-Trump"
                "Best fit from your 12 cards: $label (${plan.direction.label})."
            }
            TablePhase.KITTY_DISCARD -> {
                "Tip: Keep Jokers, trumps, and Aces. Discard weak cards from short side suits to create voids."
            }
            TablePhase.PLAYING_TRICK -> {
                val contract = view.contract ?: return null
                if (view.currentTrick.isEmpty()) {
                    "You have the lead. Pulling trumps early or cashing Aces sets the pace."
                } else {
                    val ledSuit = engine.effectiveSuit(view.currentTrick.first().card, contract)
                    if (ledSuit != null && view.legalPlayCardIds.size < view.localHand.size) {
                        "Must follow ${ledSuit.symbol} ${ledSuit.label}. Dimmed cards are locked by house rules."
                    } else {
                        val winningSeat = currentWinningSeat(view.currentTrick, contract)
                        if (winningSeat == Seat.NORTH) {
                            "Partner Ms. Evelyn currently holds this book — a low slough saves your high cards."
                        } else {
                            "Opponents currently hold this book — play your strongest winner or trump if void."
                        }
                    }
                }
            }
            else -> null
        }
    }

    private fun chooseLeadCard(legal: List<Card>, contract: Contract): Card {
        // Lead highest trump if holding Jokers/Ace, else highest off-suit winner
        val highTrump = legal
            .filter { engine.effectiveSuit(it, contract) == contract.trumpSuit }
            .maxByOrNull { engine.cardStrength(it, contract.trumpSuit, contract) }
        if (contract.trumpSuit != null && highTrump != null && (highTrump.isJoker || highTrump.rank == Rank.ACE)) {
            return highTrump
        }
        return legal.maxBy { card ->
            val suitBonus = if (card.suit == contract.trumpSuit) -50 else 50
            engine.rankStrength(card.rank, contract.direction) + suitBonus
        }
    }

    private fun chooseFollowCard(
        seat: Seat,
        legal: List<Card>,
        currentTrick: List<PlayedCard>,
        contract: Contract
    ): Card {
        val ledSuit = engine.effectiveSuit(currentTrick.first().card, contract)
        val currentWinner = currentWinningSeat(currentTrick, contract)
        val currentBestStrength = currentTrick.maxOf {
            engine.cardStrength(it.card, ledSuit, contract)
        }

        // If partner is winning and either we're last seat or partner played strong, duck cheaply
        if (currentWinner == seat.partner() && (currentTrick.size == 3 || currentBestStrength >= 113)) {
            return legal.minBy { engine.cardStrength(it, ledSuit, contract) }
        }

        // Try to win with the cheapest card that beats currentBestStrength
        val beatingCards = legal.filter {
            engine.cardStrength(it, ledSuit, contract) > currentBestStrength
        }
        if (beatingCards.isNotEmpty()) {
            return beatingCards.minBy { engine.cardStrength(it, ledSuit, contract) }
        }

        // Cannot beat: throw lowest-value card (avoid throwing Jokers/Aces if possible)
        return legal.minBy { card ->
            var throwCost = engine.cardStrength(card, ledSuit, contract)
            if (card.isJoker) throwCost += 2000
            if (card.suit == contract.trumpSuit) throwCost += 500
            if (card.rank == Rank.ACE) throwCost += 200
            throwCost
        }
    }

    private fun currentWinningSeat(trick: List<PlayedCard>, contract: Contract): Seat {
        val ledSuit = engine.effectiveSuit(trick.first().card, contract)
        return trick.maxBy { engine.cardStrength(it.card, ledSuit, contract) }.seat
    }

    fun evaluateBestPlan(hand: List<Card>): TrumpPlan {
        val jokers = hand.count { it.isJoker }
        val candidates = mutableListOf<TrumpPlan>()

        for (direction in BidDirection.entries) {
            for (suit in Suit.entries) {
                val suitCards = hand.filter { it.suit == suit }
                val highCards = suitCards.count { engine.rankStrength(it.rank, direction) >= 12 }
                val offSuitWinners = hand.count {
                    !it.isJoker && it.suit != suit && engine.rankStrength(it.rank, direction) >= 13
                }
                // Include baseline expected partner help (~3.2 books) + kitty potential (~1.2)
                val estimate = 4.2 + jokers * 0.95 + suitCards.size * 0.68 + highCards * 0.45 + offSuitWinners * 0.65
                candidates += TrumpPlan(suit, direction, estimate)
            }
            // No-Trump evaluation (Jokers do not win tricks)
            val acesAndHigh = hand.count { !it.isJoker && engine.rankStrength(it.rank, direction) >= 13 }
            val mediumWinners = hand.count { !it.isJoker && engine.rankStrength(it.rank, direction) == 12 }
            val ntEstimate = 3.8 + acesAndHigh * 1.15 + mediumWinners * 0.45
            candidates += TrumpPlan(null, direction, ntEstimate)
        }

        return candidates.maxBy { it.expectedTricks }
    }

    private fun toneLine(tone: TableTalkTone, quiet: String, social: String, lively: String): String {
        return when (tone) {
            TableTalkTone.QUIET -> quiet
            TableTalkTone.SOCIAL -> social
            TableTalkTone.LIVELY -> lively
        }
    }
}
