package com.example.engine

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test

class BidWhistRulesEngineTest {

    private val engine = BidWhistRulesEngine()

    @Test
    fun dealHand_produces54UniqueCardsAcrossFourSeatsAndKitty() {
        val state = engine.startNewMatch(initialSeed = 42L)
        val allSeatCards = state.hands.values.flatten()
        assertEquals(12, state.hands.getValue(Seat.SOUTH).size)
        assertEquals(12, state.hands.getValue(Seat.WEST).size)
        assertEquals(12, state.hands.getValue(Seat.NORTH).size)
        assertEquals(12, state.hands.getValue(Seat.EAST).size)
        assertEquals(6, state.kitty.size)

        val combinedIds = (allSeatCards + state.kitty).map { it.id }.toSet()
        assertEquals(54, combinedIds.size)
    }

    @Test
    fun bidding_forcesDealerMinBidWhenFirstThreePass() {
        var state = engine.startNewMatch(initialSeed = 7L)
        // Dealer is EAST; bidding opens at SOUTH -> WEST -> NORTH -> EAST
        state = engine.submitBid(state, Seat.SOUTH, BidAction.Pass)
        state = engine.submitBid(state, Seat.WEST, BidAction.Pass)
        state = engine.submitBid(state, Seat.NORTH, BidAction.Pass)

        assertFalse(engine.isBidValid(state, Seat.EAST, BidAction.Pass))
        assertTrue(engine.isBidValid(state, Seat.EAST, BidAction.Bid(4, isNoTrump = false, direction = BidDirection.UPTOWN)))

        state = engine.submitBid(state, Seat.EAST, BidAction.Bid(4, isNoTrump = false, direction = BidDirection.UPTOWN))
        assertEquals(TablePhase.SELECT_TRUMP, state.phase)
        assertEquals(Seat.EAST, state.currentTurn)
    }

    @Test
    fun downtownRanking_placesAceTopThenTwoAboveKing_andJokersHighestInTrump() {
        val contract = Contract(
            declarer = Seat.SOUTH,
            booksOverSix = 4,
            trumpSuit = Suit.SPADES,
            direction = BidDirection.DOWNTOWN
        )
        val trick = listOf(
            PlayedCard(Seat.SOUTH, Card("SPADES_KING", Suit.SPADES, Rank.KING)),
            PlayedCard(Seat.WEST, Card("SPADES_TWO", Suit.SPADES, Rank.TWO)),
            PlayedCard(Seat.NORTH, Card("SPADES_ACE", Suit.SPADES, Rank.ACE)),
            PlayedCard(Seat.EAST, Card("JOKER_LITTLE", null, Rank.LITTLE_JOKER))
        )
        assertEquals(Seat.EAST, engine.determineTrickWinner(trick, contract))

        val offSuitTrick = listOf(
            PlayedCard(Seat.SOUTH, Card("HEARTS_KING", Suit.HEARTS, Rank.KING)),
            PlayedCard(Seat.WEST, Card("HEARTS_TWO", Suit.HEARTS, Rank.TWO)),
            PlayedCard(Seat.NORTH, Card("HEARTS_TEN", Suit.HEARTS, Rank.TEN)),
            PlayedCard(Seat.EAST, Card("CLUBS_ACE", Suit.CLUBS, Rank.ACE))
        )
        assertEquals(Seat.WEST, engine.determineTrickWinner(offSuitTrick, contract))
    }

    @Test
    fun noTrump_jokersCannotWinTrick() {
        val contract = Contract(
            declarer = Seat.SOUTH,
            booksOverSix = 5,
            trumpSuit = null,
            direction = BidDirection.UPTOWN
        )
        val trick = listOf(
            PlayedCard(Seat.SOUTH, Card("DIAMONDS_THREE", Suit.DIAMONDS, Rank.THREE)),
            PlayedCard(Seat.WEST, Card("JOKER_BIG", null, Rank.BIG_JOKER)),
            PlayedCard(Seat.NORTH, Card("DIAMONDS_TWO", Suit.DIAMONDS, Rank.TWO)),
            PlayedCard(Seat.EAST, Card("CLUBS_ACE", Suit.CLUBS, Rank.ACE))
        )
        assertEquals(Seat.SOUTH, engine.determineTrickWinner(trick, contract))
    }

    @Test
    fun followSuit_restrictsLegalCardsWhenLedSuitIsHeld() {
        val contract = Contract(
            declarer = Seat.SOUTH,
            booksOverSix = 4,
            trumpSuit = Suit.SPADES,
            direction = BidDirection.UPTOWN
        )
        val hand = listOf(
            Card("HEARTS_ACE", Suit.HEARTS, Rank.ACE),
            Card("CLUBS_KING", Suit.CLUBS, Rank.KING),
            Card("JOKER_BIG", null, Rank.BIG_JOKER)
        )
        val trickLeadingSpade = listOf(PlayedCard(Seat.WEST, Card("SPADES_TEN", Suit.SPADES, Rank.TEN)))
        val legalOnSpade = engine.legalCards(hand, trickLeadingSpade, contract)
        assertEquals(listOf("JOKER_BIG"), legalOnSpade.map { it.id })
    }

