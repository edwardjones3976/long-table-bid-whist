package com.example.engine

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
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
}
