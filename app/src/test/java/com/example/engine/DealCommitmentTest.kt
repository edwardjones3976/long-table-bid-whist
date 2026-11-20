package com.example.engine

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.random.Random

/** Codex decision D-05: a public pre-deal commitment, revealed and verifiable once the hand is scored. */
class DealCommitmentTest {

    private val engine = BidWhistRulesEngine()
    private val nonceA = "0123456789abcdef0123456789abcdef"
    private val nonceB = "fedcba9876543210fedcba9876543210"

    @Test
    fun commitment_isDeterministic_andSensitiveToEveryInput() {
        val base = DealCommitmentHasher.commit("strict-table-v1.0.0", 1, 42L, nonceA)
        assertEquals(64, base.length)
        assertTrue(base.all { it in "0123456789abcdef" })
        assertEquals(base, DealCommitmentHasher.commit("strict-table-v1.0.0", 1, 42L, nonceA))
        assertNotEquals(base, DealCommitmentHasher.commit("strict-table-v1.0.0", 2, 42L, nonceA))
        assertNotEquals(base, DealCommitmentHasher.commit("strict-table-v1.0.0", 1, 43L, nonceA))
        assertNotEquals(base, DealCommitmentHasher.commit("strict-table-v1.0.0", 1, 42L, nonceB))
        assertNotEquals(base, DealCommitmentHasher.commit("other-preset", 1, 42L, nonceA))
    }

    @Test
    fun commitment_matchesAnIndependentSha256OfTheCanonicalString() {
        // Pin the canonical form so a C# port can reproduce it byte for byte.
        val canonical = "strict-table-v1.0.0|hand=7|seed=-99|nonce=$nonceA"
        val expected = java.security.MessageDigest.getInstance("SHA-256")
            .digest(canonical.toByteArray(Charsets.UTF_8))
            .joinToString("") { "%02x".format(it) }
        assertEquals(expected, DealCommitmentHasher.commit("strict-table-v1.0.0", 7, -99L, nonceA))
    }

    @Test
    fun nonce_isValidated_andFreshNoncesDiffer() {
        val refused = runCatching { DealCommitmentHasher.commit("strict-table-v1.0.0", 1, 1L, "abc") }
        assertTrue(refused.exceptionOrNull() is IllegalArgumentException)
        val upper = runCatching { DealCommitmentHasher.commit("strict-table-v1.0.0", 1, 1L, nonceA.uppercase()) }
        assertTrue(upper.exceptionOrNull() is IllegalArgumentException)

        val fresh = (1..20).map { DealCommitmentHasher.newNonceHex() }
        assertEquals(20, fresh.toSet().size)
        fresh.forEach { assertEquals(32, it.length) }
    }

    @Test
    fun deal_publishesCommitmentButNoReveal_untilScored() {
        val state = engine.startNewMatch(initialSeed = 4242L, dealNonceHex = nonceA)
        val view = engine.projectSeatView(state)

        assertEquals(1, view.dealCommitment.handNumber)
        assertEquals(DealCommitmentHasher.commit(engine.manifest.version, 1, 4242L, nonceA), view.dealCommitment.commitmentHex)
        assertTrue(view.auditLog.first().detail.contains(view.dealCommitment.commitmentHex))
        assertNull(view.dealReveal)

        // Neither the seed nor the nonce appears anywhere the seat can see before scoring.
        val forbidden = listOf("4242", nonceA)
        for (event in view.auditLog) {
            for (secret in forbidden) {
                assertFalse("audit leaks $secret: ${event.detail}", event.detail.contains(secret))
                assertFalse(event.summary.contains(secret))
            }
        }
        assertFalse(view.latestCaption.contains(nonceA))
    }

