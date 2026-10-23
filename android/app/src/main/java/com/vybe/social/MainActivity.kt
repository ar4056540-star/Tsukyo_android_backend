package com.vybe.social

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.core.view.WindowCompat
import com.vybe.social.data.AuthManager
import com.vybe.social.data.VybeRepository
import com.vybe.social.ui.screens.MainContainerScreen
import com.vybe.social.ui.theme.VybeTheme

class MainActivity : ComponentActivity() {

    private val authManager by lazy { AuthManager(this) }
    private val repository by lazy { VybeRepository(authManager) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Enable edge-to-edge system bars
        WindowCompat.setDecorFitsSystemWindows(window, false)

        setContent {
            VybeTheme {
                MainContainerScreen(
                    authManager = authManager,
                    repository = repository
                )
            }
        }
    }
}
