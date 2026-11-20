package com.example.data

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.example.engine.RoleMode
import com.example.engine.TableTalkTone
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.tablePrefsDataStore: DataStore<Preferences> by preferencesDataStore(name = "long_table_prefs")

enum class Handedness(val label: String) {
    RIGHT("Right-Handed"),
    LEFT("Left-Handed")
}

enum class CardScale(val label: String, val widthDp: Int, val heightDp: Int, val fontScale: Float) {
    STANDARD("Standard", 64, 92, 1.0f),
    LARGE("Large", 74, 106, 1.15f),
    EXTRA_LARGE("Extra Large", 84, 120, 1.28f)
}

data class TablePreferences(
    val handedness: Handedness = Handedness.RIGHT,
    val cardScale: CardScale = CardScale.LARGE,
    val twoStepConfirm: Boolean = true,
    val highContrastSuits: Boolean = true,
    val captionsEnabled: Boolean = true,
    val reducedMotion: Boolean = false,
    val soundEffectsEnabled: Boolean = true,
    val tableTalkTone: TableTalkTone = TableTalkTone.SOCIAL,
    val roleMode: RoleMode = RoleMode.SEATED_PLAYER_HOST,
    val manifestAcknowledged: Boolean = false,
    val bidSchoolCompleted: Boolean = false,
    val guidedHintEnabled: Boolean = true,
    val handsCompleted: Int = 0,
    val handsWonUs: Int = 0,
    val bostonsScored: Int = 0
)

class TablePreferencesRepository(private val context: Context) {

    private object Keys {
        val HANDEDNESS = stringPreferencesKey("handedness")
        val CARD_SCALE = stringPreferencesKey("card_scale")
        val TWO_STEP_CONFIRM = booleanPreferencesKey("two_step_confirm")
        val HIGH_CONTRAST_SUITS = booleanPreferencesKey("high_contrast_suits")
        val CAPTIONS_ENABLED = booleanPreferencesKey("captions_enabled")
        val REDUCED_MOTION = booleanPreferencesKey("reduced_motion")
        val SOUND_EFFECTS = booleanPreferencesKey("sound_effects_enabled")
        val TABLE_TALK_TONE = stringPreferencesKey("table_talk_tone")
        val ROLE_MODE = stringPreferencesKey("role_mode")
        val MANIFEST_ACKNOWLEDGED = booleanPreferencesKey("manifest_acknowledged")
        val BID_SCHOOL_COMPLETED = booleanPreferencesKey("bid_school_completed")
        val GUIDED_HINT_ENABLED = booleanPreferencesKey("guided_hint_enabled")
        val HANDS_COMPLETED = intPreferencesKey("hands_completed")
        val HANDS_WON_US = intPreferencesKey("hands_won_us")
        val BOSTONS_SCORED = intPreferencesKey("bostons_scored")
    }

    val preferences: Flow<TablePreferences> = context.tablePrefsDataStore.data.map { prefs ->
        TablePreferences(
            handedness = prefs[Keys.HANDEDNESS]?.let { runCatching { Handedness.valueOf(it) }.getOrNull() } ?: Handedness.RIGHT,
            cardScale = prefs[Keys.CARD_SCALE]?.let { runCatching { CardScale.valueOf(it) }.getOrNull() } ?: CardScale.LARGE,
            twoStepConfirm = prefs[Keys.TWO_STEP_CONFIRM] ?: true,
            highContrastSuits = prefs[Keys.HIGH_CONTRAST_SUITS] ?: true,
            captionsEnabled = prefs[Keys.CAPTIONS_ENABLED] ?: true,
            reducedMotion = prefs[Keys.REDUCED_MOTION] ?: false,
            soundEffectsEnabled = prefs[Keys.SOUND_EFFECTS] ?: true,
            tableTalkTone = prefs[Keys.TABLE_TALK_TONE]?.let { runCatching { TableTalkTone.valueOf(it) }.getOrNull() } ?: TableTalkTone.SOCIAL,
            roleMode = prefs[Keys.ROLE_MODE]?.let { runCatching { RoleMode.valueOf(it) }.getOrNull() } ?: RoleMode.SEATED_PLAYER_HOST,
            manifestAcknowledged = prefs[Keys.MANIFEST_ACKNOWLEDGED] ?: false,
            bidSchoolCompleted = prefs[Keys.BID_SCHOOL_COMPLETED] ?: false,
            guidedHintEnabled = prefs[Keys.GUIDED_HINT_ENABLED] ?: true,
            handsCompleted = prefs[Keys.HANDS_COMPLETED] ?: 0,
            handsWonUs = prefs[Keys.HANDS_WON_US] ?: 0,
            bostonsScored = prefs[Keys.BOSTONS_SCORED] ?: 0
        )
    }

    suspend fun updateHandedness(value: Handedness) {
        context.tablePrefsDataStore.edit { it[Keys.HANDEDNESS] = value.name }
    }

    suspend fun updateCardScale(value: CardScale) {
        context.tablePrefsDataStore.edit { it[Keys.CARD_SCALE] = value.name }
    }

    suspend fun updateTwoStepConfirm(value: Boolean) {
        context.tablePrefsDataStore.edit { it[Keys.TWO_STEP_CONFIRM] = value }
    }

    suspend fun updateHighContrastSuits(value: Boolean) {
        context.tablePrefsDataStore.edit { it[Keys.HIGH_CONTRAST_SUITS] = value }
    }

    suspend fun updateCaptionsEnabled(value: Boolean) {
        context.tablePrefsDataStore.edit { it[Keys.CAPTIONS_ENABLED] = value }
    }

    suspend fun updateReducedMotion(value: Boolean) {
        context.tablePrefsDataStore.edit { it[Keys.REDUCED_MOTION] = value }
    }

    suspend fun updateSoundEffects(value: Boolean) {
        context.tablePrefsDataStore.edit { it[Keys.SOUND_EFFECTS] = value }
    }

    suspend fun updateTableTalkTone(value: TableTalkTone) {
        context.tablePrefsDataStore.edit { it[Keys.TABLE_TALK_TONE] = value.name }
    }

    suspend fun updateRoleMode(value: RoleMode) {
        context.tablePrefsDataStore.edit { it[Keys.ROLE_MODE] = value.name }
    }

    suspend fun setManifestAcknowledged(value: Boolean) {
        context.tablePrefsDataStore.edit { it[Keys.MANIFEST_ACKNOWLEDGED] = value }
    }

    suspend fun setBidSchoolCompleted(value: Boolean) {
        context.tablePrefsDataStore.edit { it[Keys.BID_SCHOOL_COMPLETED] = value }
    }

    suspend fun updateGuidedHintEnabled(value: Boolean) {
        context.tablePrefsDataStore.edit { it[Keys.GUIDED_HINT_ENABLED] = value }
    }

    suspend fun recordHandResult(usWon: Boolean, isBoston: Boolean) {
        context.tablePrefsDataStore.edit { prefs ->
            prefs[Keys.HANDS_COMPLETED] = (prefs[Keys.HANDS_COMPLETED] ?: 0) + 1
            if (usWon) {
                prefs[Keys.HANDS_WON_US] = (prefs[Keys.HANDS_WON_US] ?: 0) + 1
            }
            if (isBoston) {
                prefs[Keys.BOSTONS_SCORED] = (prefs[Keys.BOSTONS_SCORED] ?: 0) + 1
            }
        }
    }
}