    @Test
    fun scoredHand_revealsSeedAndNonce_thatVerifyAndReproduceTheDeal() {
        val seed = 777L
        var state = engine.startNewMatch(initialSeed = seed, dealNonceHex = nonceA)
        val dealtSouth = state.hands.getValue(Seat.SOUTH).map { it.id }.toSet()
        val commitment = state.dealCommitment

        state = playToCompletion(state)
        assertEquals(TablePhase.HAND_COMPLETE, state.phase)

        val view = engine.projectSeatView(state)
        val reveal = requireNotNull(view.dealReveal)
        assertEquals(seed, reveal.seed)
        assertEquals(nonceA, reveal.nonceHex)
        assertEquals(commitment, view.dealCommitment)
        assertTrue(DealCommitmentHasher.verify(engine.manifest.version, view.dealCommitment, reveal))

        // A client re-derives the shuffle from the revealed seed and checks its own dealt cards.
        val rebuilt = engine.createStandardDeck().shuffled(Random(reveal.seed))
        assertEquals(dealtSouth, rebuilt.subList(0, 12).map { it.id }.toSet())

        val revealEvent = view.auditLog.last()
        assertEquals("Deal revealed for verification", revealEvent.summary)
        assertTrue(revealEvent.detail.contains(seed.toString()))
        assertTrue(revealEvent.detail.contains(nonceA))
        assertTrue(revealEvent.detail.contains(commitment.commitmentHex))
        view.auditLog.forEachIndexed { index, event -> assertEquals(index + 1, event.sequence) }
    }

    @Test
    fun tamperedRevealDoesNotVerify() {
        var state = engine.startNewMatch(initialSeed = 777L, dealNonceHex = nonceA)
        state = playToCompletion(state)
        val view = engine.projectSeatView(state)
        val reveal = requireNotNull(view.dealReveal)

        assertFalse(DealCommitmentHasher.verify(engine.manifest.version, view.dealCommitment, reveal.copy(seed = 778L)))
        assertFalse(DealCommitmentHasher.verify(engine.manifest.version, view.dealCommitment, reveal.copy(nonceHex = nonceB)))
        assertFalse(DealCommitmentHasher.verify(engine.manifest.version, view.dealCommitment, reveal.copy(handNumber = 2)))
        assertFalse(DealCommitmentHasher.verify(engine.manifest.version, view.dealCommitment.copy(commitmentHex = "00".repeat(32)), reveal))
    }

    @Test
    fun voidedHand_neverReveals_andNextHandHasAFreshCommitment() {
        val first = engine.startNewMatch(initialSeed = 10L, dealNonceHex = nonceA)
        val voided = engine.consentToVoid(engine.requestVoid(first, Seat.SOUTH, "Misdeal"), Seat.SOUTH)
        assertEquals(TablePhase.VOIDED_HAND, voided.phase)
        val voidedView = engine.projectSeatView(voided)
        assertNull(voidedView.dealReveal)
        for (event in voidedView.auditLog) {
            assertFalse(event.detail.contains(nonceA))
        }

        val next = engine.dealNextHand(voided, nextSeed = 11L, dealNonceHex = nonceB)
        val nextView = engine.projectSeatView(next)
        assertEquals(2, nextView.dealCommitment.handNumber)
        assertNotEquals(first.dealCommitment.commitmentHex, nextView.dealCommitment.commitmentHex)
        assertNull(nextView.dealReveal)
        // The voided hand's seed stays private even in the carried-forward audit log.
        for (event in nextView.auditLog) {
            assertFalse(event.detail.contains("seed 10"))
        }
    }

    @Test
    fun liveDefaults_produceUnpredictableSeedsAndNonces() {
        val seeds = (1..10).map { engine.newSeed() }.toSet()
        assertTrue(seeds.size >= 9)
        val a = engine.startNewMatch()
        val b = engine.startNewMatch()
        assertNotEquals(a.dealCommitment.commitmentHex, b.dealCommitment.commitmentHex)
    }

    /** South bids 4 Spades Uptown, the rest pass; every seat then plays its first legal card. */
    private fun playToCompletion(start: BidWhistRulesEngine.AuthoritativeState): BidWhistRulesEngine.AuthoritativeState {
        var state = start
        state = engine.submitBid(state, Seat.SOUTH, BidAction.Bid(4, isNoTrump = false, direction = BidDirection.UPTOWN))
        state = engine.submitBid(state, Seat.WEST, BidAction.Pass)
        state = engine.submitBid(state, Seat.NORTH, BidAction.Pass)
        state = engine.submitBid(state, Seat.EAST, BidAction.Pass)
        state = engine.selectTrumpAndPickUpKitty(state, Seat.SOUTH, Suit.SPADES)
        state = engine.submitKittyDiscard(state, Seat.SOUTH, state.hands.getValue(Seat.SOUTH).takeLast(6).map { it.id }.toSet())
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
}
