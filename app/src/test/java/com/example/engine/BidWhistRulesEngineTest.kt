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

    // --- Codex F-02 / D-02: a Joker led in No-Trump ---

    private val noTrumpContract = Contract(
        declarer = Seat.SOUTH,
        booksOverSix = 5,
        trumpSuit = null,
        direction = BidDirection.UPTOWN
    )

    private val spadesContract = Contract(
        declarer = Seat.SOUTH,
        booksOverSix = 4,
        trumpSuit = Suit.SPADES,
        direction = BidDirection.UPTOWN
    )

    private val littleJoker = Card("JOKER_LITTLE", null, Rank.LITTLE_JOKER)
    private val bigJoker = Card("JOKER_BIG", null, Rank.BIG_JOKER)

    @Test
    fun noTrump_ledJokerLosesToFirstNonJoker() {
        // LJ (South lead), A♣, K♣, A♥ -> the first non-Joker sets clubs; A♣ wins.
        val trick = listOf(
            PlayedCard(Seat.SOUTH, littleJoker),
            PlayedCard(Seat.WEST, Card("CLUBS_ACE", Suit.CLUBS, Rank.ACE)),
            PlayedCard(Seat.NORTH, Card("CLUBS_KING", Suit.CLUBS, Rank.KING)),
            PlayedCard(Seat.EAST, Card("HEARTS_ACE", Suit.HEARTS, Rank.ACE))
        )
        assertEquals(Suit.CLUBS, engine.governingSuit(trick, noTrumpContract))
        assertEquals(Seat.WEST, engine.determineTrickWinner(trick, noTrumpContract))
    }

    @Test
    fun noTrump_ledJokerLosesEvenToLowestCard_andBothJokersLose() {
        // LJ led, then 3♥ sets hearts; 2♣ is off-suit and BJ is a Joker -> 3♥ wins.
        val trick = listOf(
            PlayedCard(Seat.SOUTH, littleJoker),
            PlayedCard(Seat.WEST, Card("HEARTS_THREE", Suit.HEARTS, Rank.THREE)),
            PlayedCard(Seat.NORTH, Card("CLUBS_TWO", Suit.CLUBS, Rank.TWO)),
            PlayedCard(Seat.EAST, bigJoker)
        )
        assertEquals(Seat.WEST, engine.determineTrickWinner(trick, noTrumpContract))
    }

    @Test
    fun noTrump_afterLedJokerFirstNonJokerSetsSuitToFollow() {
        val hand = listOf(
            Card("SPADES_ACE", Suit.SPADES, Rank.ACE),
            Card("DIAMONDS_NINE", Suit.DIAMONDS, Rank.NINE),
            Card("DIAMONDS_TWO", Suit.DIAMONDS, Rank.TWO),
            bigJoker
        )

        // Second seat: nothing governs yet, any card may be played.
        val jokerOnly = listOf(PlayedCard(Seat.WEST, littleJoker))
        assertEquals(null, engine.governingSuit(jokerOnly, noTrumpContract))
        assertEquals(hand.map { it.id }, engine.legalCards(hand, jokerOnly, noTrumpContract).map { it.id })

        // Third seat: LJ then 5♦ -> diamonds govern; a player holding diamonds must follow.
        val jokerThenDiamond = jokerOnly + PlayedCard(Seat.NORTH, Card("DIAMONDS_FIVE", Suit.DIAMONDS, Rank.FIVE))
        assertEquals(Suit.DIAMONDS, engine.governingSuit(jokerThenDiamond, noTrumpContract))
        assertEquals(
            listOf("DIAMONDS_NINE", "DIAMONDS_TWO"),
            engine.legalCards(hand, jokerThenDiamond, noTrumpContract).map { it.id }
        )

        // A void hand may still play anything.
        val noDiamonds = hand.filter { it.suit != Suit.DIAMONDS }
        assertEquals(noDiamonds.map { it.id }, engine.legalCards(noDiamonds, jokerThenDiamond, noTrumpContract).map { it.id })
    }

    @Test
    fun noTrump_playCardEnforcesSuitSetByFirstNonJoker() {
        val base = engine.startNewMatch(initialSeed = 3L)
        val hands = mapOf(
            Seat.SOUTH to listOf(littleJoker, Card("SPADES_TWO", Suit.SPADES, Rank.TWO)),
            Seat.WEST to listOf(Card("DIAMONDS_FIVE", Suit.DIAMONDS, Rank.FIVE), Card("SPADES_THREE", Suit.SPADES, Rank.THREE)),
            Seat.NORTH to listOf(Card("CLUBS_ACE", Suit.CLUBS, Rank.ACE), Card("DIAMONDS_TWO", Suit.DIAMONDS, Rank.TWO)),
            Seat.EAST to listOf(Card("HEARTS_ACE", Suit.HEARTS, Rank.ACE), Card("SPADES_FOUR", Suit.SPADES, Rank.FOUR))
        )
        var state = base.copy(
            phase = TablePhase.PLAYING_TRICK,
            currentTurn = Seat.SOUTH,
            contract = noTrumpContract,
            hands = hands,
            currentTrick = emptyList()
        )
        state = engine.playCard(state, Seat.SOUTH, "JOKER_LITTLE")
        state = engine.playCard(state, Seat.WEST, "DIAMONDS_FIVE")

        // North holds a diamond and may not slough the A♣.
        val illegal = runCatching { engine.playCard(state, Seat.NORTH, "CLUBS_ACE") }
        assertTrue(illegal.isFailure)

        state = engine.playCard(state, Seat.NORTH, "DIAMONDS_TWO")
        state = engine.playCard(state, Seat.EAST, "HEARTS_ACE")
        assertEquals(TablePhase.TRICK_COMPLETE, state.phase)
        assertEquals(Seat.WEST, state.completedTricks.last().winner)
    }

    @Test
    fun trumpContract_ledJokerRemainsTopTrumpAndMustBeFollowedWithTrump() {
        // In a trump contract a led Joker is a trump lead: trumps must follow and LJ beats A♠.
        val trick = listOf(
            PlayedCard(Seat.SOUTH, littleJoker),
            PlayedCard(Seat.WEST, Card("SPADES_ACE", Suit.SPADES, Rank.ACE)),
            PlayedCard(Seat.NORTH, Card("SPADES_KING", Suit.SPADES, Rank.KING)),
            PlayedCard(Seat.EAST, Card("HEARTS_ACE", Suit.HEARTS, Rank.ACE))
        )
        assertEquals(Suit.SPADES, engine.governingSuit(trick, spadesContract))
        assertEquals(Seat.SOUTH, engine.determineTrickWinner(trick, spadesContract))

        val bigJokerOverLittle = trick.map { if (it.seat == Seat.EAST) PlayedCard(Seat.EAST, bigJoker) else it }
        assertEquals(Seat.EAST, engine.determineTrickWinner(bigJokerOverLittle, spadesContract))

        val hand = listOf(
            Card("HEARTS_ACE", Suit.HEARTS, Rank.ACE),
            Card("SPADES_FIVE", Suit.SPADES, Rank.FIVE),
            Card("CLUBS_KING", Suit.CLUBS, Rank.KING)
        )
        val ledJoker = listOf(PlayedCard(Seat.WEST, littleJoker))
        assertEquals(listOf("SPADES_FIVE"), engine.legalCards(hand, ledJoker, spadesContract).map { it.id })
    }

    @Test
    fun aiPolicy_followsSuitSetByFirstNonJokerAfterLedJokerInNoTrump() {
        val policy = AiPlayerPolicy(engine)
        val base = engine.startNewMatch(initialSeed = 11L)
        // Partner South led LJ; opponent West's 5♦ set diamonds and currently holds the book.
        val obs = engine.projectAiObservation(base, Seat.NORTH).copy(
            contract = noTrumpContract,
            ownHand = listOf(
                Card("SPADES_ACE", Suit.SPADES, Rank.ACE),
                Card("DIAMONDS_NINE", Suit.DIAMONDS, Rank.NINE),
                Card("DIAMONDS_TWO", Suit.DIAMONDS, Rank.TWO),
                bigJoker
            ),
            currentTrick = listOf(
                PlayedCard(Seat.SOUTH, littleJoker),
                PlayedCard(Seat.WEST, Card("DIAMONDS_FIVE", Suit.DIAMONDS, Rank.FIVE))
            )
        )
        val (chosen, _) = policy.chooseCardToPlay(obs, TableTalkTone.QUIET)
        assertEquals(Suit.DIAMONDS, chosen.suit)
        // 9♦ is the cheapest card that beats the 5♦; the A♠ may not be sloughed.
        assertEquals("DIAMONDS_NINE", chosen.id)
    }
}
