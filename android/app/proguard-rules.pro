# Add project specific ProGuard rules here.
# See http://developer.android.com/guide/developing/tools/proguard.html
#
# React Native core + Hermes ship their own consumer rules via the gradle
# plugin; most third-party native modules below also bundle consumer rules.
# The extra keeps here are defensive so release (minified) builds stay stable.

# --- React Native / Hermes ---
-keep,allowobfuscation @interface com.facebook.proguard.annotations.DoNotStrip
-keep @com.facebook.proguard.annotations.DoNotStrip class *
-keepclassmembers class * {
    @com.facebook.proguard.annotations.DoNotStrip *;
}
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-dontwarn com.facebook.react.**

# --- react-native-reanimated ---
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# --- react-native-gesture-handler ---
-keep class com.swmansion.gesturehandler.** { *; }

# --- react-native-svg ---
-keep public class com.horcrux.svg.** { *; }

# --- react-native-sqlite-storage ---
-keep class org.pgsqlite.** { *; }

# --- react-native-sensitive-info / encrypted-storage (Keystore-backed) ---
-keep class dev.fern.** { *; }
-keep class com.emeraldsanto.encryptedstorage.** { *; }
-dontwarn javax.annotation.**

# --- react-native-biometrics ---
-keep class com.rnbiometrics.** { *; }

# --- react-native-document-picker ---
-keep class com.reactnativedocumentpicker.** { *; }

# Keep annotated native methods.
-keepclasseswithmembernames class * {
    native <methods>;
}
