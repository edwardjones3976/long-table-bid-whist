package com.example.data

enum class AssetStatus(val label: String) {
    APPROVED("Approved for Build"),
    EXTERNAL_VENUE_ONLY("External Venue Only (Not Transmitted)")
}

data class AssetProvenanceEntry(
    val id: String,
    val title: String,
    val category: String,
    val rightsBasis: String,
    val provenanceNote: String,
    val status: AssetStatus
)

object AssetProvenanceLedger {
    val entries: List<AssetProvenanceEntry> = listOf(
        AssetProvenanceEntry(
            id = "font-playfair-display",
            title = "Playfair Display (TTF)",
            category = "Typography",
            rightsBasis = "SIL Open Font License 1.1",
            provenanceNote = "Bundled locally in res/font/playfair_display.ttf via Google Fonts.",
            status = AssetStatus.APPROVED
        ),
        AssetProvenanceEntry(
            id = "font-plus-jakarta-sans",
            title = "Plus Jakarta Sans (TTF)",
            category = "Typography",
            rightsBasis = "SIL Open Font License 1.1",
            provenanceNote = "Bundled locally in res/font/plus_jakarta_sans.ttf via Google Fonts.",
            status = AssetStatus.APPROVED
        ),
        AssetProvenanceEntry(
            id = "font-jetbrains-mono",
            title = "JetBrains Mono (TTF)",
            category = "Typography",
            rightsBasis = "SIL Open Font License 1.1",
            provenanceNote = "Bundled locally in res/font/jetbrains_mono.ttf via Google Fonts.",
            status = AssetStatus.APPROVED
        ),
        AssetProvenanceEntry(
            id = "img-parlor-hero",
            title = "Parlor Table Hero Artwork",
            category = "Illustration",
            rightsBasis = "Project-generated original drawable",
            provenanceNote = "Bundled in res/drawable/img_parlor_hero.jpg; free of third-party likenesses or archival trademarks.",
            status = AssetStatus.APPROVED
        ),
        AssetProvenanceEntry(
            id = "img-bid-school-banner",
            title = "Bid School Trick Illustration",
            category = "Illustration",
            rightsBasis = "Project-generated original drawable",
            provenanceNote = "Bundled in res/drawable/img_bid_school_banner.jpg for guided tutorial cards.",
            status = AssetStatus.APPROVED
        ),
        AssetProvenanceEntry(
            id = "img-launcher-emblem",
            title = "Long Table Adaptive App Icon",
            category = "App Icon",
            rightsBasis = "Project-generated original emblem",
            provenanceNote = "Bundled across mipmap densities and adaptive XML layers (#183727 backdrop).",
            status = AssetStatus.APPROVED
        ),
        AssetProvenanceEntry(
            id = "audio-procedural-taps",
            title = "Synthesized Card & Chime Tones",
            category = "Sound Effects",
            rightsBasis = "Runtime procedural PCM synthesis",
            provenanceNote = "Generated mathematically via AudioTrack; zero external samples or pre-1972 recordings.",
            status = AssetStatus.APPROVED
        ),
        AssetProvenanceEntry(
            id = "audio-host-music-policy",
            title = "Host-Supplied Jazz & Blues Music",
            category = "Shared Audio Policy",
            rightsBasis = "U.S. Copyright Circular 56 & Music Modernization Act Gate",
            provenanceNote = "No unlicensed jazz/blues recordings ship. File format (.mp3/.wav) is not rights proof; play music externally in your physical room.",
            status = AssetStatus.EXTERNAL_VENUE_ONLY
        )
    )
}