    @Test
    fun concealedBoundary_seatViewAndAiObservationIsolateHiddenCards() {
        val state = engine.startNewMatch(initialSeed = 99L)
        val southView = engine.projectSeatView(state)
        val westObs = engine.projectAiObservation(state, Seat.WEST)

        val southIds = southView.localHand.map { it.id }.toSet()
        val westIds = westObs.ownHand.map { it.id }.toSet()

        assertTrue(southIds.intersect(westIds).isEmpty())
        assertTrue(southView.kittyCardIdsInHand.isEmpty())
    }

    // ---- Audited unanimous void (F-04 / F-05) ----

    /** Plays Hand #1 of a fresh match to completion: South bids 4 Spades Uptown, all AI seats pass. */
    private fun playHandToCompletion(seed: Long): BidWhistRulesEngine.AuthoritativeState {
        var state = engine.startNewMatch(initialSeed = seed)
        state = engine.submitBid(state, Seat.SOUTH, BidAction.Bid(4, isNoTrump = false, direction = BidDirection.UPTOWN))
        state = engine.submitBid(state, Seat.WEST, BidAction.Pass)
        state = engine.submitBid(state, Seat.NORTH, BidAction.Pass)
        state = engine.submitBid(state, Seat.EAST, BidAction.Pass)
        assertEquals(TablePhase.SELECT_TRUMP, state.phase)
        state = engine.selectTrumpAndPickUpKitty(state, Seat.SOUTH, Suit.SPADES, BidDirection.UPTOWN)
        val discards = state.hands.getValue(Seat.SOUTH).takeLast(6).map { it.id }.toSet()
        state = engine.submitKittyDiscard(state, Seat.SOUTH, discards)
        while (state.phase == TablePhase.PLAYING_TRICK || state.phase == TablePhase.TRICK_COMPLETE) {
            state = if (state.phase == TablePhase.TRICK_COMPLETE) {
                engine.collectCompletedTrick(state)
            } else {
                val seat = state.currentTurn
                val legal = engine.legalCards(state.hands.getValue(seat), state.currentTrick, requireNotNull(state.contract))
                engine.playCard(state, seat, legal.first().id)
            }
        }
        return state
    }

    private fun assertVoidRefused(state: BidWhistRulesEngine.AuthoritativeState) {
        assertFalse(engine.canRequestVoid(state))
        try {
            engine.requestVoid(state, Seat.SOUTH, "Too late")
            fail("Expected void request to be refused in ${state.phase}")
        } catch (expected: IllegalArgumentException) {
            assertTrue(expected.message.orEmpty().contains(state.phase.name))
        }
    }

    @Test
    fun voidRequest_isRefusedOnceHandIsComplete() {
        val completed = playHandToCompletion(seed = 1234L)
        assertEquals(TablePhase.HAND_COMPLETE, completed.phase)
        val scoreUsBefore = completed.scoreUs
        val scoreThemBefore = completed.scoreThem

        assertVoidRefused(completed)
        assertEquals(scoreUsBefore, completed.scoreUs)
        assertEquals(scoreThemBefore, completed.scoreThem)
        assertNull(completed.pendingVoidRequest)
        assertFalse(engine.projectSeatView(completed).canRequestVoid)
    }

    @Test
    fun voidRequest_isRefusedInMatchCompleteVoidedAndIdle() {
        val base = engine.startNewMatch(initialSeed = 5L)
        assertVoidRefused(base.copy(phase = TablePhase.MATCH_COMPLETE))
        assertVoidRefused(base.copy(phase = TablePhase.VOIDED_HAND))
        assertVoidRefused(base.copy(phase = TablePhase.IDLE))
    }

    @Test
    fun voidRequest_staysPendingUntilHumanSeatConsents() {
        val dealt = engine.startNewMatch(initialSeed = 77L)
        assertTrue(engine.canRequestVoid(dealt))

        val requested = engine.requestVoid(dealt, Seat.SOUTH, "Misdeal spotted")
        val pending = requireNotNull(requested.pendingVoidRequest)
        assertEquals(TablePhase.BIDDING, requested.phase)
        assertEquals(Seat.SOUTH, pending.requestedBy)
        assertEquals("Misdeal spotted", pending.reason)
        // AI seats consent implicitly; the human seat has not yet consented.
        assertEquals(setOf(Seat.WEST, Seat.NORTH, Seat.EAST), pending.consents)
        assertEquals(setOf(Seat.SOUTH), pending.outstandingSeats)
        assertFalse(pending.isUnanimous)
        assertNull(requested.lastOutcome)
        // Concealed state and the deal are untouched while the request is pending.
        assertEquals(dealt.hands, requested.hands)
        assertEquals(dealt.kitty, requested.kitty)
        assertEquals(pending, engine.projectSeatView(requested).pendingVoidRequest)

        val voided = engine.consentToVoid(requested, Seat.SOUTH)
        assertEquals(TablePhase.VOIDED_HAND, voided.phase)
        assertNull(voided.pendingVoidRequest)
        val outcome = requireNotNull(voided.lastOutcome)
        assertTrue(outcome.wasVoided)
        assertEquals("Misdeal spotted", outcome.voidReason)
        assertNull(outcome.contract) // no contract existed; nothing is fabricated
        assertNull(outcome.pointsAwardedTo)
        assertEquals(0, outcome.pointsDelta)
        assertFalse(outcome.contractMade)
        assertEquals(Seat.entries.toSet(), requireNotNull(outcome.voidRequest).consents)
    }

