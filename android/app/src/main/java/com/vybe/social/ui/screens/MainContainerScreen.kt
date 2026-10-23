package com.vybe.social.ui.screens

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import com.vybe.social.data.AuthManager
import com.vybe.social.data.VybeRepository
import com.vybe.social.model.UserProfile
import com.vybe.social.ui.components.BottomNavTab
import com.vybe.social.ui.components.VybeBottomNav
import com.vybe.social.ui.components.VybeTopBar
import com.vybe.social.ui.theme.VybeDarkBg
import kotlinx.coroutines.launch

@Composable
fun MainContainerScreen(
    authManager: AuthManager,
    repository: VybeRepository,
    modifier: Modifier = Modifier
) {
    val currentUser by authManager.authStateFlow.collectAsState(initial = authManager.currentUser)
    var currentProfile by remember { mutableStateOf(UserProfile(userId = currentUser?.uid ?: "")) }
    val coroutineScope = rememberCoroutineScope()

    LaunchedEffect(currentUser?.uid) {
        val uid = currentUser?.uid
        if (uid != null) {
            repository.getUserProfile(uid).onSuccess { profile ->
                currentProfile = profile
            }
        }
    }

    if (currentUser == null) {
        AuthScreen(
            authManager = authManager,
            onAuthSuccess = { /* authStateFlow will trigger state update */ }
        )
        return
    }

    var selectedTab by remember { mutableStateOf(BottomNavTab.FEED) }
    var activeCommentsTarget by remember { mutableStateOf<Pair<String, String>?>(null) } // Pair(id, type)
    var showDirectMessages by remember { mutableStateOf(false) }
    var showNotifications by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            if (selectedTab != BottomNavTab.REELS && !showDirectMessages && !showNotifications) {
                VybeTopBar(
                    onNotificationsClick = { showNotifications = true },
                    onDirectMessagesClick = { showDirectMessages = true }
                )
            }
        },
        bottomBar = {
            if (!showDirectMessages && !showNotifications) {
                VybeBottomNav(
                    selectedTab = selectedTab,
                    onTabSelected = { selectedTab = it }
                )
            }
        },
        containerColor = VybeDarkBg,
        modifier = modifier.fillMaxSize()
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            when {
                showDirectMessages -> {
                    DirectMessagesScreen(onBack = { showDirectMessages = false })
                }
                showNotifications -> {
                    NotificationsScreen(onBack = { showNotifications = false })
                }
                else -> {
                    when (selectedTab) {
                        BottomNavTab.FEED -> {
                            FeedScreen(
                                repository = repository,
                                currentUserId = currentProfile.userId,
                                onCommentClick = { post ->
                                    activeCommentsTarget = Pair(post.postId, "post")
                                },
                                onShareClick = { /* Native share */ }
                            )
                        }
                        BottomNavTab.SEARCH -> {
                            SearchScreen(repository = repository)
                        }
                        BottomNavTab.CREATE -> {
                            CreatePostScreen(
                                repository = repository,
                                currentProfile = currentProfile,
                                onSuccess = { selectedTab = BottomNavTab.FEED }
                            )
                        }
                        BottomNavTab.REELS -> {
                            ReelsScreen(
                                repository = repository,
                                currentUserId = currentProfile.userId,
                                onCommentClick = { reel ->
                                    activeCommentsTarget = Pair(reel.reelId, "reel")
                                },
                                onShareClick = { /* Native share */ }
                            )
                        }
                        BottomNavTab.PROFILE -> {
                            ProfileScreen(
                                userProfile = currentProfile,
                                repository = repository,
                                onSignOut = { authManager.signOut() }
                            )
                        }
                    }
                }
            }

            // Comments Bottom Sheet Modal
            activeCommentsTarget?.let { (targetId, targetType) ->
                CommentsBottomSheet(
                    targetId = targetId,
                    targetType = targetType,
                    repository = repository,
                    currentProfile = currentProfile,
                    onDismiss = { activeCommentsTarget = null }
                )
            }
        }
    }
}
