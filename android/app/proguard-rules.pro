# ProGuard rules for VYBE Native Android App
-keepattributes *Annotation*
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# Media3 ExoPlayer Keep Rules
-keep class androidx.media3.exoplayer.** { *; }
-keep class androidx.media3.ui.** { *; }

# Coil Image Loader
-dontwarn coil.**
-keep class coil.** { *; }

# Gson Model Serialization
-keep class com.vybe.social.model.** { *; }