    @Test
    fun void_auditDetailRecordsRequesterConsentsAndReason() {
        val dealt = engine.startNewMatch(initialSeed = 77L)
        val requested = engine.requestVoid(dealt, Seat.SOUTH, "Misdeal spotted")
        val requestEvent = requested.auditLog.last()
        assertEquals("South", requestEvent.actor)
        assertEquals(TablePhase.BIDDING, requestEvent.phase)
        assertTrue(requestEvent.detail, requestEvent.detail.contains("Requested by South"))
        assertTrue(requestEvent.detail, requestEvent.detail.contains("Reason: Misdeal spotted"))
        assertTrue(requestEvent.detail, requestEvent.detail.contains("Awaiting consent from: South"))

        val voided = engine.consentToVoid(requested, Seat.SOUTH)
        val voidEvent = voided.auditLog.last()
        assertEquals(TablePhase.VOIDED_HAND, voidEvent.phase)
        assertEquals(requested.auditLog.size + 1, voidEvent.sequence)
        assertTrue(voidEvent.detail, voidEvent.detail.contains("Requested by South"))
        assertTrue(voidEvent.detail, voidEvent.detail.contains("Reason: Misdeal spotted"))
        for (seat in Seat.entries) {
            assertTrue(voidEvent.detail, voidEvent.detail.contains(seat.displayName))
        }
        assertTrue(voidEvent.detail, voidEvent.detail.contains("(AI, implicit)"))
        assertTrue(voidEvent.detail, voidEvent.detail.contains("No points awarded"))
    }

    @Test
    fun void_neverChangesScoresAndKeepsAgreedContract() {
        var state = engine.startNewMatch(initialSeed = 4242L).copy(scoreUs = 3, scoreThem = 5)
        state = engine.submitBid(state, Seat.SOUTH, BidAction.Bid(5, isNoTrump = false, direction = BidDirection.DOWNTOWN))
        state = engine.submitBid(state, Seat.WEST, BidAction.Pass)
        state = engine.submitBid(state, Seat.NORTH, BidAction.Pass)
        state = engine.submitBid(state, Seat.EAST, BidAction.Pass)
        state = engine.selectTrumpAndPickUpKitty(state, Seat.SOUTH, Suit.HEARTS, BidDirection.DOWNTOWN)
        val agreedContract = requireNotNull(state.contract)

        val requested = engine.requestVoid(state, Seat.SOUTH, "Phone rang, table agreed to redeal")
        val voided = engine.consentToVoid(requested, Seat.SOUTH)

        assertEquals(3, voided.scoreUs)
        assertEquals(5, voided.scoreThem)
        val outcome = requireNotNull(voided.lastOutcome)
        assertEquals(agreedContract, outcome.contract)
        assertNull(outcome.pointsAwardedTo)
        assertEquals(0, outcome.pointsDelta)

        // The next deal carries the scores forward unchanged and rotates the dealer.
        val next = engine.dealNextHand(voided, nextSeed = 9L)
        assertEquals(3, next.scoreUs)
        assertEquals(5, next.scoreThem)
        assertEquals(2, next.handNumber)
        assertEquals(Seat.SOUTH, next.dealer)
        assertNull(next.pendingVoidRequest)
    }

    @Test
    fun void_consentWithoutPendingRequestIsRefused_andWithdrawClearsRequest() {
        val dealt = engine.startNewMatch(initialSeed = 11L)
        try {
            engine.consentToVoid(dealt, Seat.SOUTH)
            fail("Expected consent without a pending request to be refused")
        } catch (expected: IllegalArgumentException) {
            // ok
        }

        val requested = engine.requestVoid(dealt, Seat.SOUTH, "Checking the rules")
        // A second request while one is pending is refused.
        try {
            engine.requestVoid(requested, Seat.SOUTH, "Again")
            fail("Expected duplicate void request to be refused")
        } catch (expected: IllegalArgumentException) {
            // ok
        }
        // An already-consenting seat re-consenting is a no-op.
        assertEquals(requested, engine.consentToVoid(requested, Seat.WEST))

        val withdrawn = engine.withdrawVoidRequest(requested, Seat.SOUTH)
        assertNull(withdrawn.pendingVoidRequest)
        assertEquals(TablePhase.BIDDING, withdrawn.phase)
        assertNull(withdrawn.lastOutcome)
        assertTrue(withdrawn.auditLog.last().summary.contains("withdrawn"))
        // Bidding continues normally after a withdrawn request.
        assertTrue(engine.isBidValid(withdrawn, Seat.SOUTH, BidAction.Pass))
    }
}
