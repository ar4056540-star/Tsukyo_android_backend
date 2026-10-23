package com.vybe.social.ui.screens

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.pager.VerticalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.MusicNote
import androidx.compose.material.icons.outlined.ChatBubbleOutline
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material.icons.outlined.Send
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.vybe.social.data.VybeRepository
import com.vybe.social.model.Reel
import com.vybe.social.ui.components.ExoPlayerView
import com.vybe.social.ui.theme.*
import kotlinx.coroutines.launch

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun ReelsScreen(
    repository: VybeRepository,
    currentUserId: String,
    onCommentClick: (Reel) -> Unit,
    onShareClick: (Reel) -> Unit,
    modifier: Modifier = Modifier
) {
    val reels by repository.getReelsFlow().collectAsState(initial = emptyList())
    var isGlobalMuted by remember { mutableStateOf(false) }
    val coroutineScope = rememberCoroutineScope()

    if (reels.isEmpty()) {
        Box(
            modifier = modifier
                .fillMaxSize()
                .background(VybeDarkBg),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = "No Reels available yet. Be the first to create one!",
                color = VybeTextSecondary,
                fontSize = 14.sp
            )
        }
        return
    }

    val pagerState = rememberPagerState(pageCount = { reels.size })

    VerticalPager(
        state = pagerState,
        modifier = modifier
            .fillMaxSize()
            .background(Color.Black)
    ) { page ->
        val reel = reels[page]
        val isCurrentPage = pagerState.currentPage == page

        var isLiked by remember(reel.reelId) { mutableStateOf(reel.isLikedByCurrentUser) }
        var likesCount by remember(reel.reelId) { mutableStateOf(reel.likesCount) }

        Box(modifier = Modifier.fillMaxSize()) {
            // Native Media3 ExoPlayer Video Engine
            ExoPlayerView(
                mediaUrl = reel.mediaURL,
                modifier = Modifier.fillMaxSize(),
                isPlaying = isCurrentPage,
                isMuted = isGlobalMuted,
                onToggleMute = { isGlobalMuted = !isGlobalMuted }
            )

            // Right Engagement Action Bar (Like, Comment, Share, Sound Disc)
            Column(
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(end = 12.dp, bottom = 80.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Creator Avatar
                AsyncImage(
                    model = reel.ownerPhotoURL.ifEmpty { "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150" },
                    contentDescription = reel.ownerUsername,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier
                        .size(44.dp)
                        .clip(CircleShape)
                        .background(Color.DarkGray)
                )

                // Like Action
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    IconButton(
                        onClick = {
                            isLiked = !isLiked
                            likesCount += if (isLiked) 1 else -1
                            coroutineScope.launch {
                                repository.toggleLike(
                                    collection = "reels",
                                    docId = reel.reelId,
                                    userId = currentUserId,
                                    isCurrentlyLiked = !isLiked
                                )
                            }
                        }
                    ) {
                        Icon(
                            imageVector = if (isLiked) Icons.Default.Favorite else Icons.Outlined.FavoriteBorder,
                            contentDescription = "Like Reel",
                            tint = if (isLiked) VybeHeartRed else Color.White,
                            modifier = Modifier.size(32.dp)
                        )
                    }
                    Text(
                        text = "$likesCount",
                        color = Color.White,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                // Comment Action
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    IconButton(onClick = { onCommentClick(reel) }) {
                        Icon(
                            imageVector = Icons.Outlined.ChatBubbleOutline,
                            contentDescription = "Comment Reel",
                            tint = Color.White,
                            modifier = Modifier.size(30.dp)
                        )
                    }
                    Text(
                        text = "${reel.commentsCount}",
                        color = Color.White,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                // Share Action
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    IconButton(onClick = { onShareClick(reel) }) {
                        Icon(
                            imageVector = Icons.Outlined.Send,
                            contentDescription = "Share Reel",
                            tint = Color.White,
                            modifier = Modifier.size(28.dp)
                        )
                    }
                    Text(
                        text = "${reel.sharesCount}",
                        color = Color.White,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            // Bottom Information Overlay (Owner, Caption, Audio)
            Column(
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .padding(start = 16.dp, end = 80.dp, bottom = 80.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = "@${reel.ownerUsername.ifEmpty { "vyber" }}",
                        color = Color.White,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold
                    )
                    if (reel.isOwnerVerified) {
                        Spacer(modifier = Modifier.width(4.dp))
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = "Verified",
                            tint = VybeVerifiedBlue,
                            modifier = Modifier.size(14.dp)
                        )
                    }
                }

                if (reel.caption.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = reel.caption,
                        color = Color.White,
                        fontSize = 13.sp,
                        maxLines = 2
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.MusicNote,
                        contentDescription = "Music",
                        tint = Color.White,
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = reel.audioTitle,
                        color = Color.White,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        }
    }
}
