plugins { id("com.android.application") }

android {
    namespace = "ir.tusancn.app"
    compileSdk = 36

    defaultConfig {
        applicationId = "ir.tusancn.app"
        minSdk = 23
        targetSdk = 36
        versionCode = 1
        versionName = "1.0.0"
    }

    signingConfigs {
        create("release") {
            val storeFilePath = project.findProperty("tusan.store.file") as String?
            val storePasswordValue = project.findProperty("tusan.store.password") as String?
            val keyAliasValue = project.findProperty("tusan.key.alias") as String?
            val keyPasswordValue = project.findProperty("tusan.key.password") as String?
            if (storeFilePath != null && storePasswordValue != null && keyAliasValue != null && keyPasswordValue != null) {
                storeFile = file(storeFilePath)
                storePassword = storePasswordValue
                keyAlias = keyAliasValue
                keyPassword = keyPasswordValue
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("release")
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
}

dependencies {
    implementation("com.google.androidbrowserhelper:androidbrowserhelper:2.7.3")
}
