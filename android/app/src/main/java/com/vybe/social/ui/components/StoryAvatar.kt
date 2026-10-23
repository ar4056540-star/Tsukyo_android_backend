package com.vybe.social.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.vybe.social.ui.theme.VybeCyan
import com.vybe.social.ui.theme.VybePink
import com.vybe.social.ui.theme.VybePurple
import com.vybe.social.ui.theme.VybeTextSecondary

@Composable
fun StoryAvatar(
    photoUrl: String,
    username: String,
    modifier: Modifier = Modifier,
    hasActiveStory: Boolean = true,
    size: Dp = 68.dp,
    onClick: () -> Unit = {}
) {
    val gradientBrush = Brush.linearGradient(
        colors = listOf(VybePink, VybePurple, VybeCyan)
    )

    Column(
        modifier = modifier
            .width(size + 12.dp)
            .clickable { onClick() },
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(
            modifier = Modifier
                .size(size)
                .clip(CircleShape)
                .then(
                    if (hasActiveStory) {
                        Modifier.border(2.5.dp, gradientBrush, CircleShape)
                    } else {
                        Modifier.border(1.dp, Color.Gray.copy(alpha = 0.3f), CircleShape)
                    }
                )
                .padding(3.dp)
                .clip(CircleShape)
                .background(Color.DarkGray),
            contentAlignment = Alignment.Center
        ) {
            AsyncImage(
                model = photoUrl.ifEmpty { "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150" },
                contentDescription = username,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize()
            )
        }

        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = username,
            color = VybeTextSecondary,
            fontSize = 11.sp,
            fontWeight = FontWeight.Medium,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}
