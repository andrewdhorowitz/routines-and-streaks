plugins {
    id("com.android.application")
    id("com.github.triplet.play")
}

// Firebase Crashlytics — wired CONDITIONALLY, mirroring the Homework
// Clarity TWA (adopted Nov 3, 2026). The google-services + Crashlytics
// plugins and SDK activate only when android/app/google-services.json is
// present, so checkouts and CI stay green without it. That file comes
// from registering this Android app (package
// com.andrewdhorowitz.routinesandstreaks) in the Routines Firebase
// project — an owner console step; when the file lands, the next build
// initializes Crashlytics with no further code change. Plugin versions
// are declared apply-false in the root build file. Both plugins are
// Apache-2.0 and free; Crashlytics itself is a free Firebase service.
val googleServicesPresent = file("google-services.json").exists()
if (googleServicesPresent) {
    apply(plugin = "com.google.gms.google-services")
    apply(plugin = "com.google.firebase.crashlytics")
}

android {
    namespace = "com.andrewdhorowitz.routinesandstreaks"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.andrewdhorowitz.routinesandstreaks"
        minSdk = 24
        targetSdk = 36
        versionCode = 1
        versionName = "1.0.0"
    }

    signingConfigs {
        // Permanent signing key, owner-generated and held ONLY as repo
        // secrets (RS_KEYSTORE_*), decoded by CI into a temp file whose
        // path arrives as RS_KEYSTORE_PATH. Until those secrets exist the
        // config stays empty and release builds are UNSIGNED — fine for
        // pipeline verification, never for a Play upload (the publish job
        // refuses to run without them).
        create("rs") {
            val ksPath = System.getenv("RS_KEYSTORE_PATH")
            if (ksPath != null) {
                storeFile = file(ksPath)
                storePassword = System.getenv("RS_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("RS_KEY_ALIAS")
                keyPassword = System.getenv("RS_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        debug {
            if (System.getenv("RS_KEYSTORE_PATH") != null) {
                signingConfig = signingConfigs.getByName("rs")
            }
        }
        release {
            if (System.getenv("RS_KEYSTORE_PATH") != null) {
                signingConfig = signingConfigs.getByName("rs")
            }
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    // Google's Trusted Web Activity library (androidbrowserhelper) —
    // Apache-2.0, no quotas or service dependency. The app is a thin
    // launcher: LauncherActivity opens the web app in a verified TWA
    // session (Digital Asset Links: the site serves
    // /.well-known/assetlinks.json; this app delegates to it via the
    // asset_statements manifest meta-data).
    //
    // This is the COMPLETE dependency set — deliberately, mirroring
    // Homework Clarity's post-crash-fix build (see its
    // TWA-CRASH-FIX-REPORT.md / CRASH-DIAGNOSIS-2026-11-04.md):
    // androidbrowserhelper's activities extend android.app.Activity
    // (NOT AppCompatActivity), so no AppCompat; and 2.4.0 is the first
    // version whose FocusActivity creates its PendingIntent with
    // FLAG_IMMUTABLE, which Android 12+ requires for an app targeting
    // S+ (this app targets 36). 2.0.0 crashed on launch for exactly
    // that reason.
    implementation("com.google.androidbrowserhelper:androidbrowserhelper:2.4.0")

    // Firebase Crashlytics SDK — present only when google-services.json
    // is (see the conditional plugin application at the top of this
    // file); the SDK initializes itself via its manifest provider on
    // process start, so no call site is needed.
    if (googleServicesPresent) {
        implementation("com.google.firebase:firebase-crashlytics:19.3.0")
    }
}

// Google Play publishing (Gradle Play Publisher). INERT by default:
// nothing here runs during normal builds — the credentials file is
// referenced lazily through an environment-variable provider and is only
// read when a publish task is explicitly invoked (CI: manual
// workflow_dispatch with publish=true; see .github/workflows/android.yml
// in the repo root). The JSON key belongs to the play-publisher service
// account; CI writes the PLAY_SERVICE_ACCOUNT_JSON repo secret to a temp
// file and points PLAY_SERVICE_ACCOUNT_JSON_PATH at it.
play {
    serviceAccountCredentials.set(
        providers.environmentVariable("PLAY_SERVICE_ACCOUNT_JSON_PATH")
            .map { layout.projectDirectory.file(it) }
    )
    track.set("internal")
    defaultToAppBundles.set(true)
    releaseStatus.set(com.github.triplet.gradle.androidpublisher.ReleaseStatus.COMPLETED)
}
