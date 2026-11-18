package com.example.ui.components

import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.CardScale
import com.example.engine.Card
import com.example.engine.Rank
import com.example.engine.Suit
import com.example.ui.theme.AntiqueBrass
import com.example.ui.theme.IvoryCardSurface
import com.example.ui.theme.JokerGold
import com.example.ui.theme.SuitCharcoal
import com.example.ui.theme.SuitCrimson
import com.example.ui.theme.SuitEmerald
import com.example.ui.theme.SuitRoyalBlue

@Composable
fun PlayingCardView(
    card: Card,
    cardScale: CardScale,
    highContrastSuits: Boolean,
    isSelected: Boolean = false,
    isLegal: Boolean = true,
    isFromKitty: Boolean = false,
    isTrump: Boolean = false,
    reducedMotion: Boolean = false,
    onClick: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    val liftOffset by animateDpAsState(
        targetValue = if (isSelected) (-14).dp else 0.dp,
        animationSpec = spring(),
        label = "cardLift"
    )
    val effectiveOffset = if (reducedMotion) {
        if (isSelected) (-8).dp else 0.dp
    } else {
        liftOffset
    }

    val suitColor = when {
        card.isJoker -> JokerGold
        !highContrastSuits -> when (card.suit) {
            Suit.HEARTS, Suit.DIAMONDS -> SuitCrimson
            Suit.SPADES, Suit.CLUBS, null -> SuitCharcoal
        }
        else -> when (card.suit) {
            Suit.HEARTS -> SuitCrimson
            Suit.DIAMONDS -> SuitRoyalBlue
            Suit.CLUBS -> SuitEmerald
            Suit.SPADES, null -> SuitCharcoal
        }
    }

    val borderColor = when {
        isSelected -> AntiqueBrass
        isFromKitty -> SuitRoyalBlue
        isTrump -> MaterialTheme.colorScheme.tertiary.copy(alpha = 0.7f)
        else -> Color(0xFFD5CBB8)
    }

    Surface(
        modifier = modifier
            .offset(y = effectiveOffset)
            .size(width = cardScale.widthDp.dp, height = cardScale.heightDp.dp)
            .alpha(if (isLegal) 1f else 0.45f)
            .testTag("card_${card.id}")
            .semantics { contentDescription = card.accessibleDescription }
            .then(
                if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier
            ),
        shape = RoundedCornerShape(10.dp),
        color = IvoryCardSurface,
        shadowElevation = if (isSelected) 10.dp else 3.dp,
        border = BorderStroke(
            width = if (isSelected || isFromKitty) 2.5.dp else 1.dp,
            color = borderColor
        )
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 6.dp, vertical = 5.dp)
        ) {
            // Top-left rank & suit
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.align(Alignment.TopStart)
            ) {
                Text(
                    text = card.rank.shortLabel,
                    color = suitColor,
                    fontSize = (15 * cardScale.fontScale).sp,
                    fontWeight = FontWeight.Bold,
                    lineHeight = (16 * cardScale.fontScale).sp
                )
                if (!card.isJoker && card.suit != null) {
                    Text(
                        text = card.suit.symbol,
                        color = suitColor,
                        fontSize = (13 * cardScale.fontScale).sp,
                        lineHeight = (14 * cardScale.fontScale).sp
                    )
                }
            }

            // Center emblem
            Box(
                modifier = Modifier.align(Alignment.Center),
                contentAlignment = Alignment.Center
            ) {
                if (card.isJoker) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            imageVector = Icons.Filled.Star,
                            contentDescription = null,
                            tint = JokerGold,
                            modifier = Modifier.size((22 * cardScale.fontScale).dp)
                        )
                        Text(
                            text = if (card.rank == Rank.BIG_JOKER) "BIG" else "LIL",
                            color = JokerGold,
                            fontSize = (10 * cardScale.fontScale).sp,
                            fontWeight = FontWeight.Bold,
                            textAlign = TextAlign.Center
                        )
                    }
                } else {
                    Text(
                        text = card.suit?.symbol.orEmpty(),
                        color = suitColor,
                        fontSize = (24 * cardScale.fontScale).sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            // Bottom badges (Kitty / Trump)
            Row(
                modifier = Modifier.align(Alignment.BottomCenter),
                horizontalArrangement = Arrangement.spacedBy(3.dp)
            ) {
                if (isFromKitty) {
                    Text(
                        text = "KITTY",
                        color = Color.White,
                        fontSize = 8.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier
                            .background(SuitRoyalBlue, RoundedCornerShape(4.dp))
                            .padding(horizontal = 4.dp, vertical = 1.dp)
                    )
                } else if (isTrump) {
                    Text(
                        text = "TRUMP",
                        color = Color.White,
                        fontSize = 8.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier
                            .background(AntiqueBrass, RoundedCornerShape(4.dp))
                            .padding(horizontal = 4.dp, vertical = 1.dp)
                    )
                }
            }
        }
    }
}
