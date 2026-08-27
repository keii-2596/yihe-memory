plugins { id("com.android.application") }

android {
    namespace = "com.yihe.memory"
    compileSdk = 36
    defaultConfig {
        applicationId = "com.yihe.memory"
        minSdk = 23
        targetSdk = 36
        versionCode = 1
        versionName = "1.0.0"
    }
    signingConfigs {
        create("release") {
            val keyPath = providers.gradleProperty("YIHE_KEYSTORE_PATH").orNull
            if (!keyPath.isNullOrBlank()) {
                storeFile = file(keyPath)
                storePassword = providers.gradleProperty("YIHE_KEYSTORE_PASSWORD").orNull
                keyAlias = providers.gradleProperty("YIHE_KEY_ALIAS").orNull ?: "yihe"
                keyPassword = providers.gradleProperty("YIHE_KEY_PASSWORD").orNull
            }
        }
    }
    buildTypes {
        release {
            val keyPath = providers.gradleProperty("YIHE_KEYSTORE_PATH").orNull
            if (!keyPath.isNullOrBlank()) signingConfig = signingConfigs.getByName("release")
            isMinifyEnabled = false
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies { implementation("com.google.androidbrowserhelper:androidbrowserhelper:2.7.2") }
