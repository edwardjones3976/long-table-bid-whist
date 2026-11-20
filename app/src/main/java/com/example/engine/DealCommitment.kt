package com.example.engine

import kotlinx.serialization.Serializable
import java.security.MessageDigest
import java.security.SecureRandom

/**
 * Public, pre-deal commitment to a hand's shuffle (Codex decision D-05).
 *
 * The rules service publishes `commitmentHex = SHA-256(manifestVersion | handNumber | seed | nonce)`
 * when the hand is dealt, while the seed and nonce stay private. Once the hand is scored the
 * service reveals both, and any client can recompute the hash and re-derive the shuffle from the
 * seed to confirm the deal it saw is the one that was committed to.
 *
 * The 128-bit nonce is essential: seeds alone may carry little entropy (a clock-derived seed has
 * roughly 2^41 possibilities), so a bare hash of the seed could be brute-forced during the hand,
 * which would recreate the F-01 seed leak through the commitment itself.
 */
@Serializable
data class DealCommitment(
    val handNumber: Int,
    val commitmentHex: String
)

/**
 * The private inputs behind a [DealCommitment], published only after the hand is scored.
 * Voided hands never reveal them: their concealed cards stay concealed.
 */
@Serializable
data class DealReveal(
    val handNumber: Int,
    val seed: Long,
    val nonceHex: String
)

object DealCommitmentHasher {
    private const val NONCE_BYTES = 16
    private val secureRandom = SecureRandom()

    /** A fresh random nonce as 32 lowercase hex characters. */
    fun newNonceHex(): String {
        val bytes = ByteArray(NONCE_BYTES)
        secureRandom.nextBytes(bytes)
        return bytes.toHex()
    }

    /** Pure: the same inputs always produce the same commitment, across platforms and ports. */
    fun commit(manifestVersion: String, handNumber: Int, seed: Long, nonceHex: String): String {
        require(nonceHex.length == NONCE_BYTES * 2 && nonceHex.all { it in HEX_CHARS }) {
            "Nonce must be ${NONCE_BYTES * 2} lowercase hex characters"
        }
        val canonical = "$manifestVersion|hand=$handNumber|seed=$seed|nonce=$nonceHex"
        val digest = MessageDigest.getInstance("SHA-256").digest(canonical.toByteArray(Charsets.UTF_8))
        return digest.toHex()
    }

    /** True when the revealed seed and nonce reproduce the published commitment. */
    fun verify(manifestVersion: String, commitment: DealCommitment, reveal: DealReveal): Boolean {
        if (commitment.handNumber != reveal.handNumber) return false
        return commit(manifestVersion, reveal.handNumber, reveal.seed, reveal.nonceHex) == commitment.commitmentHex
    }

    /** A short form for captions and UI: the first [chars] hex characters followed by an ellipsis. */
    fun shortForm(commitmentHex: String, chars: Int = 12): String =
        if (commitmentHex.length <= chars) commitmentHex else commitmentHex.take(chars) + "…"

    private const val HEX_CHARS = "0123456789abcdef"

    private fun ByteArray.toHex(): String = joinToString("") { byte ->
        val v = byte.toInt() and 0xff
        "${HEX_CHARS[v ushr 4]}${HEX_CHARS[v and 0x0f]}"
    }
}
