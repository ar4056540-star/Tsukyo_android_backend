package com.vybe.social.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.MoreVert
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
import com.vybe.social.model.Post
import com.vybe.social.ui.theme.*
import kotlinx.coroutines.delay

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun PostCard(
    post: Post,
    currentUserId: String,
    onLikeToggle: (Post) -> Unit,
    onCommentClick: (Post) -> Unit,
    onShareClick: (Post) -> Unit,
    modifier: Modifier = Modifier
) {
    var isLiked by remember { mutableStateOf(post.isLikedByCurrentUser) }
    var likesCount by remember { mutableStateOf(post.likesCount) }
    var showBigHeart by remember { mutableStateOf(false) }

    LaunchedEffect(showBigHeart) {
        if (showBigHeart) {
            delay(800)
            showBigHeart = false
        }
    }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(VybeDarkBg)
            .padding(bottom = 16.dp)
    ) {
        // Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            AsyncImage(
                model = post.userPhotoURL.ifEmpty { "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150" },
                contentDescription = post.username,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .size(38.dp)
                    .clip(CircleShape)
                    .background(Color.DarkGray)
            )

            Spacer(modifier = Modifier.width(10.dp))

            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = post.username.ifEmpty { "vyber" },
                        color = VybeTextPrimary,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold
                    )
                    if (post.isVerified) {
                        Spacer(modifier = Modifier.width(4.dp))
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = "Verified",
                            tint = VybeVerifiedBlue,
                            modifier = Modifier.size(14.dp)
                        )
                    }
                }
                if (post.userDisplayName.isNotEmpty()) {
                    Text(
                        text = post.userDisplayName,
                        color = VybeTextSecondary,
                        fontSize = 12.sp
                    )
                }
            }

            IconButton(onClick = { /* Actions */ }) {
                Icon(
                    imageVector = Icons.Default.MoreVert,
                    contentDescription = "Post Options",
                    tint = VybeTextSecondary
                )
            }
        }

        // Media Container with Double-tap to Like
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(1f)
                .background(VybeDarkSurface)
                .combinedClickable(
                    onClick = {},
                    onDoubleClick = {
                        if (!isLiked) {
                            isLiked = true
                            likesCount += 1
                            onLikeToggle(post)
                        }
                        showBigHeart = true
                    }
                ),
            contentAlignment = Alignment.Center
        ) {
            if (post.mediaType == "video") {
                ExoPlayerView(
                    mediaUrl = post.mediaURL,
                    modifier = Modifier.fillMaxSize(),
                    isMuted = true
                )
            } else {
                AsyncImage(
                    model = post.mediaURL.ifEmpty { "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800" },
                    contentDescription = post.caption,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )
            }

            // Big Animated Heart on Double Tap
            AnimatedVisibility(
                visible = showBigHeart,
                enter = scaleIn(animationSpec = tween(200)),
                exit = scaleOut(animationSpec = tween(300))
            ) {
                Icon(
                    imageVector = Icons.Default.Favorite,
                    contentDescription = null,
                    tint = VybeHeartRed,
                    modifier = Modifier.size(100.dp)
                )
            }
        }

        // Action Buttons Row
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(
                onClick = {
                    isLiked = !isLiked
                    likesCount += if (isLiked) 1 else -1
                    onLikeToggle(post)
                }
            ) {
                Icon(
                    imageVector = if (isLiked) Icons.Default.Favorite else Icons.Outlined.FavoriteBorder,
                    contentDescription = "Like",
                    tint = if (isLiked) VybeHeartRed else VybeTextPrimary,
                    modifier = Modifier.size(26.dp)
                )
            }

            IconButton(onClick = { onCommentClick(post) }) {
                Icon(
                    imageVector = Icons.Outlined.ChatBubbleOutline,
                    contentDescription = "Comment",
                    tint = VybeTextPrimary,
                    modifier = Modifier.size(24.dp)
                )
            }

            IconButton(onClick = { onShareClick(post) }) {
                Icon(
                    imageVector = Icons.Outlined.Send,
                    contentDescription = "Share",
                    tint = VybeTextPrimary,
                    modifier = Modifier.size(24.dp)
                )
            }
        }

        // Likes & Caption
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
        ) {
            if (likesCount > 0) {
                Text(
                    text = "$likesCount likes",
                    color = VybeTextPrimary,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(4.dp))
            }

            if (post.caption.isNotEmpty()) {
                Row {
                    Text(
                        text = post.username.ifEmpty { "vyber" },
                        color = VybeTextPrimary,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = post.caption,
                        color = VybeTextPrimary,
                        fontSize = 13.sp
                    )
                }
            }

            if (post.commentsCount > 0) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "View all ${post.commentsCount} comments",
                    color = VybeTextSecondary,
                    fontSize = 12.sp,
                    modifier = Modifier.combinedClickable(
                        onClick = { onCommentClick(post) }
                    )
                )
            }
        }
    }
}
