package com.vybe.social.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ExitToApp
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.vybe.social.data.VybeRepository
import com.vybe.social.model.Post
import com.vybe.social.model.UserProfile
import com.vybe.social.ui.theme.*

@Composable
fun ProfileScreen(
    userProfile: UserProfile,
    repository: VybeRepository,
    onSignOut: () -> Unit,
    modifier: Modifier = Modifier
) {
    val posts by repository.getPostsFlow().collectAsState(initial = emptyList())
    val userPosts = remember(posts, userProfile.userId) {
        posts.filter { it.userId == userProfile.userId || userProfile.userId.isEmpty() }
    }

    val gradient = Brush.linearGradient(listOf(VybePink, VybePurple, VybeCyan))

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(VybeDarkBg)
            .padding(16.dp)
    ) {
        // User Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Profile Picture
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .clip(CircleShape)
                    .border(2.dp, gradient, CircleShape)
                    .padding(3.dp)
                    .clip(CircleShape)
                    .background(Color.DarkGray)
            ) {
                AsyncImage(
                    model = userProfile.photoURL.ifEmpty { "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150" },
                    contentDescription = userProfile.username,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )
            }

            Spacer(modifier = Modifier.width(24.dp))

            // Stats Row
            Row(
                modifier = Modifier.weight(1f),
                horizontalArrangement = Arrangement.SpaceAround
            ) {
                ProfileStat(label = "Posts", count = userProfile.postsCount.coerceAtLeast(userPosts.size))
                ProfileStat(label = "Followers", count = userProfile.followersCount)
                ProfileStat(label = "Following", count = userProfile.followingCount)
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Username & Bio
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = userProfile.displayName.ifEmpty { userProfile.username.ifEmpty { "VYBE Member" } },
                color = VybeTextPrimary,
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold
            )
            if (userProfile.isVerified) {
                Spacer(modifier = Modifier.width(4.dp))
                Icon(
                    imageVector = Icons.Default.CheckCircle,
                    contentDescription = "Verified",
                    tint = VybeVerifiedBlue,
                    modifier = Modifier.size(16.dp)
                )
            }
        }

        Text(
            text = "@${userProfile.username.ifEmpty { "vyber" }}",
            color = VybeTextSecondary,
            fontSize = 13.sp
        )

        if (userProfile.bio.isNotEmpty()) {
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = userProfile.bio,
                color = VybeTextPrimary,
                fontSize = 13.sp
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Action Buttons Row (Edit Profile / Sign Out)
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            OutlinedButton(
                onClick = { /* Edit Profile */ },
                colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White),
                border = ButtonDefaults.outlinedButtonBorder.copy(brush = Brush.horizontalGradient(listOf(VybeDarkBorder, VybeDarkBorder))),
                shape = RoundedCornerShape(10.dp),
                modifier = Modifier.weight(1f)
            ) {
                Text("Edit Profile", fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
            }

            IconButton(
                onClick = onSignOut,
                modifier = Modifier
                    .clip(RoundedCornerShape(10.dp))
                    .background(VybeDarkSurface)
            ) {
                Icon(
                    imageVector = Icons.Default.ExitToApp,
                    contentDescription = "Sign Out",
                    tint = VybePink
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))
        HorizontalDivider(color = VybeDarkBorder)
        Spacer(modifier = Modifier.height(8.dp))

        // Posts Grid
        LazyVerticalGrid(
            columns = GridCells.Fixed(3),
            horizontalArrangement = Arrangement.spacedBy(2.dp),
            verticalArrangement = Arrangement.spacedBy(2.dp),
            modifier = Modifier.fillMaxSize()
        ) {
            items(userPosts, key = { it.postId }) { post ->
                AsyncImage(
                    model = post.mediaURL.ifEmpty { "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400" },
                    contentDescription = post.caption,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier
                        .aspectRatio(1f)
                        .background(VybeDarkSurface)
                )
            }
        }
    }
}

@Composable
private fun ProfileStat(label: String, count: Int) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            text = "$count",
            color = VybeTextPrimary,
            fontSize = 16.sp,
            fontWeight = FontWeight.Bold
        )
        Text(
            text = label,
            color = VybeTextSecondary,
            fontSize = 12.sp
        )
    }
}
