package com.vybe.social.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.vybe.social.data.VybeRepository
import com.vybe.social.model.Post
import com.vybe.social.model.Story
import com.vybe.social.ui.components.PostCard
import com.vybe.social.ui.components.StoryAvatar
import com.vybe.social.ui.theme.VybeDarkBg
import kotlinx.coroutines.launch

@Composable
fun FeedScreen(
    repository: VybeRepository,
    currentUserId: String,
    onCommentClick: (Post) -> Unit,
    onShareClick: (Post) -> Unit,
    modifier: Modifier = Modifier
) {
    val posts by repository.getPostsFlow().collectAsState(initial = emptyList())
    val stories by repository.getStoriesFlow().collectAsState(initial = emptyList())
    val coroutineScope = rememberCoroutineScope()

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(VybeDarkBg)
    ) {
        // Stories Horizontal Tray
        item {
            LazyRow(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 12.dp),
                contentPadding = PaddingValues(horizontal = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // "Your Story" item
                item {
                    StoryAvatar(
                        photoUrl = "",
                        username = "Your Story",
                        hasActiveStory = false,
                        onClick = { /* Launch Story Creation */ }
                    )
                }

                items(stories) { story ->
                    StoryAvatar(
                        photoUrl = story.userPhotoURL,
                        username = story.username,
                        hasActiveStory = true,
                        onClick = { /* View Story */ }
                    )
                }
            }
            HorizontalDivider(color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.2f))
        }

        // Posts List
        items(posts, key = { it.postId }) { post ->
            PostCard(
                post = post,
                currentUserId = currentUserId,
                onLikeToggle = { p ->
                    coroutineScope.launch {
                        repository.toggleLike(
                            collection = "posts",
                            docId = p.postId,
                            userId = currentUserId,
                            isCurrentlyLiked = p.isLikedByCurrentUser
                        )
                    }
                },
                onCommentClick = onCommentClick,
                onShareClick = onShareClick
            )
        }
    }
}
