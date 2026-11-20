package com.example.data

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlin.math.PI
import kotlin.math.exp
import kotlin.math.sin

/**
 * Pure procedural sound feedback (no external audio samples or unlicensed files).
 * App remains 100% playable without audio via captions and visual highlights.
 */
object SoundFeedback {
    private val scope = CoroutineScope(Dispatchers.Default)

    fun playCardSnap(enabled: Boolean) {
        if (!enabled) return
        playTone(frequencyHz = 240.0, durationMs = 45, amplitude = 0.22)
    }

    fun playTrickChime(enabled: Boolean) {
        if (!enabled) return
        playTone(frequencyHz = 523.25, durationMs = 90, amplitude = 0.18)
    }

    private fun playTone(frequencyHz: Double, durationMs: Int, amplitude: Double) {
        scope.launch {
            runCatching {
                val sampleRate = 22050
                val numSamples = (sampleRate * durationMs) / 1000
                val samples = ShortArray(numSamples)
                for (i in 0 until numSamples) {
                    val t = i.toDouble() / sampleRate
                    val envelope = exp(-t * 28.0)
                    val sample = sin(2.0 * PI * frequencyHz * t) * envelope * amplitude
                    samples[i] = (sample * Short.MAX_VALUE).toInt().toShort()
                }
                val minBuffer = AudioTrack.getMinBufferSize(
                    sampleRate,
                    AudioFormat.CHANNEL_OUT_MONO,
                    AudioFormat.ENCODING_PCM_16BIT
                )
                val track = AudioTrack.Builder()
                    .setAudioAttributes(
                        AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_GAME)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .build()
                    )
                    .setAudioFormat(
                        AudioFormat.Builder()
                            .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                            .setSampleRate(sampleRate)
                            .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                            .build()
                    )
                    .setBufferSizeInBytes(maxOf(minBuffer, samples.size * 2))
                    .setTransferMode(AudioTrack.MODE_STATIC)
                    .build()

                track.write(samples, 0, samples.size)
                track.play()
                kotlinx.coroutines.delay(durationMs.toLong() + 60L)
                track.release()
            }
        }
    }
}
