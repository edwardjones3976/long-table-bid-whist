package com.example.engine

import kotlinx.serialization.Serializable

@Serializable
enum class Suit(val symbol: String, val label: String) {
    SPADES("♠", "Spades"),
    HEARTS("♥", "Hearts"),
    DIAMONDS("♦", "Diamonds"),
    CLUBS("♣", "Clubs")
}

@Serializable
enum class Rank(val shortLabel: String, val fullName: String, val uptownOrder: Int, val downtownOrder: Int) {
    TWO("2", "Two", 2, 13),
    THREE("3", "Three", 3, 12),
    FOUR("4", "Four", 4, 11),
    FIVE("5", "Five", 5, 10),
    SIX("6", "Six", 6, 9),
    SEVEN("7", "Seven", 7, 8),
    EIGHT("8", "Eight", 8, 7),
    NINE("9", "Nine", 9, 6),
    TEN("10", "Ten", 10, 5),
    JACK("J", "Jack", 11, 4),
    QUEEN("Q", "Queen", 12, 3),
    KING("K", "King", 13, 2),
    ACE("A", "Ace", 14, 14),
    LITTLE_JOKER("LJ", "Little Joker", 15, 15),
    BIG_JOKER("BJ", "Big Joker", 16, 16)
}

@Serializable
data class Card(
    val id: String,
    val suit: Suit?,
    val rank: Rank
) {
    val isJoker: Boolean
        get() = rank == Rank.BIG_JOKER || rank == Rank.LITTLE_JOKER

    val displayName: String
        get() = if (isJoker) rank.fullName else "${rank.shortLabel}${suit?.symbol.orEmpty()}"

    val accessibleDescription: String
        get() = if (isJoker) rank.fullName else "${rank.fullName} of ${suit?.label ?: ""}"
}

@Serializable
enum class Partnership(val displayName: String) {
    US("Us (South & North)"),
    THEM("Them (West & East)")
}

@Serializable
enum class Seat(val displayName: String, val defaultPlayerName: String, val isHuman: Boolean) {
    SOUTH("South", "You", true),
    WEST("West", "Deacon Ray", false),
    NORTH("North", "Ms. Evelyn", false),
    EAST("East", "Uncle Marcus", false);

    val partnership: Partnership
        get() = when (this) {
            SOUTH, NORTH -> Partnership.US
            WEST, EAST -> Partnership.THEM
        }

    fun nextClockwise(): Seat = when (this) {
        SOUTH -> WEST
        WEST -> NORTH
        NORTH -> EAST
        EAST -> SOUTH
    }

    fun partner(): Seat = when (this) {
        SOUTH -> NORTH
        NORTH -> SOUTH
        WEST -> EAST
        EAST -> WEST
    }
}

@Serializable
enum class BidDirection(val label: String, val description: String) {
    UPTOWN("Uptown", "High cards win: A-K-Q-J-10...2"),
    DOWNTOWN("Downtown", "Ace high, then 2 strongest down to King")
}

@Serializable
sealed interface BidAction {
    @Serializable
    data object Pass : BidAction

    @Serializable
    data class Bid(
        val booksOverSix: Int,
        val isNoTrump: Boolean,
        val direction: BidDirection
    ) : BidAction {
        val totalBooksRequired: Int get() = 6 + booksOverSix

        fun formatShort(): String = buildString {
            append(booksOverSix)
            append(" ")
            append(direction.label)
            if (isNoTrump) append(" No-Trump")
        }
    }
}

@Serializable
data class SeatBidRecord(
    val seat: Seat,
    val action: BidAction,
    val forcedByDealerRule: Boolean = false
)

@Serializable
data class Contract(
    val declarer: Seat,
    val booksOverSix: Int,
    val trumpSuit: Suit?,
    val direction: BidDirection
) {
    val isNoTrump: Boolean get() = trumpSuit == null
    val targetBooks: Int get() = 6 + booksOverSix

    fun formatBanner(): String {
        val trumpText = trumpSuit?.let { "${it.symbol} ${it.label}" } ?: "No-Trump"
        return "$booksOverSix ${direction.label} · $trumpText"
    }
}

@Serializable
data class PlayedCard(
    val seat: Seat,
    val card: Card
)

@Serializable
data class TrickRecord(
    val trickNumber: Int,
    val leader: Seat,
    val plays: List<PlayedCard>,
    val winner: Seat
)

@Serializable
data class TableRulesManifest(
    val version: String = "strict-table-v1.0.0",
    val presetName: String = "Strict Parlor Table",
    val targetGameScore: Int = 7,
    val minBid: Int = 4,
    val maxBid: Int = 7,
    val deckSize: Int = 54,
    val handSize: Int = 12,
    val kittySize: Int = 6,
    val kittyCountsAsDeclarerBook: Boolean = true,
    val noTrumpOutranksTrumpAtSameBid: Boolean = true,
    val noTrumpDoublesPoints: Boolean = true,
    val bostonPoints: Int = 14,
    val forcedDealerMinBid: Boolean = true,
    val directionAndNoTrumpBindingFromAuction: Boolean = true,
    val downtownRankingNote: String = "Ace stays high; 2 is second strongest down to King.",
    val jokerRuleNote: String = "Big & Little Joker are top trumps in suit contracts; in No-Trump they have no suit, lose to any suited card, and the first suited card sets the suit to follow."
)

@Serializable
enum class TablePhase {
    IDLE,
    BIDDING,
    SELECT_TRUMP,
    KITTY_DISCARD,
    PLAYING_TRICK,
    TRICK_COMPLETE,
    HAND_COMPLETE,
    MATCH_COMPLETE,
    VOIDED_HAND
}

@Serializable
enum class RoleMode(val label: String, val summary: String) {
    SEATED_PLAYER(
        label = "Seated Player",
        summary = "Play your South seat under the AI Dealer and Authoritative Rules Service."
    ),
    SEATED_PLAYER_HOST(
        label = "Seated Player + Table Host",
        summary = "Includes between-hand pause, AI seat naming, tone control, and audited unanimous void — never concealed-card access."
    )
}

@Serializable
enum class TableTalkTone(val label: String, val description: String) {
    QUIET("Quiet", "Essential bid and play announcements only."),
    SOCIAL("Social", "Warm, natural partnership encouragement and table cues."),
    LIVELY("Lively", "Expressive card-night banter while keeping every line respectful.")
}

@Serializable
data class AuditEvent(
    val sequence: Int,
    val phase: TablePhase,
    val actor: String,
    val summary: String,
    val detail: String,
    val concealedStateIsolated: Boolean = true
)

/**
 * A pending audited unanimous void. The void only applies once every human seat has
 * consented; AI seats consent implicitly at request time. Public table information.
 */
@Serializable
data class VoidRequest(
    val reason: String,
    val requestedBy: Seat,
    val consents: Set<Seat>
) {
    val outstandingSeats: Set<Seat>
        get() = Seat.entries.filter { it !in consents }.toSet()

    val isUnanimous: Boolean
        get() = Seat.entries.filter { it.isHuman }.all { it in consents }

    fun formatAuditDetail(): String {
        val consentText = consents
            .sortedBy { it.ordinal }
            .joinToString(", ") { seat ->
                if (seat.isHuman) seat.displayName else "${seat.displayName} (AI, implicit)"
            }
            .ifEmpty { "none" }
        return "Reason: $reason. Requested by ${requestedBy.displayName}. Consents: $consentText."
    }
}

/**
 * Settled result of a hand. A voided hand has no scoring: [contract] is whatever was
 * agreed before the void (possibly none) and [pointsAwardedTo] is null with [pointsDelta] 0.
 */
@Serializable
data class HandOutcome(
    val handNumber: Int,
    val contract: Contract?,
    val booksWonUs: Int,
    val booksWonThem: Int,
    val contractMade: Boolean,
    val isBoston: Boolean,
    val pointsAwardedTo: Partnership?,
    val pointsDelta: Int,
    val wasVoided: Boolean = false,
    val voidReason: String? = null,
    val voidRequest: VoidRequest? = null
)

/**
 * Concealed-information boundary for a seated human player (South).
 * Contains zero access to other seats' hands or unrevealed kitty cards.
 * Deliberately omits the deal seed: with it, the shuffle (and every concealed hand)
 * could be reproduced from this view alone.
 */
data class SeatView(
    val manifest: TableRulesManifest,
    val handNumber: Int,
    val phase: TablePhase,
    val dealer: Seat,
    val currentTurn: Seat,
    val scoreUs: Int,
    val scoreThem: Int,
    val localHand: List<Card>,
    val kittyCardIdsInHand: Set<String>,
    val legalPlayCardIds: Set<String>,
    val seatCardCounts: Map<Seat, Int>,
    val bidHistory: List<SeatBidRecord>,
    val highestBid: SeatBidRecord?,
    val contract: Contract?,
    val currentTrick: List<PlayedCard>,
    val completedTricks: List<TrickRecord>,
    val lastTrick: TrickRecord?,
    val booksWonUs: Int,
    val booksWonThem: Int,
    val lastOutcome: HandOutcome?,
    val seatCaptions: Map<Seat, String>,
    val latestCaption: String,
    val auditLog: List<AuditEvent>,
    val isBetweenHandPaused: Boolean,
    val pendingVoidRequest: VoidRequest?,
    val canRequestVoid: Boolean,
    val guidedHint: String?
)

/**
 * Concealed-information boundary for an AI seat.
 * Strictly isolated: receives only its own hand + public table history.
 */
data class AiSeatObservation(
    val seat: Seat,
    val dealer: Seat,
    val ownHand: List<Card>,
    val bidHistory: List<SeatBidRecord>,
    val highestBid: SeatBidRecord?,
    val contract: Contract?,
    val currentTrick: List<PlayedCard>,
    val completedTricks: List<TrickRecord>,
    val isDealerForcedToBid: Boolean
)
